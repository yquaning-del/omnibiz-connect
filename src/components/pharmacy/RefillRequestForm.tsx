import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface RefillRequestFormProps {
  onSuccess?: () => void;
}

export function RefillRequestForm({ onSuccess }: RefillRequestFormProps) {
  const { currentOrganization, currentLocation } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    medicationName: '',
    medicationStrength: '',
    quantityRequested: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !currentLocation) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('refill_requests')
        .insert({
          organization_id: currentOrganization.id,
          location_id: currentLocation.id,
          patient_name: formData.patientName,
          patient_phone: formData.patientPhone || null,
          patient_email: formData.patientEmail || null,
          medication_name: formData.medicationName,
          medication_strength: formData.medicationStrength || null,
          quantity_requested: formData.quantityRequested ? parseInt(formData.quantityRequested) : null,
          notes: formData.notes || null,
          status: 'pending',
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Refill request submitted successfully");
      
      // Reset after delay
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setFormData({
          patientName: '',
          patientPhone: '',
          patientEmail: '',
          medicationName: '',
          medicationStrength: '',
          quantityRequested: '',
          notes: '',
        });
        onSuccess?.();
      }, 2000);
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Request Refill
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-pharmacy" />
            Request Prescription Refill
          </DialogTitle>
          <DialogDescription>
            Submit a refill request and we'll notify you when it's ready
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            <p className="text-lg font-semibold">Request Submitted</p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              We'll review your request and contact you when your prescription is ready for pickup.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Your Name *</Label>
                <Input
                  id="patientName"
                  placeholder="John Doe"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patientPhone">Phone Number</Label>
                <Input
                  id="patientPhone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.patientPhone}
                  onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="patientEmail">Email Address</Label>
              <Input
                id="patientEmail"
                type="email"
                placeholder="john@example.com"
                value={formData.patientEmail}
                onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Medication Details</p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="medicationName">Medication Name *</Label>
                  <Input
                    id="medicationName"
                    placeholder="e.g., Lisinopril"
                    value={formData.medicationName}
                    onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medicationStrength">Strength</Label>
                    <Input
                      id="medicationStrength"
                      placeholder="e.g., 10mg"
                      value={formData.medicationStrength}
                      onChange={(e) => setFormData({ ...formData, medicationStrength: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantityRequested">Quantity</Label>
                    <Input
                      id="quantityRequested"
                      type="number"
                      placeholder="30"
                      value={formData.quantityRequested}
                      onChange={(e) => setFormData({ ...formData, quantityRequested: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special instructions or information..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Pharmacy staff view for managing refill requests
export function RefillRequestsManager() {
  const { currentOrganization, currentLocation } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!currentLocation) return;
    
    const { data, error } = await supabase
      .from('refill_requests')
      .select('*')
      .eq('location_id', currentLocation.id)
      .in('status', ['pending', 'approved', 'processing', 'ready'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('refill_requests')
      .update({ 
        status: newStatus,
        reviewed_at: ['approved', 'denied'].includes(newStatus) ? new Date().toISOString() : undefined,
        ready_at: newStatus === 'ready' ? new Date().toISOString() : undefined,
        picked_up_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
      })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast.success(`Request ${newStatus}`);
      fetchRequests();
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCcw className="h-5 w-5" />
          Refill Requests
        </CardTitle>
        <CardDescription>Manage incoming prescription refill requests</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending refill requests
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{req.patient_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {req.medication_name} {req.medication_strength && `(${req.medication_strength})`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(req.id, 'denied')}>
                        Deny
                      </Button>
                      <Button size="sm" onClick={() => updateStatus(req.id, 'approved')}>
                        Approve
                      </Button>
                    </>
                  )}
                  {req.status === 'approved' && (
                    <Button size="sm" onClick={() => updateStatus(req.id, 'ready')}>
                      Mark Ready
                    </Button>
                  )}
                  {req.status === 'ready' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(req.id, 'completed')}>
                      Picked Up
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}