

# Staff Management Enhancement Plan

## Problem Summary

The Staff Management page is empty because:
1. **No staff are listed** - The query fetches from `user_roles` but only users already in the system appear
2. **No way to add new staff** - There's no "Invite Staff" or "Add Staff Member" functionality
3. **Role permissions not clearly defined** - The "Role Permissions" card just shows badges without explaining what each role can do
4. **Missing permission configuration** - Org admins cannot configure granular access for staff

---

## Solution Overview

```text
+-------------------+     +------------------------+     +------------------+
|   Staff List      | --> |  Invite Staff Dialog   | --> |  Email Invite    |
|   (Enhanced)      |     |  (Email + Role)        |     |  Edge Function   |
+-------------------+     +------------------------+     +------------------+
         |                                                        |
         v                                                        v
+-------------------+     +------------------------+     +------------------+
| Role Permissions  | --> | Permission Matrix Card | --> | Accept Invite    |
| (Expanded View)   |     | (What each role sees)  |     | (User onboards)  |
+-------------------+     +------------------------+     +------------------+
```

---

## Implementation Phases

### Phase 1: Staff Invitation System

**New Edge Function: `send-staff-invitation`**
- Accepts: email, role, organization_id, location_id (optional)
- Creates a `staff_invitations` table record with unique token
- Shows shareable invite link (or sends email if RESEND configured)

**New Database Table: `staff_invitations`**
```sql
CREATE TABLE staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**RLS Policies:**
- Org admins can create/view/manage invitations in their organization
- Invitees can view their own invitation by token

### Phase 2: Accept Invitation Flow

**New Page: `/staff/accept-invite/:token`**
- Validates token, checks expiration
- If user doesn't exist: Shows signup form
- If user exists: Shows login prompt
- On success: Creates `user_roles` entry with the invited role

**Update Auth Flow:**
- After accepting, user is redirected to dashboard with their new role

### Phase 3: Role Permissions Display

**Enhanced "Role Permissions" Card**

Each role will show what features/pages they can access:

| Role | Access Level |
|------|--------------|
| **Super Admin** | Full platform access, admin panel, all organizations |
| **Org Admin** | All locations in organization, staff management, billing |
| **Location Manager** | Single location, all features at that location, scheduling |
| **Department Lead** | Assigned department, view reports, manage department staff |
| **Staff/Cashier** | POS, basic inventory, assigned tasks only |
| **Pharmacist** | Pharmacy features: prescriptions, controlled substances |
| **Front Desk** | Hotel features: check-in/out, reservations, guest profiles |

### Phase 4: Staff Page Enhancements

**Add Staff Button**
- Opens dialog with:
  - Email input (required)
  - Role dropdown (filtered based on current user's role)
  - Location assignment (optional for org-wide roles)
  - "Send Invitation" button

**Staff List Improvements**
- Show pending invitations in a separate section
- Add "Resend" and "Cancel" actions for pending invites
- Show last login date for active staff

**Role Editing**
- Only allow assigning roles at or below current user's level
- Super Admin can assign any role
- Org Admin can assign: location_manager, department_lead, staff, pharmacist, front_desk
- Location Manager can assign: staff

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/staff/InviteStaffDialog.tsx` | Dialog for inviting new staff members |
| `src/components/staff/PendingInvitations.tsx` | List of pending staff invitations |
| `src/components/staff/RolePermissionsCard.tsx` | Enhanced role permissions display with details |
| `src/pages/staff/AcceptStaffInvite.tsx` | Page for accepting staff invitations |
| `supabase/functions/send-staff-invitation/index.ts` | Edge function for creating invitations |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Staff.tsx` | Add invite button, pending invitations section, enhance role permissions |
| `src/App.tsx` | Add route for `/staff/accept-invite/:token` |
| `supabase/config.toml` | Register new edge function |

### Database Migration

```sql
-- Staff invitations table
CREATE TABLE public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  location_id UUID,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Org admins can manage staff invitations"
ON public.staff_invitations FOR ALL
USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Users can view invitations for their email"
ON public.staff_invitations FOR SELECT
USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));
```

### Role Hierarchy Enforcement

The system will enforce this hierarchy when assigning roles:

```text
super_admin (level 5)
    └── org_admin (level 4)
        └── location_manager (level 3)
            └── department_lead (level 2)
                └── staff, pharmacist, front_desk (level 1)
```

A user can only assign roles at or below their current level.

### Role-to-Feature Mapping

```typescript
const ROLE_PERMISSIONS = {
  super_admin: {
    label: 'Super Admin',
    description: 'Full platform access',
    features: ['All pages', 'Admin Panel', 'All organizations', 'Billing'],
    level: 5
  },
  org_admin: {
    label: 'Org Admin',
    description: 'Organization-wide access',
    features: ['All locations', 'Staff management', 'Reports', 'Settings'],
    level: 4
  },
  location_manager: {
    label: 'Location Manager',
    description: 'Single location access',
    features: ['All location features', 'Scheduling', 'Reports'],
    level: 3
  },
  department_lead: {
    label: 'Department Lead',
    description: 'Department oversight',
    features: ['Department pages', 'Team scheduling', 'View reports'],
    level: 2
  },
  staff: {
    label: 'Staff',
    description: 'Basic operational access',
    features: ['POS', 'Basic inventory', 'Assigned tasks'],
    level: 1
  },
  pharmacist: {
    label: 'Pharmacist',
    description: 'Pharmacy-specific access',
    features: ['Prescriptions', 'Patients', 'Medications', 'Controlled substances'],
    level: 1
  },
  front_desk: {
    label: 'Front Desk',
    description: 'Hotel front desk access',
    features: ['Check-in/out', 'Reservations', 'Guest profiles', 'Billing'],
    level: 1
  }
};
```

---

## UI Design

### Invite Staff Dialog
- Email input field
- Role dropdown (showing allowed roles based on current user)
- Optional location assignment for location-specific roles
- Submit creates invitation and shows shareable link

### Pending Invitations Section
- Shows all pending invitations for the organization
- Each row: Email, Role, Sent Date, Expires, Actions (Resend/Cancel)
- Auto-refresh when invitations are accepted

### Role Permissions Card (Enhanced)
- Expandable accordion for each role
- Shows: Description, Features allowed, Pages accessible
- Visual hierarchy indicator (colored dots or icons)

---

## Implementation Order

| Step | Task | Priority |
|------|------|----------|
| 1 | Create `staff_invitations` table with RLS | High |
| 2 | Create `send-staff-invitation` edge function | High |
| 3 | Create `InviteStaffDialog.tsx` component | High |
| 4 | Create `AcceptStaffInvite.tsx` page | High |
| 5 | Create `PendingInvitations.tsx` component | Medium |
| 6 | Create `RolePermissionsCard.tsx` with detailed permissions | Medium |
| 7 | Update `Staff.tsx` to integrate all components | High |
| 8 | Add route to `App.tsx` for accept invite page | High |

---

## Expected Outcome

After implementation:
1. Org Admins can invite new staff via email with a specific role
2. Invited users receive a link to join the organization
3. Staff appear in the list once they accept the invitation
4. Pending invitations are visible and manageable
5. Role permissions are clearly documented in the UI
6. Proper role hierarchy is enforced when assigning permissions

