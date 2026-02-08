import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2, CheckCircle, XCircle, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationData {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  lease_id: string;
  tenant_id: string;
  organization_id: string;
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lease_invitations')
        .select('*')
        .eq('token', token!)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError('Invalid invitation link. Please contact your property manager.');
        return;
      }

      if (data.status === 'accepted') {
        setError('This invitation has already been used. Please sign in to your account.');
        return;
      }

      if (data.status === 'expired' || new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired. Please contact your property manager for a new invitation.');
        return;
      }

      setInvitation({
        id: data.id,
        email: data.email ?? '',
        status: data.status ?? 'pending',
        expires_at: data.expires_at ?? new Date().toISOString(),
        lease_id: data.lease_id ?? '',
        tenant_id: data.tenant_id ?? '',
        organization_id: data.organization_id ?? '',
      });
    } catch (err) {
      console.error('Error validating token:', err);
      setError('Failed to validate invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) return;

    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/tenant/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // 2. Create tenant role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          organization_id: invitation.organization_id,
          role: 'tenant',
        });

      if (roleError) {
        console.error('Error creating role:', roleError);
        // Continue anyway - role might already exist
      }

      // 3. Link tenant record to user
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({ user_id: authData.user.id, status: 'active' })
        .eq('id', invitation.tenant_id);

      if (tenantError) {
        console.error('Error linking tenant:', tenantError);
      }

      // 4. Mark invitation as accepted
      const { error: inviteError } = await supabase
        .from('lease_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (inviteError) {
        console.error('Error updating invitation:', inviteError);
      }

      toast.success('Account created successfully! Redirecting to your dashboard...');
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate('/tenant/dashboard', { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error('Error creating account:', err);
      if (err.message?.includes('already registered')) {
        toast.error('An account with this email already exists. Please sign in instead.');
        setTimeout(() => navigate('/tenant/auth'), 2000);
      } else {
        toast.error(err.message || 'Failed to create account');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-property/5 to-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-property mx-auto mb-4" />
          <p className="text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-property/5 to-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invitation Error</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => navigate('/tenant/auth')}>
                Go to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-property/5 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-property/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-property" />
          </div>
          <CardTitle className="text-2xl">Welcome to the Tenant Portal</CardTitle>
          <CardDescription>
            Create your account to view and sign your lease
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This email is linked to your lease invitation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Legal Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Create Account & View Lease
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate('/tenant/auth')}
              >
                Sign in instead
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
