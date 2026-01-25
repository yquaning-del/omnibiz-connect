import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, UserCog, Calendar, Trash2, MoreVertical, Shield, KeyRound } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { useLimitChecker, formatLimitDisplay } from '@/hooks/useLimitChecker';
import { InviteStaffDialog } from '@/components/staff/InviteStaffDialog';
import { PendingInvitations } from '@/components/staff/PendingInvitations';
import { RolePermissionsCard } from '@/components/staff/RolePermissionsCard';
import { StaffPermissionsEditor } from '@/components/staff/StaffPermissionsEditor';
import { ROLE_PERMISSIONS } from '@/lib/rolePermissions';
import { AppRole, BusinessVertical } from '@/types';

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  organization_id: string;
  location_id: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface Schedule {
  id: string;
  user_id: string;
  location_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

const roleColors: Record<string, string> = {
  super_admin: 'bg-destructive/20 text-destructive border-destructive/30',
  org_admin: 'bg-primary/20 text-primary border-primary/30',
  location_manager: 'bg-accent/20 text-accent border-accent/30',
  department_lead: 'bg-warning/20 text-warning border-warning/30',
  staff: 'bg-muted text-muted-foreground border-muted',
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Org Admin',
  location_manager: 'Location Manager',
  department_lead: 'Department Lead',
  staff: 'Staff',
};

export default function Staff() {
  const { currentOrganization, currentLocation, isOrgAdmin } = useAuth();
  const { toast } = useToast();
  const limits = useLimitChecker();
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [inviteRefresh, setInviteRefresh] = useState(0);
  const [permissionsEditorOpen, setPermissionsEditorOpen] = useState(false);
  const [editingPermissionsFor, setEditingPermissionsFor] = useState<StaffMember | null>(null);

  // Get vertical for permissions
  const vertical = (currentLocation?.vertical || currentOrganization?.primary_vertical || 'retail') as BusinessVertical;

  // Schedule form
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStart, setScheduleStart] = useState('09:00');
  const [scheduleEnd, setScheduleEnd] = useState('17:00');
  const [scheduleNotes, setScheduleNotes] = useState('');

  useEffect(() => {
    if (!currentOrganization) return;
    fetchStaff();
    fetchSchedules();
  }, [currentOrganization, currentLocation]);

  const fetchStaff = async () => {
    if (!currentOrganization) return;

    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        profile:profiles(full_name, email, avatar_url)
      `)
      .eq('organization_id', currentOrganization.id);

    if (error) {
      console.error('Error fetching staff:', error);
    } else {
      setStaff(data as unknown as StaffMember[]);
    }
    setLoading(false);
  };

  const fetchSchedules = async () => {
    if (!currentLocation) return;

    const { data } = await supabase
      .from('staff_schedules')
      .select('*')
      .eq('location_id', currentLocation.id)
      .gte('shift_date', format(new Date(), 'yyyy-MM-dd'))
      .order('shift_date', { ascending: true })
      .limit(50);

    if (data) {
      setSchedules(data as Schedule[]);
    }
  };

  const updateRole = async (staffId: string, newRole: 'super_admin' | 'org_admin' | 'location_manager' | 'department_lead' | 'staff') => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('id', staffId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Role updated successfully' });
      fetchStaff();
    }
  };

  const removeStaff = async (staffId: string) => {
    if (!confirm('Remove this staff member?')) return;

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', staffId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Staff member removed' });
      fetchStaff();
    }
  };

  const openPermissionsEditor = (member: StaffMember) => {
    setEditingPermissionsFor(member);
    setPermissionsEditorOpen(true);
  };

  const openScheduleDialog = (member: StaffMember) => {
    setSelectedStaff(member);
    setScheduleDate(format(new Date(), 'yyyy-MM-dd'));
    setScheduleStart('09:00');
    setScheduleEnd('17:00');
    setScheduleNotes('');
    setScheduleDialogOpen(true);
  };

  const createSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !currentLocation) return;

    setSaving(true);

    const { error } = await supabase
      .from('staff_schedules')
      .insert({
        user_id: selectedStaff.user_id,
        location_id: currentLocation.id,
        shift_date: scheduleDate,
        start_time: scheduleStart,
        end_time: scheduleEnd,
        notes: scheduleNotes || null,
      });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Schedule created' });
      setScheduleDialogOpen(false);
      fetchSchedules();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FeatureGate feature="staff_management" requiredTier="Professional">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Staff Management</h1>
            <p className="text-muted-foreground">Manage team roles and schedules</p>
          </div>
          <div className="flex items-center gap-3">
            {isOrgAdmin && (
              <InviteStaffDialog onInviteSent={() => {
                fetchStaff();
                setInviteRefresh(prev => prev + 1);
              }} />
            )}
            <Badge variant="outline" className="text-xs">
              {formatLimitDisplay(limits.currentUsers, limits.maxUsers)} users
            </Badge>
          </div>
        </div>

        {/* Pending Invitations */}
        {isOrgAdmin && <PendingInvitations refreshTrigger={inviteRefresh} />}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Staff List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Team Members
              </CardTitle>
              <Badge variant="outline">{staff.length} members</Badge>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No staff members found
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {member.profile?.full_name?.charAt(0) || member.profile?.email?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {member.profile?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.profile?.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={roleColors[member.role]}>
                          {roleLabels[member.role] || member.role}
                        </Badge>

                        {isOrgAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openPermissionsEditor(member)}>
                                <KeyRound className="w-4 h-4 mr-2" />
                                Edit Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openScheduleDialog(member)}>
                                <Calendar className="w-4 h-4 mr-2" />
                                Add Schedule
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateRole(member.id, 'staff' as const)}>
                                <Shield className="w-4 h-4 mr-2" />
                                Set as Staff
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateRole(member.id, 'location_manager' as const)}>
                                <Shield className="w-4 h-4 mr-2" />
                                Set as Manager
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => removeStaff(member.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Schedules */}
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No upcoming shifts scheduled
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.slice(0, 10).map((schedule) => {
                    const member = staff.find(s => s.user_id === schedule.user_id);
                    return (
                      <div
                        key={schedule.id}
                        className="p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-foreground">
                            {member?.profile?.full_name || 'Staff'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(schedule.shift_date), 'MMM dd')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {schedule.start_time} - {schedule.end_time}
                        </p>
                        {schedule.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{schedule.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role Permissions */}
          <RolePermissionsCard vertical={vertical} />
        </div>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Schedule for {selectedStaff?.profile?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={createSchedule} className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={scheduleEnd}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Any notes..."
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Schedule
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permissions Editor Sheet */}
      {editingPermissionsFor && (
        <StaffPermissionsEditor
          open={permissionsEditorOpen}
          onOpenChange={setPermissionsEditorOpen}
          userRoleId={editingPermissionsFor.id}
          staffName={editingPermissionsFor.profile?.full_name || 'Staff Member'}
          staffRole={editingPermissionsFor.role as AppRole}
          vertical={vertical}
          onSaved={fetchStaff}
        />
      )}
      </div>
    </FeatureGate>
  );
}
