# HospitalityOS Testing Guide

This document provides comprehensive testing credentials and scenarios for validating all modules across all business verticals and subscription tiers.

## Quick Start

To create all test users, first ensure you're logged in as a super admin, then call the edge function:

```bash
curl -X POST 'https://kjkmoxoossrtvxlywhro.supabase.co/functions/v1/create-test-users' \
  -H 'Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN' \
  -H 'Content-Type: application/json'
```

Or use the Admin Testing Panel in the app (Settings → Admin → Create Test Users).

---

## Test User Credentials

All test users share the same password: `Test123!`

### By Vertical (Org Admin Role)

| Vertical | Tier | Email | Features Available |
|----------|------|-------|-------------------|
| Restaurant | Starter | `restaurant.starter@test.com` | Basic POS, 5 tables, 1 location |
| Restaurant | Professional | `restaurant.pro@test.com` | + KDS, Staff scheduling, 3 locations |
| Restaurant | Enterprise | `restaurant.enterprise@test.com` | + API access, Unlimited |
| Hotel | Starter | `hotel.starter@test.com` | Basic reservations, 10 rooms |
| Hotel | Professional | `hotel.pro@test.com` | + Housekeeping, Guest services |
| Hotel | Enterprise | `hotel.enterprise@test.com` | + Channel manager, Unlimited |
| Pharmacy | Starter | `pharmacy.starter@test.com` | Basic inventory, OTC sales |
| Pharmacy | Professional | `pharmacy.pro@test.com` | + Prescriptions, Insurance |
| Pharmacy | Enterprise | `pharmacy.enterprise@test.com` | + Controlled substances, API |
| Retail | Starter | `retail.starter@test.com` | Basic POS, Inventory |
| Retail | Professional | `retail.pro@test.com` | + Staff, Multi-location |
| Retail | Enterprise | `retail.enterprise@test.com` | + E-commerce, Unlimited |

### By Role (Security Testing)

| Role | Email | Organization | Access Level |
|------|-------|--------------|--------------|
| Pharmacist | `pharmacist@test.com` | Test Pharmacy Pro | Patient data, Prescriptions, Controlled substances |
| Front Desk | `frontdesk@test.com` | Test Hotel Pro | Guest profiles, Reservations, Check-in/out |
| Location Manager | `manager@test.com` | Test Retail Pro | All location data, Staff, Reports |
| Staff | `staff@test.com` | Test Restaurant Pro | POS only, No sensitive data access |

---

## Test Scenarios

### 1. Restaurant Module

#### Starter Tier Tests
- [ ] Create a new order via POS
- [ ] Add items to order and process payment
- [ ] View daily sales report
- [ ] Attempt to access KDS (should show upgrade prompt)
- [ ] Try adding 6th table (should hit limit)

#### Professional Tier Tests
- [ ] All Starter tests pass
- [ ] Access Kitchen Display System
- [ ] Create staff schedule
- [ ] View weekly/monthly reports
- [ ] Create second location
- [ ] Table management up to 20 tables

#### Enterprise Tier Tests
- [ ] All Professional tests pass
- [ ] Access API documentation
- [ ] Unlimited tables
- [ ] Unlimited locations
- [ ] Advanced analytics dashboard

### 2. Hotel Module

#### Starter Tier Tests
- [ ] Create a room reservation
- [ ] Perform check-in process
- [ ] View room availability
- [ ] Attempt housekeeping module (should show upgrade)

#### Professional Tier Tests
- [ ] All Starter tests pass
- [ ] Access housekeeping management
- [ ] Guest services (room service, amenity requests)
- [ ] Guest profile management
- [ ] Folio and billing operations

#### Enterprise Tier Tests
- [ ] All Professional tests pass
- [ ] OTA channel management settings
- [ ] Rate management
- [ ] Unlimited rooms
- [ ] API access

### 3. Pharmacy Module

#### Starter Tier Tests
- [ ] Add medications to inventory
- [ ] Process OTC sale
- [ ] View basic reports
- [ ] Attempt prescription module (should show upgrade)

#### Professional Tier Tests
- [ ] All Starter tests pass
- [ ] Create and fill prescriptions
- [ ] Patient profile management
- [ ] Drug interaction checking
- [ ] Insurance claim submission

#### Enterprise Tier Tests
- [ ] All Professional tests pass
- [ ] Controlled substance tracking
- [ ] Advanced compliance reports
- [ ] API integration
- [ ] Multi-location inventory sync

### 4. Retail Module

#### Starter Tier Tests
- [ ] Add products to inventory
- [ ] Process sale via POS
- [ ] Customer management
- [ ] Basic inventory reports

#### Professional Tier Tests
- [ ] All Starter tests pass
- [ ] Staff management
- [ ] Multi-location support (up to 3)
- [ ] Inventory transfers
- [ ] Advanced analytics

#### Enterprise Tier Tests
- [ ] All Professional tests pass
- [ ] Unlimited locations
- [ ] API access
- [ ] White-label options
- [ ] E-commerce integration settings

---

## Security & RLS Testing

### Role-Based Access Testing

#### Test as Pharmacist (`pharmacist@test.com`)
```
✓ CAN view patient profiles
✓ CAN view/create prescriptions
✓ CAN view controlled substance logs
✓ CAN access medication database
✗ CANNOT view payment transactions
✗ CANNOT access other org's data
```

#### Test as Front Desk (`frontdesk@test.com`)
```
✓ CAN view guest profiles
✓ CAN perform check-in/check-out
✓ CAN view reservations
✓ CAN create folio charges
✗ CANNOT access payment transaction history
✗ CANNOT access controlled substances
```

#### Test as Manager (`manager@test.com`)
```
✓ CAN view all location data
✓ CAN manage staff
✓ CAN view financial reports
✓ CAN access customer data
✗ CANNOT access other locations
✗ CANNOT access super admin functions
```

#### Test as Staff (`staff@test.com`)
```
✓ CAN use POS system
✓ CAN view product inventory
✓ CAN create orders
✗ CANNOT view customer contact info
✗ CANNOT access financial reports
✗ CANNOT manage staff
```

### Cross-Organization Access Testing

1. Login as `restaurant.pro@test.com`
2. Note the organization ID from the URL
3. Attempt to access data from hotel organization via API
4. **Expected**: Request should be denied by RLS policies

### SQL Injection Testing

1. In search fields, attempt: `'; DROP TABLE products; --`
2. In form fields, attempt: `<script>alert('xss')</script>`
3. **Expected**: All inputs should be properly sanitized

---

## Sample Data Reference

Each test organization includes pre-seeded sample data:

### Restaurant Organizations
- 5 menu items (Jollof Rice, Grilled Tilapia, etc.)
- 5 restaurant tables
- 3 sample customers

### Hotel Organizations
- 5 hotel rooms (Standard, Deluxe, Suite)
- Room amenities configured
- Guest profiles

### Pharmacy Organizations
- 5 medications in database
- Stock quantities
- Prescription templates

### Retail Organizations
- 5 products across categories
- Inventory levels
- Customer records

---

## Troubleshooting

### "User not found" errors
Run the create-test-users edge function again to recreate missing users.

### "Permission denied" errors
Check that:
1. User is properly authenticated
2. User has correct role assigned in user_roles table
3. RLS policies are not blocking access

### "Organization not found"
Verify the organization subscription is active and not expired.

### Missing sample data
The create-test-users function creates sample data automatically. Re-run if data is missing.

---

## Quick Reference Card

| Need to test... | Use this login |
|-----------------|----------------|
| Full feature access | `restaurant.enterprise@test.com` |
| Feature gating (limited) | `retail.starter@test.com` |
| Pharmacy workflows | `pharmacy.pro@test.com` |
| Hotel operations | `hotel.pro@test.com` |
| RLS security (pharmacist) | `pharmacist@test.com` |
| RLS security (front desk) | `frontdesk@test.com` |
| RLS security (manager) | `manager@test.com` |
| RLS security (restricted) | `staff@test.com` |

**Password for all accounts: `Test123!`**
