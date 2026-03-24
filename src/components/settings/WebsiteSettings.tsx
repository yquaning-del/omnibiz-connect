import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Loader2, Globe, ExternalLink, Copy, Check, Image, Link2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface WebsiteSettings {
  enabled: boolean;
  heroTitle: string;
  heroSubtitle: string;
  coverImage: string;
  contactEmail: string;
  contactPhone: string;
  seoTitle: string;
  seoDescription: string;
  socialLinks: {
    facebook: string;
    instagram: string;
    twitter: string;
  };
  businessHours: Record<string, { open: string; close: string }>;
}

const DEFAULT_SETTINGS: WebsiteSettings = {
  enabled: true,
  heroTitle: '',
  heroSubtitle: '',
  coverImage: '',
  contactEmail: '',
  contactPhone: '',
  seoTitle: '',
  seoDescription: '',
  socialLinks: {
    facebook: '',
    instagram: '',
    twitter: '',
  },
  businessHours: {},
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function WebsiteSettingsPanel() {
  const { currentOrganization } = useAuth();
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const websiteUrl = currentOrganization 
    ? `${window.location.origin}/site/${currentOrganization.slug}`
    : '';

  useEffect(() => {
    if (currentOrganization?.settings) {
      const orgSettings = currentOrganization.settings as Record<string, unknown>;
      const websiteSettings = orgSettings.website as Partial<WebsiteSettings> | undefined;
      
      if (websiteSettings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...websiteSettings,
          socialLinks: {
            ...DEFAULT_SETTINGS.socialLinks,
            ...(websiteSettings.socialLinks || {}),
          },
          businessHours: websiteSettings.businessHours || {},
        });
      }
    }
  }, [currentOrganization]);

  const handleSave = async () => {
    if (!currentOrganization) return;

    setSaving(true);
    try {
      const existingSettings = currentOrganization.settings as Record<string, unknown> || {};
      
      const updatedSettings = {
        ...existingSettings,
        website: settings,
      };
      
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: JSON.parse(JSON.stringify(updatedSettings)),
        })
        .eq('id', currentOrganization.id);

      if (error) throw error;

      toast.success("Website settings saved", { description: "Your public website has been updated." });
    } catch (error) {
      console.error('Error saving website settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save website settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(websiteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("URL copied to clipboard");
  };

  const updateBusinessHours = (day: string, field: 'open' | 'close', value: string) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value,
        },
      },
    }));
  };

  const toggleDay = (day: string, enabled: boolean) => {
    if (enabled) {
      setSettings(prev => ({
        ...prev,
        businessHours: {
          ...prev.businessHours,
          [day]: { open: '09:00', close: '17:00' },
        },
      }));
    } else {
      setSettings(prev => {
        const newHours = { ...prev.businessHours };
        delete newHours[day];
        return { ...prev, businessHours: newHours };
      });
    }
  };

  if (!currentOrganization) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Website URL & Toggle */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Public Website
          </CardTitle>
          <CardDescription>
            Enable and configure your business's public-facing website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <p className="font-medium text-foreground">Website Enabled</p>
              <p className="text-sm text-muted-foreground">
                {settings.enabled ? 'Your website is live and accessible' : 'Website is hidden from public'}
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Your Website URL</Label>
            <div className="flex gap-2">
              <Input value={websiteUrl} readOnly className="bg-muted/50" />
              <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with customers or set up a custom domain in your project settings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hero Content */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Hero Section
          </CardTitle>
          <CardDescription>
            Customize the main banner on your website homepage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heroTitle">Headline</Label>
            <Input
              id="heroTitle"
              value={settings.heroTitle}
              onChange={(e) => setSettings(prev => ({ ...prev, heroTitle: e.target.value }))}
              placeholder={`Welcome to ${currentOrganization.name}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">Tagline</Label>
            <Textarea
              id="heroSubtitle"
              value={settings.heroSubtitle}
              onChange={(e) => setSettings(prev => ({ ...prev, heroSubtitle: e.target.value }))}
              placeholder="Quality service since 2020"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImage">Cover Image URL</Label>
            <Input
              id="coverImage"
              value={settings.coverImage}
              onChange={(e) => setSettings(prev => ({ ...prev, coverImage: e.target.value }))}
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Add a background image for your hero section
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Contact & Social
          </CardTitle>
          <CardDescription>
            Contact information and social media links displayed on your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="info@business.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={settings.contactPhone}
                onChange={(e) => setSettings(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-muted-foreground">Social Media Links</Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={settings.socialLinks.facebook}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, facebook: e.target.value }
                  }))}
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={settings.socialLinks.instagram}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                  }))}
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  value={settings.socialLinks.twitter}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                  }))}
                  placeholder="https://twitter.com/..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Business Hours
          </CardTitle>
          <CardDescription>
            Set your operating hours to display on the website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map((day) => {
            const isOpen = day in settings.businessHours;
            const hours = settings.businessHours[day] || { open: '09:00', close: '17:00' };

            return (
              <div key={day} className="flex items-center gap-4">
                <div className="w-28">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isOpen}
                      onCheckedChange={(enabled) => toggleDay(day, enabled)}
                    />
                    <span className="capitalize text-sm font-medium">{day}</span>
                  </div>
                </div>
                {isOpen && (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={hours.open}
                      onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={hours.close}
                      onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                      className="w-32"
                    />
                  </div>
                )}
                {!isOpen && (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
          <CardDescription>
            Optimize how your website appears in search engines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seoTitle">Page Title</Label>
            <Input
              id="seoTitle"
              value={settings.seoTitle}
              onChange={(e) => setSettings(prev => ({ ...prev, seoTitle: e.target.value }))}
              placeholder={currentOrganization.name}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              {settings.seoTitle.length}/60 characters (recommended)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seoDescription">Meta Description</Label>
            <Textarea
              id="seoDescription"
              value={settings.seoDescription}
              onChange={(e) => setSettings(prev => ({ ...prev, seoDescription: e.target.value }))}
              placeholder="Describe your business in a few sentences..."
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">
              {settings.seoDescription.length}/160 characters (recommended)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Website Settings'
          )}
        </Button>
      </div>
    </div>
  );
}
