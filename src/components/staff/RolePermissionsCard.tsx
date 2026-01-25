import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Shield, Check, Layout } from 'lucide-react';
import { ROLE_PERMISSIONS, SPECIALIZED_ROLES } from '@/lib/rolePermissions';
import { getAllPermissionsForVertical, getDefaultPermissionsForRole, getVerticalLabel } from '@/lib/verticalPermissions';
import { cn } from '@/lib/utils';
import { BusinessVertical, AppRole } from '@/types';

interface RolePermissionsCardProps {
  vertical: BusinessVertical;
}

export function RolePermissionsCard({ vertical }: RolePermissionsCardProps) {
  const allPermissions = getAllPermissionsForVertical(vertical);
  
  // Get roles relevant to this vertical
  const verticalRoles = Object.entries(ROLE_PERMISSIONS)
    .filter(([key]) => key !== 'tenant') // Don't show tenant role in staff management
    .sort(([, a], [, b]) => b.level - a.level);

  // Get role-specific permissions for display
  const getRolePermissions = (roleKey: AppRole) => {
    const permissionKeys = getDefaultPermissionsForRole(vertical, roleKey);
    return allPermissions.filter(p => permissionKeys.includes(p.key));
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Role Permissions
        </CardTitle>
        <Badge variant="secondary" className="w-fit">
          {getVerticalLabel(vertical)}
        </Badge>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <Accordion type="single" collapsible className="w-full">
          {verticalRoles.map(([roleKey, role]) => {
            const rolePermissions = getRolePermissions(roleKey as AppRole);
            
            return (
              <AccordionItem key={roleKey} value={roleKey} className="border-b-0">
                <AccordionTrigger className="hover:no-underline px-4 py-3 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-2 h-2 rounded-full',
                            i < role.level ? 'bg-primary' : 'bg-muted'
                          )}
                        />
                      ))}
                    </div>
                    <Badge variant="outline" className={cn('text-xs', role.color)}>
                      {role.label}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Layout className="w-4 h-4 text-primary" />
                        Default Access ({rolePermissions.length} features)
                      </div>
                      <div className="flex flex-wrap gap-2 pl-6">
                        {rolePermissions.map((perm) => (
                          <Badge key={perm.key} variant="secondary" className="text-xs flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {perm.label}
                          </Badge>
                        ))}
                        {rolePermissions.length === 0 && (
                          <span className="text-xs text-muted-foreground">No default access</span>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        
        <p className="text-xs text-muted-foreground mt-4 px-4">
          Admins can customize individual permissions for each staff member using the "Edit Permissions" action.
        </p>
      </CardContent>
    </Card>
  );
}
