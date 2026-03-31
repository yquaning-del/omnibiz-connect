

# Platform Audit Report — Remaining Issues

## Findings Summary

After thorough review of all dashboards, payment flows, subscription gating, sidebar navigation, and data queries, here are the remaining issues organized by severity.

---

## 1. CRITICAL: Payment Gate Bypass (Subscription Plans)

**`SubscriptionPlans.tsx` lines 85-135**: The `handleSubscribe` function directly updates `organization_subscriptions` to `status: 'active'` without requiring payment. Any org_admin can click "Subscribe" on the Enterprise plan and get it activated for free — bypassing Paystack entirely.

The `PaystackCheckout` component exists but is never used by `SubscriptionPlans`. The flow skips payment completely.

**Fix**: Route all subscription changes through `PaystackCheckout`. Only allow the `paystack-webhook` edge function (server-side, signature-verified) to set `status: 'active'`. Remove direct client-side subscription activation.

---

## 2. CRITICAL: Cross-Tenant Data Leaks in Dashboards

### 2a. Retail Dashboard — Order Items Not Org-Scoped
`RetailDashboard.tsx` line 148-152 queries `order_items` with NO `organization_id` filter. Top products and category sales show data from ALL organizations:
```
supabase.from('order_items').select(...).order('created_at').limit(100)
```
**Fix**: Join through `orders` table or filter by order IDs belonging to the current org.

### 2b. Property Dashboard — Maintenance Not Org-Scoped
`PropertyDashboard.tsx` line 119-122 queries `maintenance_requests` with only `status: 'open'` — no org or location filter. Shows ALL open maintenance requests across the platform.
**Fix**: Add `.eq('organization_id', currentOrganization.id)` or filter by location.

---

## 3. MEDIUM: Dashboard Representation Issues

### 3a. Property Dashboard — Missing Revenue Charts
Unlike Retail (weekly sales trend), Restaurant (hourly + weekly revenue), Hotel (occupancy trend + weekly revenue), and Pharmacy (daily Rx volume + insurance claims), the Property Dashboard has NO charts or graphs. It only shows static cards and a recent activity list.

**Fix**: Add a rent collection trend chart (monthly) and an occupancy rate gauge to match the visual richness of other dashboards.

### 3b. Pharmacy Dashboard — `todayDispensed` Uses `created_at` Instead of `date_filled`
Line 153 checks `p.created_at.startsWith(today)` for dispensed prescriptions. A prescription created last week but dispensed today would NOT show in today's count. It should check `date_filled`.

**Fix**: Filter by `date_filled` instead of `created_at` for dispensed count.

---

## 4. MEDIUM: Module Configuration Gaps

### 4a. Billing Page Not Feature-Gated
The Billing/Folios page at `/billing` is hotel-specific but has no `requiredFeature` in the sidebar config and no `FeatureGate` wrapper. Any vertical user with the URL can access it even though it queries hotel-specific tables (`guest_folios`, `folio_charges`).

**Fix**: Add `requiredFeature: 'billing_folios'` to the sidebar nav and wrap with `FeatureGate`.

### 4b. Online Orders Not Feature-Gated
The `/online-orders` route appears in the sidebar for Restaurant and Retail but has no `requiredFeature`. This should be a Professional+ feature.

**Fix**: Add `requiredFeature: 'online_orders'` and register it in `FEATURE_TIERS`.

### 4c. Subscription Page Not Linked to PaystackCheckout
The entire subscription upgrade flow in `SubscriptionPlans.tsx` never opens `PaystackCheckout`. The Paystack integration exists but is disconnected from the actual upgrade path.

---

## 5. LOW: Admin Routes Not Super-Admin Guarded

Admin routes (`/admin/*`) are inside `AppLayout` which only checks for authentication. There's no `PermissionGate` or role check preventing a regular staff member from navigating to `/admin/users` or `/admin/organizations` via the URL bar. The sidebar hides admin links for non-super-admins, but the routes themselves are unprotected.

**Fix**: Wrap admin routes with a role guard that redirects non-super-admins.

---

## Implementation Plan

### Phase 1: Critical Security & Payment Fixes
1. **Fix subscription payment bypass** — Wire `SubscriptionPlans` to `PaystackCheckout`; remove direct DB activation
2. **Scope RetailDashboard order_items query** — Filter by org orders
3. **Scope PropertyDashboard maintenance query** — Add org filter

### Phase 2: Dashboard Accuracy & Completeness
4. **Fix PharmacyDashboard dispensed count** — Use `date_filled` instead of `created_at`
5. **Add charts to PropertyDashboard** — Rent trend + occupancy gauge
6. **Guard admin routes** — Add super_admin role check to `/admin/*` routes

### Phase 3: Module Gating
7. **Gate Billing page** — Add feature tier entry + sidebar requiredFeature
8. **Gate Online Orders** — Add feature tier entry + sidebar requiredFeature
9. **Register missing features** in `FEATURE_TIERS` map: `billing_folios`, `online_orders`

### Technical Details

**Files to modify:**
- `src/pages/subscription/SubscriptionPlans.tsx` — Replace direct DB update with PaystackCheckout flow
- `src/pages/dashboards/RetailDashboard.tsx` — Scope order_items query
- `src/pages/dashboards/PropertyDashboard.tsx` — Scope maintenance query + add charts
- `src/pages/dashboards/PharmacyDashboard.tsx` — Fix dispensed filter
- `src/contexts/SubscriptionContext.tsx` — Add `billing_folios` and `online_orders` to FEATURE_TIERS
- `src/components/layout/AppSidebar.tsx` — Add requiredFeature to Billing and Online Orders
- `src/App.tsx` — Add admin route guard

