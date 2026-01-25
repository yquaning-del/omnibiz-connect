

# Staff Roles & Permissions Enhancement Plan

## Assessment Summary

The current system is **functional and well-structured** with module-specific permissions for all 5 verticals. Each business module (Property, Restaurant, Hotel, Pharmacy, Retail) has its own permission set, and admins can customize individual staff access via checkboxes.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CURRENT PERMISSION ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│   │ AppRole     │    │ Vertical    │    │ user_       │                    │
│   │ (hierarchy) │ +  │ Permissions │ +  │ permissions │ = Final Access     │
│   │             │    │ (defaults)  │    │ (overrides) │                    │
│   └─────────────┘    └─────────────┘    └─────────────┘                    │
│                                                                             │
│   Roles: super_admin > org_admin > location_manager > department_lead > staff│
│                                                                             │
│   Verticals: Property | Restaurant | Hotel | Pharmacy | Retail             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Permission Coverage (Verified)

| Vertical | Permission Keys | Status |
|----------|-----------------|--------|
| **Property** | dashboard, units, tenants, leases, rent_collection, applications, maintenance, reports | Complete |
| **Restaurant** | dashboard, pos, tables, kitchen, orders, reservations, products, inventory, customers | Complete |
| **Hotel** | dashboard, front_desk, rooms, reservations, housekeeping, maintenance, guest_services, guest_profiles, billing | Complete |
| **Pharmacy** | dashboard, prescriptions, patients, medications, insurance, controlled, interactions, inventory, pos | Complete |
| **Retail** | dashboard, pos, products, orders, inventory, customers | Complete |
| **Common** | reports, staff, settings | All verticals |

---

## Identified Gaps & AI Recommendations

### Gap 1: No Page-Level Permission Guards

**Issue:** Sidebar hides navigation, but users can still access pages via direct URL.

**Recommendation:** Create a reusable `<PermissionGate>` component for page protection.

```typescript
// Usage in page components
<PermissionGate permission="property.leases" fallback={<AccessDenied />}>
  <LeasesPage />
</PermissionGate>
```

**Files to Create:**
- `src/components/auth/PermissionGate.tsx`

**Files to Modify:**
- All protected page components (wrap content with PermissionGate)

---

### Gap 2: Missing Specialized Roles

**Issue:** `pharmacist` and `front_desk` exist in `SPECIALIZED_ROLES` but aren't part of the `AppRole` enum.

**Recommendation:** Keep current generic roles but enhance permission defaults for vertical context:

- In **Pharmacy**, `staff` role should default to pharmacist-like permissions
- In **Hotel**, `staff` role should default to front_desk-like permissions

**Files to Modify:**
- `src/lib/verticalPermissions.ts` - Adjust `defaultRoles` to be smarter about vertical context

---

### Gap 3: No Read vs. Write Distinction

**Issue:** Permissions are binary - either full access or no access.

**Recommendation:** Add permission levels for sensitive operations:

```typescript
interface PermissionDefinition {
  // ... existing fields
  levels?: ('read' | 'write' | 'delete')[];
  defaultLevel?: Record<AppRole, 'read' | 'write' | 'delete' | 'none'>;
}
```

**Implementation Priority:** Low (current binary system is functional)

---

### Gap 4: No Permission Change Audit Trail

**Issue:** No logging when admins change staff permissions.

**Recommendation:** Log permission changes to `admin_audit_logs`:

```sql
-- When permissions are saved, log the action
INSERT INTO admin_audit_logs (
  admin_user_id, action_type, target_type, target_id, details
) VALUES (
  auth.uid(), 'permission_update', 'user_role', $userRoleId, 
  jsonb_build_object('added', $added, 'removed', $removed)
);
```

**Files to Modify:**
- `src/hooks/usePermissions.ts` - Add audit logging to `savePermissions`

---

### Gap 5: No Permission Templates

**Issue:** Admins must configure each staff member individually.

**Recommendation:** Add quick-apply templates:

```typescript
const PERMISSION_TEMPLATES = {
  property: {
    'Leasing Agent': ['property.dashboard', 'property.units', 'property.leases', 'property.applications'],
    'Maintenance Tech': ['property.dashboard', 'property.maintenance'],
    'Collections': ['property.dashboard', 'property.rent_collection', 'property.tenants'],
  },
  pharmacy: {
    'Pharmacy Tech': ['pharmacy.dashboard', 'pharmacy.prescriptions', 'pharmacy.patients', 'pharmacy.pos'],
    'Inventory Manager': ['pharmacy.dashboard', 'pharmacy.medications', 'pharmacy.inventory'],
  },
  // ... other verticals
};
```

**Files to Create:**
- `src/lib/permissionTemplates.ts`

**Files to Modify:**
- `src/components/staff/StaffPermissionsEditor.tsx` - Add template dropdown

---

## Implementation Plan

### Phase 1: Page Protection (High Priority)

| Step | Task | Files |
|------|------|-------|
| 1 | Create `PermissionGate` component | `src/components/auth/PermissionGate.tsx` |
| 2 | Create `AccessDenied` component | `src/components/auth/AccessDenied.tsx` |
| 3 | Wrap protected pages with PermissionGate | All vertical page components |

### Phase 2: Enhanced Defaults (Medium Priority)

| Step | Task | Files |
|------|------|-------|
| 1 | Add vertical-aware default adjustments | `src/lib/verticalPermissions.ts` |
| 2 | Create permission templates | `src/lib/permissionTemplates.ts` |
| 3 | Add template selector to editor | `src/components/staff/StaffPermissionsEditor.tsx` |

### Phase 3: Audit & Compliance (Medium Priority)

| Step | Task | Files |
|------|------|-------|
| 1 | Add permission change logging | `src/hooks/usePermissions.ts` |
| 2 | Create permission audit view | `src/components/staff/PermissionAuditLog.tsx` |

---

## Technical Details

### PermissionGate Component

```typescript
interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean; // For multiple permissions
}

export function PermissionGate({ permission, children, fallback }: PermissionGateProps) {
  const { hasPermission, loading } = usePermissions();
  
  if (loading) return <LoadingSpinner />;
  if (!hasPermission(permission)) return fallback || <AccessDenied />;
  
  return <>{children}</>;
}
```

### Permission Template Integration

Add to StaffPermissionsEditor:

```typescript
const templates = getTemplatesForVertical(vertical);

// In UI
<Select onValueChange={applyTemplate}>
  <SelectTrigger>
    <SelectValue placeholder="Apply template..." />
  </SelectTrigger>
  <SelectContent>
    {Object.keys(templates).map(name => (
      <SelectItem key={name} value={name}>{name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## Expected Outcomes

After implementation:

1. Direct URL access to restricted pages shows "Access Denied" message
2. Admins can quickly apply permission templates during staff onboarding
3. Permission changes are logged for compliance audits
4. Each vertical's staff see only relevant permissions in the editor
5. Role defaults are smarter about vertical context

---

## No Action Required (Already Working)

The following are already functional:

- Module-specific permission definitions for all 5 verticals
- Checkbox-based permission editor with customization
- Sidebar navigation enforcement via `usePermissions` hook
- Role hierarchy with level-based access control
- Custom permission storage in `user_permissions` table
- Default permission inheritance with override capability

