# Navigation Audit — Findings & Fix Plan

Audited every layout (`AppLayout`, `AppSidebar`, `AdminLayout`, `TenantLayout`, `PublicLayout`, `PublicHeader`), the `CommandPalette`, and cross‑checked every entry against the routes registered in `src/App.tsx`.

## Issues Found

### 1. Admin Panel — `UAT Setup` route is unreachable from UI
`/admin/uat-setup` is registered in `App.tsx` but is **not** listed in `adminNavItems` inside `src/components/admin/AdminLayout.tsx`. Super admins can only reach it by typing the URL.

### 2. App Sidebar — `Subscription` page has no nav entry
`/subscription` is a first‑class route (used by Trial overlay + locked‑feature redirects), but is missing from the Management group in `src/components/layout/AppSidebar.tsx`. Users currently can only land on it by clicking a locked icon or the Trial Badge.

### 3. Command Palette — many real routes are missing
`src/components/ui/command-palette.tsx` only knows about a small subset of routes. Missing per vertical:
- **Hotel:** Maintenance, Guest Services, Guest Profiles, Billing & Folios
- **Pharmacy:** Insurance, Controlled Substances, Drug Interactions
- **Retail:** Online Orders
- **Restaurant:** Online Orders
- **Property:** entire vertical is absent (Units, Tenants, Leases, Rent Collection, Applications, Maintenance, Reports)
- **Common:** Staff, Subscription
- **Admin (super_admin only):** Dashboard, Organizations, Users, Subscriptions, Support, Analytics, Audit Logs, UAT Setup

### 4. App Sidebar — Restaurant `Online Orders` shown to retail+restaurant only
Correct — confirmed. No change needed.

### 5. Tenant Layout — nav matches routes
Confirmed: Dashboard, Leases, Payments, Maintenance, Profile all exist and route. No change.

### 6. Public footer / PublicLayout
Previously audited and fixed (About/FAQ/Contact anchors). No new gaps detected this pass.

## Fix Plan

**A. `src/components/admin/AdminLayout.tsx`**
- Add `{ path: "/admin/uat-setup", label: "UAT Setup", icon: ClipboardCheck }` to `adminNavItems` (placed after Audit Logs).

**B. `src/components/layout/AppSidebar.tsx`**
- Add a `Subscription` entry to the `management` array (icon: `CreditCard`, between Reports and Settings). It is universally needed and not feature‑gated.

**C. `src/components/ui/command-palette.tsx`**
- Extend `verticalSpecific` with the missing per‑vertical entries listed above.
- Add a `property` key with its 7 routes.
- Add `Staff` and `Subscription` to the common section.
- Add a new `adminItems` array rendered only when `hasRole('super_admin')`, containing the 8 admin routes.
- Add `Online Orders` to retail + restaurant lists.

No backend, schema, or business‑logic changes. Pure presentation / navigation wiring.

## Verification

- Re‑read each modified file after edit.
- Cross‑check every new `path` against `App.tsx` Route table to ensure no dead links.
- Manually open `/admin/uat-setup` via the new sidebar entry and `/subscription` via the new App sidebar entry in the preview to confirm they render.
