
# Tenant Portal and PDF Lease Export Implementation

## Overview

This plan adds three major capabilities to the Property Management vertical:

1. **PDF Export** - Download generated leases as formatted PDF documents
2. **Email Invitations** - Send lease signing invitations to tenants
3. **Tenant Portal** - A dedicated portal where tenants can sign leases, make payments, submit maintenance requests, and manage their account

---

## Architecture Summary

```text
+------------------+     Email Invite     +------------------+
|   Landlord/PM    | ------------------> |     Tenant       |
|   (Existing)     |                      |   (New Portal)   |
+------------------+                      +------------------+
        |                                         |
        v                                         v
+------------------+                      +------------------+
| Lease Wizard     |                      | /tenant Routes   |
| - Generate PDF   |                      | - Dashboard      |
| - Send Invite    |                      | - Sign Lease     |
+------------------+                      | - Payments       |
                                          | - Maintenance    |
                                          +------------------+
```

---

## Phase 1: PDF Export for Leases

### New Dependencies
- `jspdf` - PDF generation library
- `jspdf-autotable` - Table support for jspdf

### New Component: `LeaseExportButton.tsx`
**Location:** `src/components/property/LeaseExportButton.tsx`

Renders a "Download PDF" button that:
- Takes lease data, tenant info, unit info, and clauses as props
- Generates a professional PDF with:
  - Header with property logo/name
  - Lease agreement title and number
  - Parties section (Landlord & Tenant info)
  - Property details section
  - All clause sections with proper formatting
  - Signature blocks for both parties
  - Footer with date and page numbers

### Integration Points
- Add to `LeaseGenerationStep.tsx` (after clauses generated)
- Add to `Leases.tsx` page (for existing leases)
- Add to future `LeaseDetails` component

---

## Phase 2: Database Schema Updates

### New Role: `tenant`
Add `tenant` to the `app_role` enum to support tenant-specific access.

### New Table: `lease_invitations`
Tracks email invitations sent to tenants for lease signing.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| lease_id | uuid | FK to leases |
| tenant_id | uuid | FK to tenants |
| organization_id | uuid | FK to organizations |
| email | text | Tenant's email |
| token | text | Unique invitation token |
| status | text | pending, accepted, expired |
| sent_at | timestamp | When invitation was sent |
| expires_at | timestamp | Token expiry (7 days) |
| accepted_at | timestamp | When tenant signed up |

### New Table: `lease_signatures`
Records electronic signatures on leases.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| lease_id | uuid | FK to leases |
| signer_type | text | landlord, tenant |
| signer_id | uuid | User ID who signed |
| signature_data | jsonb | Signature image/metadata |
| signed_at | timestamp | Signing timestamp |
| ip_address | text | IP for audit |

### Updates to `tenants` Table
Add `user_id` column to link tenants to auth users.

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | FK to auth.users (nullable) |

### Updates to `leases` Table
Add signature tracking columns.

| Column | Type | Description |
|--------|------|-------------|
| landlord_signed_at | timestamp | When landlord signed |
| tenant_signed_at | timestamp | When tenant signed |
| signed_lease_pdf | text | Storage URL for signed PDF |

### Updates to `maintenance_requests` Table
Add tenant submission tracking.

| Column | Type | Description |
|--------|------|-------------|
| submitted_by_tenant | uuid | FK to tenants (if tenant-submitted) |

---

## Phase 3: Email Invitation System

### New Edge Function: `send-lease-invitation`
**Location:** `supabase/functions/send-lease-invitation/index.ts`

Features:
- Generates unique invitation token
- Creates `lease_invitations` record
- Sends branded email via Resend with:
  - Property name and address
  - Lease summary (rent, dates, terms)
  - "Sign Your Lease" CTA button
  - Link to tenant portal sign-up

### New Component: `InviteTenantButton.tsx`
**Location:** `src/components/property/InviteTenantButton.tsx`

Button that triggers invitation email flow.

### Integration
- Add to `LeaseWizard.tsx` Step 7 (Review & Create)
- Add to `Leases.tsx` for existing unsigned leases

---

## Phase 4: Tenant Portal

### New Routes (Under `/tenant/*`)

| Route | Component | Description |
|-------|-----------|-------------|
| `/tenant/auth` | TenantAuth | Login/signup for tenants |
| `/tenant/accept-invite/:token` | AcceptInvite | Token validation and account creation |
| `/tenant/dashboard` | TenantDashboard | Tenant home with summary |
| `/tenant/leases` | TenantLeases | View and sign leases |
| `/tenant/leases/:id` | TenantLeaseDetails | View specific lease, sign |
| `/tenant/payments` | TenantPayments | Make payments, view history |
| `/tenant/maintenance` | TenantMaintenance | Submit and track requests |
| `/tenant/profile` | TenantProfile | Manage account details |

### New Layout: `TenantLayout.tsx`
Simplified layout for tenant portal with:
- Tenant-specific sidebar navigation
- Profile dropdown
- Notification center
- Property branding

### Authentication Flow
1. Landlord creates lease and invites tenant
2. Tenant receives email with unique link
3. Tenant clicks link, lands on `/tenant/accept-invite/:token`
4. If new user: Creates account with tenant's email
5. If existing: Links to existing profile
6. System creates `user_roles` entry with `tenant` role
7. Links `tenants.user_id` to the auth user
8. Redirects to `/tenant/dashboard`

---

## Phase 5: Tenant Portal Pages

### TenantDashboard.tsx
Summary cards showing:
- Active lease(s) overview
- Next payment due date and amount
- Open maintenance requests
- Recent activity feed

### TenantLeases.tsx / TenantLeaseDetails.tsx
Features:
- View all lease documents (PDF viewer)
- Sign lease electronically with:
  - Checkbox agreement flow
  - Signature pad (draw or type name)
  - Legal attestation text
- Download signed PDF
- View lease history

### TenantPayments.tsx
Features:
- View upcoming payments
- Payment history
- Make payment (integrates with existing Paystack)
- Set up auto-pay (future enhancement)
- Download receipts

### TenantMaintenance.tsx
Features:
- Submit new maintenance request
  - Title, description, category, priority
  - Photo upload capability
- View request status and history
- Communication thread with property manager

### TenantProfile.tsx
Features:
- Update contact information
- Update emergency contacts
- Change password
- Email preferences

---

## Phase 6: RLS Policies

### Tenant Access Policies

**lease_invitations:**
- Tenants can view their own invitations (by email)
- Managers can manage invitations for their org

**lease_signatures:**
- Users can insert their own signatures
- Users can view signatures on leases they're party to

**leases (tenant access):**
- Tenants can view leases where `tenant_id` matches their linked tenant record

**rent_payments (tenant access):**
- Tenants can view/insert their own payments

**maintenance_requests (tenant access):**
- Tenants can insert requests for their unit
- Tenants can view their own submitted requests

---

## Phase 7: Security Considerations

1. **Token Security:**
   - Invitation tokens expire after 7 days
   - Tokens are single-use (marked as accepted)
   - Cryptographically random generation

2. **Tenant Isolation:**
   - Tenants only see their own data
   - Cannot access other units or tenants
   - RLS enforces at database level

3. **Signature Audit Trail:**
   - All signatures include IP address
   - Timestamps are immutable
   - PDF is stored with hash for integrity

4. **Email Verification:**
   - Tenant email must match invitation email
   - Auto-confirm enabled for faster onboarding

---

## Implementation Order

| Phase | Components | Priority |
|-------|------------|----------|
| 1 | PDF Export (jspdf, LeaseExportButton) | High |
| 2 | Database migrations (tenant role, tables) | High |
| 3 | Email invitation edge function | High |
| 4 | Tenant auth flow (accept-invite, auth) | High |
| 5 | Tenant layout and routing | Medium |
| 6 | Tenant dashboard and lease signing | Medium |
| 7 | Tenant payments and maintenance | Medium |
| 8 | RLS policies for tenant access | High |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/property/LeaseExportButton.tsx` | PDF export button component |
| `src/components/property/InviteTenantButton.tsx` | Email invitation trigger |
| `src/components/property/SignaturePad.tsx` | Electronic signature capture |
| `src/components/layout/TenantLayout.tsx` | Tenant portal layout |
| `src/components/layout/TenantSidebar.tsx` | Tenant navigation |
| `src/pages/tenant/TenantAuth.tsx` | Tenant login/signup |
| `src/pages/tenant/AcceptInvite.tsx` | Invitation acceptance flow |
| `src/pages/tenant/TenantDashboard.tsx` | Tenant home page |
| `src/pages/tenant/TenantLeases.tsx` | Lease list |
| `src/pages/tenant/TenantLeaseDetails.tsx` | View/sign lease |
| `src/pages/tenant/TenantPayments.tsx` | Payment management |
| `src/pages/tenant/TenantMaintenance.tsx` | Maintenance requests |
| `src/pages/tenant/TenantProfile.tsx` | Profile management |
| `supabase/functions/send-lease-invitation/index.ts` | Email invitation |
| `supabase/functions/generate-lease-pdf/index.ts` | Server-side PDF (optional) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add `tenant` to AppRole, new interfaces |
| `src/App.tsx` | Add tenant routes |
| `src/contexts/AuthContext.tsx` | Add `isTenant` check |
| `src/components/property/LeaseWizard.tsx` | Add invite button |
| `src/components/property/LeaseGenerationStep.tsx` | Add PDF export |
| `src/pages/property/Leases.tsx` | Add invite/export actions |
| `src/pages/property/Maintenance.tsx` | Support tenant submissions |

---

## Technical Notes

### PDF Generation Approach
Using client-side `jspdf` for simplicity:
- No server costs
- Instant generation
- Works offline
- Fallback: Edge function for server-side generation if needed

### Signature Implementation
- Canvas-based signature pad
- Stores as base64 PNG in database
- Typed signature option as fallback
- Legal attestation checkbox required

### Email Service Requirement
This feature requires configuring Resend:
- User needs RESEND_API_KEY secret
- Verified domain for professional emails
- Will prompt user to set up if not configured
