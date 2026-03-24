import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { AppRole } from '@/types';
import { toast } from 'sonner';

interface InvitationData {
  id: string;
  email: string;
  role: AppRole;
  status: string;
  expires_at: string;
  organization_id: string;
  location_id: string | null;
}

export default function AcceptStaffInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      // Use service role through edge function to bypass RLS for token lookup
      const { data, error } = await supabase.functions.invoke('send-staff-invitation', {
        body: { action: 'validate', token },
      });

      if (error || !data?.invitation) {
        setError('Invalid or expired invitation link');
        setLoading(false);
        return;
      }

      const inv = data.invitation;

      if (inv.status === 'accepted') {
        setError('This invitation has already been accepted');
        setLoading(false);
        return;
      }

      if (inv.status === 'cancelled') {
        setError('This invitation has been cancelled');
        setLoading(false);
        return;
      }

      if (new Date(inv.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      setInvitation(inv);
      setOrgName(data.organizationName || 'the organization');
      setLoading(false);
    } catch (err) {
      console.error('Token validation error:', err);
      setError('Failed to validate invitation');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation || !token) return;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // Complete the invitation through edge function
      const { error: completeError } = await supabase.functions.invoke('send-staff-invitation', {
        body: {
          action: 'complete',
          token,
          userId: authData.user.id,
        },
      });

      if (completeError) throw completeError;

      toast.success("Account created successfully!", { description: "You can now access the platform." });

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      toast.error("Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Invitation Error</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button asChild className="w-full">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    org_admin: 'Organization Admin',
    location_manager: 'Location Manager',
    department_lead: 'Department Lead',
    staff: 'Staff Member',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Join {orgName}</CardTitle>
          <CardDescription>
            You've been invited to join as a <strong>{roleLabels[invitation.role] || invitation.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={invitation.email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept & Create Account
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/auth" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
