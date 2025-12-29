import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, organizations } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth');
    } else if (organizations.length === 0) {
      navigate('/onboarding');
    } else {
      navigate('/dashboard');
    }
  }, [user, loading, organizations, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
