
# Lease Management Actions Implementation

## Problem Summary

The Leases page currently displays lease cards without any actionable features. Users cannot:
1. Download leases as PDF or Word documents
2. Send invitations to tenants for electronic signing
3. Edit/revise leases
4. Delete leases
5. Change lease status (e.g., mark as expired)

The components `LeaseExportButton` and `InviteTenantButton` exist but are not integrated into the Leases page.

---

## Solution Architecture

```text
+------------------+     Click Lease     +---------------------+
|   Leases List    | ------------------> |   LeaseDetailPanel  |
|   (Existing)     |                     |   (New Component)   |
+------------------+                     +---------------------+
                                                  |
                            +---------------------+---------------------+
                            |                     |                     |
                            v                     v                     v
                    +-------------+       +---------------+      +-----------+
                    | Actions     |       | Export        |      | Invite    |
                    | (Edit/Del)  |       | (PDF/Word)    |      | Tenant    |
                    +-------------+       +---------------+      +-----------+
```

---

## Phase 1: Lease Detail Panel (Slide-over)

### New Component: `LeaseDetailPanel.tsx`
**Location:** `src/components/property/LeaseDetailPanel.tsx`

A slide-over panel that appears when clicking a lease card, showing:
- Full lease details (dates, rent, deposit, terms)
- Tenant and unit information
- Status badge with option to change
- All generated clauses (if available from `lease_document`)
- Action buttons (edit, delete, export, invite)

---

## Phase 2: Action Buttons Integration

### Export Options
Integrate existing `LeaseExportButton` for PDF export and add Word export capability:

1. **PDF Export** - Already built, needs integration with lease data from database
2. **Word Export** - New functionality using a library like `docx` to generate .docx files

### Invite to Sign
Integrate existing `InviteTenantButton` with:
- Tenant email from lease/tenant relationship
- Property address from unit
- Monthly rent from lease

### Status Management
Add ability to:
- Mark lease as "expired"
- Mark lease as "terminated"
- Revert to "active" if within date range

### Edit Lease
- Open lease wizard in edit mode with pre-filled data
- Allow updating terms, dates, rent, special terms
- Regenerate clauses if location/terms change

### Delete Lease
- Confirmation dialog before deletion
- Only allow deletion of draft or expired leases
- Active leases require termination first

---

## Phase 3: Email Invitation Setup

### Required Secret
The email invitation system requires `RESEND_API_KEY` to be configured. This will be requested from the user before the invitation feature works.

---

## Implementation Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/property/LeaseDetailPanel.tsx` | Slide-over panel for viewing lease details and actions |
| `src/components/property/LeaseWordExport.tsx` | Word document export button |
| `src/components/property/LeaseStatusManager.tsx` | Status change dropdown |
| `src/components/property/DeleteLeaseDialog.tsx` | Confirmation dialog for deletion |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/property/Leases.tsx` | Add click handler on lease cards, integrate detail panel |
| `src/components/property/LeaseWizard.tsx` | Support edit mode with existing lease data |
| `src/components/property/LeaseExportButton.tsx` | Accept lease data directly from database format |
| `package.json` | Add `docx` library for Word export |

---

## Technical Details

### Lease Detail Panel Features

1. **Header Section**
   - Lease number and status badge
   - Close button

2. **Overview Cards**
   - Property info (unit, address, type)
   - Tenant info (name, email, phone)
   - Dates (start, end, signing status)
   - Financials (rent, deposit, late fee)

3. **Action Bar**
   - Download PDF / Download Word buttons
   - Invite Tenant button (if not signed)
   - Edit button (opens wizard in edit mode)
   - More menu (status change, delete)

4. **Clauses Section**
   - Accordion of all clause sections from `lease_document`
   - Read-only view of generated content

### Word Export Implementation

Using the `docx` library to create professional Word documents:
- Same structure as PDF export
- Editable format for offline modifications
- Headers, paragraphs, signature blocks

### Edit Mode for Lease Wizard

Modify `LeaseWizard` to accept an `existingLease` prop:
- Pre-populate all form fields
- Skip steps with existing data (or show as read-only)
- Update instead of insert on submit
- Preserve or regenerate clauses based on changes

### Status Transitions

| Current Status | Allowed Transitions |
|----------------|---------------------|
| draft | active, delete |
| active | expired, terminated |
| pending_signature | active, expired, terminated |
| expired | (no transitions, archived) |
| terminated | (no transitions, archived) |

---

## Database Queries Needed

### Fetch Lease with Related Data
```sql
SELECT 
  l.*,
  t.first_name, t.last_name, t.email, t.phone,
  u.unit_number, u.address, u.city, u.state, u.country
FROM leases l
LEFT JOIN tenants t ON l.tenant_id = t.id
LEFT JOIN property_units u ON l.unit_id = u.id
WHERE l.id = :leaseId
```

### Update Lease Status
```sql
UPDATE leases 
SET status = :newStatus, updated_at = now()
WHERE id = :leaseId AND organization_id = :orgId
```

### Delete Lease
```sql
DELETE FROM leases 
WHERE id = :leaseId 
  AND organization_id = :orgId 
  AND status IN ('draft', 'expired', 'terminated')
```

---

## UI/UX Considerations

1. **Lease Card Click** - Opens detail panel from right side (Sheet component)
2. **Action Grouping** - Primary actions visible, secondary in dropdown
3. **Status Colors** - Keep existing color scheme for consistency
4. **Confirmation** - Required for destructive actions (delete, terminate)
5. **Loading States** - Show skeleton while fetching full lease details

---

## Implementation Order

| Step | Components | Priority |
|------|------------|----------|
| 1 | LeaseDetailPanel with basic info display | High |
| 2 | Integrate existing export/invite buttons | High |
| 3 | Status management dropdown | High |
| 4 | Delete confirmation dialog | Medium |
| 5 | Word export functionality | Medium |
| 6 | Edit mode for LeaseWizard | Medium |
| 7 | Request RESEND_API_KEY for invitations | High |

---

## Dependencies

### New Package
- `docx` - For Word document generation

### Existing Components to Reuse
- `LeaseExportButton` - PDF generation
- `InviteTenantButton` - Email invitations
- `Sheet` from shadcn/ui - Slide-over panel
- `AlertDialog` - Confirmation dialogs
- `DropdownMenu` - Status change and more actions
