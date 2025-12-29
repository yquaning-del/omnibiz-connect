import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, Organization, Location } from '@/types';

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

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);
      
      if (rolesData) {
        setRoles(rolesData as UserRole[]);
      }

      // Fetch organizations
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('*');
      
      if (orgsData && orgsData.length > 0) {
        setOrganizations(orgsData as Organization[]);
        // Set first org as current if none selected
        if (!currentOrganization) {
          setCurrentOrganization(orgsData[0] as Organization);
        }
      }

      // Fetch locations
      const { data: locsData } = await supabase
        .from('locations')
        .select('*');
      
      if (locsData && locsData.length > 0) {
        setLocations(locsData as Location[]);
        // Set first location as current if none selected
        if (!currentLocation) {
          setCurrentLocation(locsData[0] as Location);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer data fetching to avoid deadlock
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
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

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
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
    await supabase.auth.signOut();
  };

  const hasRole = (role: string) => {
    return roles.some(r => r.role === role);
  };

  const isOrgAdmin = hasRole('org_admin') || hasRole('super_admin');
  const isSuperAdmin = hasRole('super_admin');

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
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
