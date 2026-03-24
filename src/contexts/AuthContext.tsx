import React, { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, Organization, Location } from '@/types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  organizations: Organization[];
  locations: Location[];
  currentOrganization: Organization | null;
  currentLocation: Location | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setCurrentOrganization: (org: Organization | null) => void;
  setCurrentLocation: (loc: Location | null) => void;
  hasRole: (role: string) => boolean;
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
  isTenant: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  // Guard to prevent duplicate fetchUserData calls from onAuthStateChange + getSession racing
  const initializingRef = useRef<string | null>(null);

  // Log user session for analytics (fire and forget)
  const logUserSession = async (userId: string) => {
    try {
      await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          logged_in_at: new Date().toISOString(),
        });
    } catch (error) {
      console.debug('Session logging failed:', error);
    }
  };

  const fetchUserData = async (userId: string, isNewSession: boolean = false) => {
    try {
      // Log session for DAU/WAU/MAU tracking (fire and forget)
      if (isNewSession) {
        logUserSession(userId);
      }

      // Fetch all data in parallel for better performance
      const [profileResult, rolesResult, orgsResult, locsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('*').eq('user_id', userId),
        supabase.from('organizations').select('*'),
        supabase.from('locations').select('*'),
      ]);

      // Process profile
      if (profileResult.data) {
        setProfile(profileResult.data as Profile);
      }

      // Process roles
      if (rolesResult.data) {
        setRoles(rolesResult.data as UserRole[]);
      }

      // Process organizations
      const orgsData = orgsResult.data;
      if (orgsData && orgsData.length > 0) {
        setOrganizations(orgsData as Organization[]);
      }

      // Process locations and restore context
      const locsData = locsResult.data;
      if (locsData && locsData.length > 0) {
        const typedLocations = locsData as Location[];
        setLocations(typedLocations);
        
        // Try to restore from localStorage first, with validation
        const savedLocationId = localStorage.getItem('currentLocationId');
        const savedOrgId = localStorage.getItem('currentOrganizationId');
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (
          savedLocationId && savedOrgId && orgsData &&
          uuidRegex.test(savedLocationId) && uuidRegex.test(savedOrgId)
        ) {
          // Validate that the IDs exist in the user's actual data
          const savedLocation = typedLocations.find(l => l.id === savedLocationId);
          const typedOrgs = orgsData as Organization[];
          const savedOrg = typedOrgs.find(o => o.id === savedOrgId);
          
          if (savedLocation && savedOrg) {
            setCurrentLocation(savedLocation);
            setCurrentOrganization(savedOrg);
            return;
          } else {
            // Clear invalid localStorage entries
            localStorage.removeItem('currentLocationId');
            localStorage.removeItem('currentOrganizationId');
          }
        } else if (savedLocationId || savedOrgId) {
          // Clear malformed localStorage entries
          localStorage.removeItem('currentLocationId');
          localStorage.removeItem('currentOrganizationId');
        }
        
        // Set first location/org as current if none saved - use functional updates to avoid stale closures
        setCurrentLocation(prev => prev ?? typedLocations[0]);
        if (orgsData && orgsData.length > 0) {
          setCurrentOrganization(prev => prev ?? (orgsData[0] as Organization));
        }
      } else if (orgsData && orgsData.length > 0) {
        // Set first org as current if no locations
        setCurrentOrganization(prev => prev ?? (orgsData[0] as Organization));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data. Please try refreshing the page.');
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Skip if we've already started initializing for this user
          if (initializingRef.current === session.user.id) return;
          initializingRef.current = session.user.id;

          // Log session on SIGNED_IN event only (new login)
          const isNewSession = event === 'SIGNED_IN';
          
          // Defer data fetching to avoid deadlock
          setTimeout(() => {
            fetchUserData(session.user.id, isNewSession);
          }, 0);
        } else {
          initializingRef.current = null;
          // Clear all state on logout
          setProfile(null);
          setRoles([]);
          setOrganizations([]);
          setLocations([]);
          setCurrentOrganization(null);
          setCurrentLocation(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session (not a new login, so don't log)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Skip if onAuthStateChange already started this
        if (initializingRef.current === session.user.id) return;
        initializingRef.current = session.user.id;
        fetchUserData(session.user.id, false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Clear local state first to ensure UI updates immediately
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setOrganizations([]);
    setLocations([]);
    setCurrentOrganization(null);
    setCurrentLocation(null);
    
    // Clear localStorage
    localStorage.removeItem('currentLocationId');
    localStorage.removeItem('currentOrganizationId');
    
    // Try to sign out from Supabase (ignore errors for expired sessions)
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      // Session may already be expired - that's OK, we've cleared local state
      console.debug('Sign out completed (session may have been expired)');
    }
  };

  const hasRole = useCallback((role: string) => {
    return roles.some(r => r.role === role);
  }, [roles]);

  const isOrgAdmin = useMemo(() => hasRole('org_admin') || hasRole('super_admin'), [hasRole]);
  const isSuperAdmin = useMemo(() => hasRole('super_admin'), [hasRole]);
  const isTenant = useMemo(() => hasRole('tenant'), [hasRole]);

  const refreshUserData = useCallback(async () => {
    if (user) {
      await fetchUserData(user.id, false);
    }
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    session,
    profile,
    roles,
    organizations,
    locations,
    currentOrganization,
    currentLocation,
    loading,
    signIn,
    signUp,
    signOut,
    setCurrentOrganization,
    setCurrentLocation,
    hasRole,
    isOrgAdmin,
    isSuperAdmin,
    isTenant,
    refreshUserData,
  }), [user, session, profile, roles, organizations, locations, currentOrganization, currentLocation, loading, hasRole, isOrgAdmin, isSuperAdmin, isTenant, refreshUserData]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}