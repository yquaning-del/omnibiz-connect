import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Loader2, User, Lock, UserCheck, Delete } from 'lucide-react';

interface EmployeePinLoginProps {
  onLoginSuccess: (userId: string, userEmail: string) => void;
  currentUserId?: string;
}

export function EmployeePinLogin({ onLoginSuccess, currentUserId }: EmployeePinLoginProps) {
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'pin'>('email');
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && step === 'pin') {
      setPin('');
    }
  }, [open, step]);

  const handleEmailSubmit = () => {
    if (!email.trim()) {
      toast({ variant: 'destructive', title: 'Please enter your email' });
      return;
    }
    setStep('pin');
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const verifyPin = async (pinToVerify: string) => {
    setLoading(true);
    try {
      // Call the security definer function to verify PIN
      const { data, error } = await supabase
        .rpc('verify_pos_pin', { 
          user_email: email.toLowerCase().trim(), 
          pin: pinToVerify 
        });

      if (error) throw error;

      if (data) {
        toast({ title: 'Logged in successfully' });
        onLoginSuccess(data, email);
        setOpen(false);
        resetForm();
      } else {
        toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please try again' });
        setPin('');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPin('');
    setStep('email');
  };

  const pinDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          Switch User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Employee Login
          </DialogTitle>
          <DialogDescription>
            Enter your email and PIN to quickly switch users
          </DialogDescription>
        </DialogHeader>

        {step === 'email' ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                ref={inputRef}
                type="email"
                placeholder="Enter your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                autoFocus
              />
            </div>
            <Button className="w-full gap-2" onClick={handleEmailSubmit}>
              <UserCheck className="h-4 w-4" />
              Continue
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Email display */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Logging in as:</p>
              <p className="font-medium">{email}</p>
              <button 
                className="text-xs text-primary hover:underline mt-1"
                onClick={() => setStep('email')}
              >
                Change
              </button>
            </div>

            {/* PIN dots */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'w-4 h-4 rounded-full border-2 transition-all',
                    pin.length > i
                      ? 'bg-primary border-primary'
                      : 'bg-transparent border-muted-foreground/50'
                  )}
                />
              ))}
            </div>

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-2">
              {pinDigits.map((digit, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="lg"
                  className={cn(
                    'h-14 text-xl font-medium',
                    digit === '' && 'invisible',
                    digit === 'del' && 'text-base'
                  )}
                  onClick={() => {
                    if (digit === 'del') handleBackspace();
                    else if (digit !== '') handlePinDigit(digit);
                  }}
                  disabled={loading || digit === ''}
                >
                  {digit === 'del' ? <Delete className="h-5 w-5" /> : digit}
                </Button>
              ))}
            </div>

            {loading && (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Component for setting up PIN in user settings
export function SetupPinForm() {
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const handleSavePin = async () => {
    if (pin.length !== 4) {
      toast({ variant: 'destructive', title: 'PIN must be 4 digits' });
      return;
    }
    if (pin !== confirmPin) {
      toast({ variant: 'destructive', title: 'PINs do not match' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          pos_pin: pin,
          pos_pin_enabled: true 
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({ title: 'PIN saved successfully' });
      setEnabled(true);
      setPin('');
      setConfirmPin('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDisablePin = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          pos_pin: null,
          pos_pin_enabled: false 
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({ title: 'PIN login disabled' });
      setEnabled(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          POS Quick Login
        </CardTitle>
        <CardDescription>
          Set up a 4-digit PIN for fast employee switching at the point of sale
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">New PIN</label>
            <Input
              type="password"
              maxLength={4}
              placeholder="****"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm PIN</label>
            <Input
              type="password"
              maxLength={4}
              placeholder="****"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSavePin} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save PIN
          </Button>
          {enabled && (
            <Button variant="outline" onClick={handleDisablePin} disabled={loading}>
              Disable PIN Login
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}