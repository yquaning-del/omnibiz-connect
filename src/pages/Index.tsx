import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import Landing from './Landing';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, organizations } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      if (organizations.length === 0) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    }
    // If no user, stay on landing page (don't navigate)
  }, [user, loading, organizations, navigate]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!user) {
    return <Landing />;
  }

  // Show loading while redirecting authenticated users
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
