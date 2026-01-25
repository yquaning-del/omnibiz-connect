import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { useStaffPermissions } from '@/hooks/usePermissions';
import {
  getAllPermissionsForVertical,
  getDefaultPermissionsForRole,
  getVerticalLabel,
  PermissionDefinition,
} from '@/lib/verticalPermissions';
import { AppRole, BusinessVertical } from '@/types';
import { ROLE_PERMISSIONS } from '@/lib/rolePermissions';

interface StaffPermissionsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRoleId: string;
  staffName: string;
  staffRole: AppRole;
  vertical: BusinessVertical;
  onSaved?: () => void;
}

export function StaffPermissionsEditor({
  open,
  onOpenChange,
  userRoleId,
  staffName,
  staffRole,
  vertical,
  onSaved,
}: StaffPermissionsEditorProps) {
  const { toast } = useToast();
  const { permissions, loading, savePermissions } = useStaffPermissions(
    open ? userRoleId : null
  );

  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const allPermissions = getAllPermissionsForVertical(vertical);
  const defaultPermissionKeys = getDefaultPermissionsForRole(vertical, staffRole);

  // Initialize local permissions when sheet opens
  useEffect(() => {
    if (!open) return;

    const initial: Record<string, boolean> = {};

    // Start with role defaults
    for (const perm of allPermissions) {
      initial[perm.key] = defaultPermissionKeys.includes(perm.key);
    }

    // Apply custom overrides
    for (const customPerm of permissions) {
      initial[customPerm.permission_key] = customPerm.granted;
    }

    setLocalPermissions(initial);
  }, [open, permissions, allPermissions, defaultPermissionKeys]);

  const handleToggle = (key: string, checked: boolean) => {
    setLocalPermissions((prev) => ({ ...prev, [key]: checked }));
  };

  const handleResetToDefaults = () => {
    const defaults: Record<string, boolean> = {};
    for (const perm of allPermissions) {
      defaults[perm.key] = defaultPermissionKeys.includes(perm.key);
    }
    setLocalPermissions(defaults);
  };

  const handleSave = async () => {
    setSaving(true);

    // Only save permissions that differ from defaults
    const customPerms: { permission_key: string; granted: boolean }[] = [];

    for (const [key, granted] of Object.entries(localPermissions)) {
      const isDefault = defaultPermissionKeys.includes(key);
      if (granted !== isDefault) {
        customPerms.push({ permission_key: key, granted });
      }
    }

    const result = await savePermissions(customPerms);

    if (result.success) {
      toast({ title: 'Permissions saved successfully' });
      onSaved?.();
      onOpenChange(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error saving permissions',
        description: result.error,
      });
    }

    setSaving(false);
  };

  const mainPermissions = allPermissions.filter((p) => p.category === 'main');
  const featurePermissions = allPermissions.filter((p) => p.category === 'features');
  const managementPermissions = allPermissions.filter((p) => p.category === 'management');

  const renderPermissionGroup = (
    title: string,
    perms: PermissionDefinition[]
  ) => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="grid gap-3">
        {perms.map((perm) => {
          const isChecked = localPermissions[perm.key] ?? false;
          const isDefault = defaultPermissionKeys.includes(perm.key);
          const isCustomized = isChecked !== isDefault;

          return (
            <div
              key={perm.key}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
            >
              <Checkbox
                id={perm.key}
                checked={isChecked}
                onCheckedChange={(checked) =>
                  handleToggle(perm.key, checked === true)
                }
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={perm.key}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {perm.label}
                  </Label>
                  {isCustomized && (
                    <Badge variant="outline" className="text-xs">
                      Customized
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {perm.description}
                </p>
              </div>
              <perm.icon className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            Edit Permissions for {staffName}
          </SheetTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={ROLE_PERMISSIONS[staffRole]?.color}>
              {ROLE_PERMISSIONS[staffRole]?.label || staffRole}
            </Badge>
            <Badge variant="secondary">{getVerticalLabel(vertical)}</Badge>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {mainPermissions.length > 0 &&
              renderPermissionGroup('Main Features', mainPermissions)}

            {featurePermissions.length > 0 &&
              renderPermissionGroup('Additional Features', featurePermissions)}

            {managementPermissions.length > 0 &&
              renderPermissionGroup('Management', managementPermissions)}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleResetToDefaults}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Role Defaults
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Permissions
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
