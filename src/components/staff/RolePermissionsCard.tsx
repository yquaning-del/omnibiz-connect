import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Shield, Check, FileText, Layout } from 'lucide-react';
import { ROLE_PERMISSIONS, SPECIALIZED_ROLES } from '@/lib/rolePermissions';
import { cn } from '@/lib/utils';

export function RolePermissionsCard() {
  const allRoles = { ...ROLE_PERMISSIONS, ...SPECIALIZED_ROLES };
  
  // Sort by level descending
  const sortedRoles = Object.entries(allRoles)
    .filter(([key]) => key !== 'tenant') // Don't show tenant role in staff management
    .sort(([, a], [, b]) => b.level - a.level);

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Role Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <Accordion type="single" collapsible className="w-full">
          {sortedRoles.map(([roleKey, role]) => (
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
                      <Check className="w-4 h-4 text-primary" />
                      Features
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {role.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Layout className="w-4 h-4 text-primary" />
                      Page Access
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {role.pages.map((page) => (
                        <Badge key={page} variant="outline" className="text-xs">
                          {page}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
