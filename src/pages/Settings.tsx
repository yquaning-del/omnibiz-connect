import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, MapPin, User, Bell, Globe, Save, CreditCard, Upload, BookOpen, FileText, ChevronRight, ExternalLink, Shield } from 'lucide-react';
import { AccountManagement } from '@/components/settings/AccountManagement';
import { BusinessVertical, VERTICAL_CONFIG } from '@/types';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { OrganizationSettings as RegionalSettings } from '@/components/settings/OrganizationSettings';
import { WebsiteSettingsPanel } from '@/components/settings/WebsiteSettings';
import DataImport from '@/pages/settings/DataImport';
import { useLimitChecker, formatLimitDisplay } from '@/hooks/useLimitChecker';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Settings() {
  const { currentOrganization, currentLocation, profile, user } = useAuth();
  const { t } = useLanguage();
  const limits = useLimitChecker();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Organization settings
  const [orgName, setOrgName] = useState('');
  const [orgVertical, setOrgVertical] = useState<BusinessVertical>('retail');

  // Location settings
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locPhone, setLocPhone] = useState('');
  const [locEmail, setLocEmail] = useState('');

  // User preferences
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [orderNotifications, setOrderNotifications] = useState(true);
  // Property-specific notifications
  const [rentDueReminders, setRentDueReminders] = useState(true);
  const [overdueAlerts, setOverdueAlerts] = useState(true);
  const [leaseExpiryAlerts, setLeaseExpiryAlerts] = useState(true);
  const [newApplicationAlerts, setNewApplicationAlerts] = useState(true);
  const [maintenanceUpdates, setMaintenanceUpdates] = useState(true);
  const [savingNotificationPrefs, setSavingNotificationPrefs] = useState(false);

  const isPropertyVertical = currentOrganization?.primary_vertical === 'property';

  // Accumulate pending notification pref changes and debounce the save
  const pendingPrefsRef = useRef<Record<string, boolean>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushNotificationPreferences = useCallback(async () => {
    if (!user?.id) return;
    const pending = { ...pendingPrefsRef.current };
    pendingPrefsRef.current = {};

    setSavingNotificationPrefs(true);
    try {
      const allPrefs = {
        email_notifications: pending.emailNotifications ?? emailNotifications,
        low_stock_alerts: pending.lowStockAlerts ?? lowStockAlerts,
        order_notifications: pending.orderNotifications ?? orderNotifications,
        rent_due_reminders: pending.rentDueReminders ?? rentDueReminders,
        overdue_alerts: pending.overdueAlerts ?? overdueAlerts,
        lease_expiry_alerts: pending.leaseExpiryAlerts ?? leaseExpiryAlerts,
        new_application_alerts: pending.newApplicationAlerts ?? newApplicationAlerts,
        maintenance_updates: pending.maintenanceUpdates ?? maintenanceUpdates,
      };

      const { error } = await supabase
        .from('profiles')
        .update({ user_settings: allPrefs as any })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving notification prefs:', error);
      toast.error("Error", { description: "Failed to save notification preferences" });
    } finally {
      setSavingNotificationPrefs(false);
    }
  }, [user?.id, emailNotifications, lowStockAlerts, orderNotifications, rentDueReminders, overdueAlerts, leaseExpiryAlerts, newApplicationAlerts, maintenanceUpdates, toast]);

  const saveNotificationPreferences = useCallback((prefs: Record<string, boolean>) => {
    // Merge into pending changes
    Object.assign(pendingPrefsRef.current, prefs);

    // Debounce: wait 500ms after last toggle before saving
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushNotificationPreferences();
    }, 500);
  }, [flushNotificationPreferences]);

  // Wrapper functions for notification toggles that also persist
  const handleToggleNotification = (key: string, value: boolean) => {
    switch (key) {
      case 'emailNotifications': setEmailNotifications(value); break;
      case 'lowStockAlerts': setLowStockAlerts(value); break;
      case 'orderNotifications': setOrderNotifications(value); break;
      case 'rentDueReminders': setRentDueReminders(value); break;
      case 'overdueAlerts': setOverdueAlerts(value); break;
      case 'leaseExpiryAlerts': setLeaseExpiryAlerts(value); break;
      case 'newApplicationAlerts': setNewApplicationAlerts(value); break;
      case 'maintenanceUpdates': setMaintenanceUpdates(value); break;
    }
    saveNotificationPreferences({ [key]: value });
  };

  useEffect(() => {
    if (currentOrganization) {
      setOrgName(currentOrganization.name);
      setOrgVertical(currentOrganization.primary_vertical);
    }
    if (currentLocation) {
      setLocName(currentLocation.name);
      setLocAddress(currentLocation.address || '');
      setLocCity(currentLocation.city || '');
      setLocPhone(currentLocation.phone || '');
      setLocEmail(currentLocation.email || '');
    }
    if (profile) {
      setUserName(profile.full_name || '');
      setUserEmail(profile.email || '');
      setUserPhone(profile.phone || '');

      // Load saved notification preferences from profile
      const prefs = (profile as any)?.user_settings as Record<string, boolean> | undefined;
      if (prefs) {
        setEmailNotifications(prefs.email_notifications ?? true);
        setLowStockAlerts(prefs.low_stock_alerts ?? true);
        setOrderNotifications(prefs.order_notifications ?? true);
        setRentDueReminders(prefs.rent_due_reminders ?? true);
        setOverdueAlerts(prefs.overdue_alerts ?? true);
        setLeaseExpiryAlerts(prefs.lease_expiry_alerts ?? true);
        setNewApplicationAlerts(prefs.new_application_alerts ?? true);
        setMaintenanceUpdates(prefs.maintenance_updates ?? true);
      }
    }
  }, [currentOrganization, currentLocation, profile]);

  const saveOrganization = async () => {
    if (!currentOrganization) return;
    setSaving(true);

    const { error } = await supabase
      .from('organizations')
      .update({
        name: orgName.trim(),
        primary_vertical: orgVertical,
      })
      .eq('id', currentOrganization.id);

    if (error) {
      toast.error("Error");
    } else {
      toast.success("Organization updated");
    }
    setSaving(false);
  };

  const saveLocation = async () => {
    if (!currentLocation) return;
    setSaving(true);

    const { error } = await supabase
      .from('locations')
      .update({
        name: locName.trim(),
        address: locAddress.trim() || null,
        city: locCity.trim() || null,
        phone: locPhone.trim() || null,
        email: locEmail.trim() || null,
      })
      .eq('id', currentLocation.id);

    if (error) {
      toast.error("Error");
    } else {
      toast.success("Location updated");
    }
    setSaving(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: userName.trim() || null,
        phone: userPhone.trim() || null,
      })
      .eq('id', user.id);

    if (error) {
      toast.error("Error");
    } else {
      toast.success("Profile updated");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {t('settings.organization')}
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {t('settings.location')}
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            {t('settings.profile')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {t('settings.notifications')}
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="language" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t('settings.language')}
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Data Import
          </TabsTrigger>
          <TabsTrigger value="website" className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Website
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Help & Docs
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Organization Settings */}
        <TabsContent value="organization" className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Manage your business organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="My Business"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Primary Business Type</Label>
                  <Select value={orgVertical} onValueChange={(v) => setOrgVertical(v as BusinessVertical)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VERTICAL_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={saveOrganization} disabled={saving} className="w-fit">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Regional & Tax Settings */}
          <RegionalSettings />
        </TabsContent>

        {/* Location Settings */}
        <TabsContent value="location">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Location Settings</CardTitle>
                  <CardDescription>Configure your current location details</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {formatLimitDisplay(limits.currentLocations, limits.maxLocations)} locations
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>Location Name</Label>
                  <Input
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    placeholder="Main Branch"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={locAddress}
                    onChange={(e) => setLocAddress(e.target.value)}
                    placeholder="123 Main Street"
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={locCity}
                    onChange={(e) => setLocCity(e.target.value)}
                    placeholder="New York"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={locPhone}
                      onChange={(e) => setLocPhone(e.target.value)}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={locEmail}
                      onChange={(e) => setLocEmail(e.target.value)}
                      placeholder="location@business.com"
                    />
                  </div>
                </div>

                <Button onClick={saveLocation} disabled={saving} className="w-fit">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your personal account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="John Doe"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={userEmail}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    maxLength={20}
                  />
                </div>

                <Button onClick={saveProfile} disabled={saving} className="w-fit">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how you receive alerts and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 max-w-md">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={(v) => handleToggleNotification('emailNotifications', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-medium text-foreground">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified when items are low</p>
                  </div>
                  <Switch
                    checked={lowStockAlerts}
                    onCheckedChange={(v) => handleToggleNotification('lowStockAlerts', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-medium text-foreground">Order Notifications</p>
                    <p className="text-sm text-muted-foreground">Alerts for new orders</p>
                  </div>
                  <Switch
                    checked={orderNotifications}
                    onCheckedChange={(v) => handleToggleNotification('orderNotifications', v)}
                  />
                </div>

                {/* Property-specific notifications */}
                {isPropertyVertical && (
                  <>
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-sm font-medium text-muted-foreground mb-4">Property Management Alerts</p>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="font-medium text-foreground">Rent Due Reminders</p>
                        <p className="text-sm text-muted-foreground">Notify tenants before rent is due</p>
                      </div>
                      <Switch
                        checked={rentDueReminders}
                        onCheckedChange={(v) => handleToggleNotification('rentDueReminders', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="font-medium text-foreground">Overdue Payment Alerts</p>
                        <p className="text-sm text-muted-foreground">Get notified about overdue payments</p>
                      </div>
                      <Switch
                        checked={overdueAlerts}
                        onCheckedChange={(v) => handleToggleNotification('overdueAlerts', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="font-medium text-foreground">Lease Expiry Alerts</p>
                        <p className="text-sm text-muted-foreground">Notifications for expiring leases</p>
                      </div>
                      <Switch
                        checked={leaseExpiryAlerts}
                        onCheckedChange={(v) => handleToggleNotification('leaseExpiryAlerts', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="font-medium text-foreground">New Application Alerts</p>
                        <p className="text-sm text-muted-foreground">Get notified about new tenant applications</p>
                      </div>
                      <Switch
                        checked={newApplicationAlerts}
                        onCheckedChange={(v) => handleToggleNotification('newApplicationAlerts', v)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div>
                        <p className="font-medium text-foreground">Maintenance Updates</p>
                        <p className="text-sm text-muted-foreground">Updates on maintenance requests</p>
                      </div>
                      <Switch
                        checked={maintenanceUpdates}
                        onCheckedChange={(v) => handleToggleNotification('maintenanceUpdates', v)}
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Settings */}
        <TabsContent value="subscription">
          <SubscriptionSettings />
        </TabsContent>

        {/* Language Settings */}
        <TabsContent value="language">
          <LanguageSettings />
        </TabsContent>

        <TabsContent value="import">
          <DataImport />
        </TabsContent>

        {/* Website Settings */}
        <TabsContent value="website">
          <WebsiteSettingsPanel />
        </TabsContent>

        {/* Help & Documentation */}
        <TabsContent value="help">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Help & Documentation</CardTitle>
              <CardDescription>Access guides, manuals, and support resources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => navigate('/docs?tab=user-manual')}
                  className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors group text-left"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">User Manual</p>
                      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Comprehensive guide covering all modules, features, and workflows
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/docs?tab=testing')}
                  className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors group text-left"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">Testing Guide</p>
                      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Technical documentation for testing and verification procedures
                    </p>
                  </div>
                </button>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-medium text-foreground mb-2">Quick Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">⌘K</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Ctrl+K</kbd> to open the command palette</li>
                  <li>• Use keyboard shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Shift+P</kbd> for POS, <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Shift+I</kbd> for Inventory</li>
                  <li>• The Setup Checklist on your dashboard guides you through initial configuration</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Management (GDPR) */}
        <TabsContent value="account">
          <AccountManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
