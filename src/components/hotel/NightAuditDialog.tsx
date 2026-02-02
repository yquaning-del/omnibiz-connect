import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Moon,
  Loader2,
  BedDouble,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface AuditStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  outOfOrderRooms: number;
  occupancyRate: number;
  roomRevenue: number;
  incidentalRevenue: number;
  totalRevenue: number;
  arrivalsCount: number;
  departuresCount: number;
  inHouseGuests: number;
  noShowsCount: number;
  discrepancies: Array<{ type: string; message: string }>;
}

export function NightAuditDialog() {
  const { currentOrganization, currentLocation, user } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [step, setStep] = useState<'start' | 'running' | 'review' | 'complete'>('start');
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [notes, setNotes] = useState('');

  const runNightAudit = async () => {
    if (!currentOrganization || !currentLocation || !user) return;
    
    setAuditing(true);
    setStep('running');
    setProgress(0);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Step 1: Fetch room data (20%)
      setProgress(20);
      const { data: rooms } = await supabase
        .from('hotel_rooms')
        .select('id, status, housekeeping_status, price_per_night')
        .eq('location_id', currentLocation.id);

      // Step 2: Fetch today's reservations (40%)
      setProgress(40);
      const { data: reservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('location_id', currentLocation.id)
        .eq('reservation_type', 'room')
        .gte('check_in', today + 'T00:00:00')
        .lte('check_in', today + 'T23:59:59');

      // Step 3: Fetch today's folios (60%)
      setProgress(60);
      const { data: folios } = await supabase
        .from('guest_folios')
        .select('room_charges, incidental_charges, total_amount, balance_due')
        .eq('location_id', currentLocation.id)
        .eq('status', 'open');

      // Step 4: Calculate statistics (80%)
      setProgress(80);
      
      const totalRooms = rooms?.length || 0;
      const occupiedRooms = rooms?.filter(r => r.status === 'occupied').length || 0;
      const availableRooms = rooms?.filter(r => r.status === 'available').length || 0;
      const outOfOrderRooms = rooms?.filter(r => r.status === 'maintenance').length || 0;
      
      const roomRevenue = folios?.reduce((sum, f) => sum + Number(f.room_charges || 0), 0) || 0;
      const incidentalRevenue = folios?.reduce((sum, f) => sum + Number(f.incidental_charges || 0), 0) || 0;
      
      const arrivalsCount = reservations?.filter(r => r.status === 'confirmed').length || 0;
      const checkedInCount = reservations?.filter(r => r.status === 'checked-in').length || 0;
      const noShows = reservations?.filter(r => 
        r.status === 'confirmed' && new Date(r.check_in) < new Date()
      ).length || 0;
      
      // Check for discrepancies
      const discrepancies: Array<{ type: string; message: string }> = [];
      
      // Check for folios with balance due
      const unpaidFolios = folios?.filter(f => Number(f.balance_due) > 0).length || 0;
      if (unpaidFolios > 0) {
        discrepancies.push({
          type: 'warning',
          message: `${unpaidFolios} folio(s) have outstanding balance`
        });
      }
      
      // Check for dirty rooms that are marked as available
      const dirtyAvailable = rooms?.filter(r => 
        r.status === 'available' && r.housekeeping_status === 'dirty'
      ).length || 0;
      if (dirtyAvailable > 0) {
        discrepancies.push({
          type: 'warning',
          message: `${dirtyAvailable} room(s) marked available but need housekeeping`
        });
      }

      const auditStats: AuditStats = {
        totalRooms,
        occupiedRooms,
        availableRooms,
        outOfOrderRooms,
        occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
        roomRevenue,
        incidentalRevenue,
        totalRevenue: roomRevenue + incidentalRevenue,
        arrivalsCount,
        departuresCount: 0, // Would need yesterday's checkouts
        inHouseGuests: checkedInCount,
        noShowsCount: noShows,
        discrepancies
      };
      
      setStats(auditStats);
      setProgress(100);
      setStep('review');
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setStep('start');
    } finally {
      setAuditing(false);
    }
  };

  const completeAudit = async () => {
    if (!currentOrganization || !currentLocation || !user || !stats) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('night_audit_records')
        .insert({
          organization_id: currentOrganization.id,
          location_id: currentLocation.id,
          audit_date: today,
          total_rooms: stats.totalRooms,
          occupied_rooms: stats.occupiedRooms,
          available_rooms: stats.availableRooms,
          out_of_order_rooms: stats.outOfOrderRooms,
          occupancy_rate: stats.occupancyRate,
          room_revenue: stats.roomRevenue,
          incidental_revenue: stats.incidentalRevenue,
          total_revenue: stats.totalRevenue,
          arrivals_count: stats.arrivalsCount,
          departures_count: stats.departuresCount,
          in_house_guests: stats.inHouseGuests,
          no_shows_count: stats.noShowsCount,
          discrepancies: stats.discrepancies,
          notes: notes || null,
          performed_by: user.id,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: 'completed'
        });

      if (error) throw error;

      toast({ title: 'Night audit completed successfully' });
      setStep('complete');
      
      // Reset after brief delay
      setTimeout(() => {
        setOpen(false);
        setStep('start');
        setStats(null);
        setNotes('');
      }, 2000);
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error saving audit', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Moon className="h-4 w-4" />
          Night Audit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-hotel" />
            Night Audit
          </DialogTitle>
          <DialogDescription>
            End-of-day reconciliation for {currentLocation?.name}
          </DialogDescription>
        </DialogHeader>

        {step === 'start' && (
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              The night audit will analyze today's operations including:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-muted-foreground" />
                Room occupancy and status verification
              </li>
              <li className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Revenue reconciliation
              </li>
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Guest movement analysis
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                Discrepancy detection
              </li>
            </ul>
          </div>
        )}

        {step === 'running' && (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-hotel" />
            </div>
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                Running audit... {progress}%
              </p>
            </div>
          </div>
        )}

        {step === 'review' && stats && (
          <div className="space-y-4 py-4">
            {/* Room Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Occupancy</p>
                  <p className="text-2xl font-bold">{stats.occupancyRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.occupiedRooms} of {stats.totalRooms} rooms
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    Rooms: ${stats.roomRevenue.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Guest Movement */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-lg font-bold text-green-500">{stats.arrivalsCount}</p>
                <p className="text-xs text-muted-foreground">Arrivals</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-lg font-bold">{stats.inHouseGuests}</p>
                <p className="text-xs text-muted-foreground">In-House</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-lg font-bold text-orange-500">{stats.noShowsCount}</p>
                <p className="text-xs text-muted-foreground">No Shows</p>
              </div>
            </div>

            {/* Discrepancies */}
            {stats.discrepancies.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Discrepancies Found
                </p>
                {stats.discrepancies.map((d, i) => (
                  <Badge key={i} variant="outline" className="text-warning border-warning/30 mr-2">
                    {d.message}
                  </Badge>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Audit Notes (optional)</Label>
              <Textarea
                placeholder="Add any notes about tonight's audit..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            <p className="text-lg font-semibold">Audit Complete</p>
            <p className="text-sm text-muted-foreground">Records have been saved</p>
          </div>
        )}

        <DialogFooter>
          {step === 'start' && (
            <Button onClick={runNightAudit} className="gap-2" disabled={auditing}>
              <Moon className="h-4 w-4" />
              Start Night Audit
            </Button>
          )}
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => setStep('start')}>
                Cancel
              </Button>
              <Button onClick={completeAudit} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Complete Audit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}