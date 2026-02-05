
# Business Website Deployment System

## Overview
This plan implements a comprehensive system that allows businesses to deploy their own live public-facing websites that automatically sync with their selected module (Restaurant, Hotel, Retail, Pharmacy, Property). Each business gets a branded website accessible via their organization slug.

## Current State Analysis

### What Already Exists
1. **E-commerce Store** (`/store/:orgSlug`) - Public storefront for Retail/Restaurant
2. **Customer Menu** (`/menu/:orgSlug/:locationId`) - QR ordering for Restaurants
3. **Tenant Portal** (`/tenant/*`) - Self-service portal for Property tenants
4. **Organization Slug System** - Each org has a unique slug used for routing

### What's Missing
1. **Hotel Booking Portal** - Public room booking interface
2. **Pharmacy Refill Portal** - Patient prescription refill requests
3. **Property Listings Portal** - Available units showcase
4. **Unified Website Hub** - Central entry point that routes to vertical-specific sites
5. **Website Settings** - Admin controls for public site customization
6. **Custom Domain Support** - Instructions/setup for custom domains

## Implementation Plan

### Phase 1: Create Vertical-Specific Public Portals

#### 1.1 Hotel Booking Portal
**Route**: `/book/:orgSlug`

**Features**:
- Public room availability search by dates
- Room type display with photos, amenities, pricing
- Real-time availability from `hotel_rooms` table
- Direct booking form creating reservations
- Guest information collection
- Integration with existing reservation system

**Files to Create**:
- `src/pages/public/HotelBooking.tsx` - Main booking page
- `src/components/public/RoomCard.tsx` - Room display component
- `src/components/public/BookingCalendar.tsx` - Date picker with availability
- `src/components/public/GuestInfoForm.tsx` - Booking form

#### 1.2 Pharmacy Refill Portal  
**Route**: `/pharmacy/:orgSlug/refills`

**Features**:
- Patient login/registration
- Prescription history view
- Refill request submission
- Status tracking
- Syncs with existing `prescriptions` and patient tables

**Files to Create**:
- `src/pages/public/PharmacyRefillPortal.tsx` - Patient refill interface
- `src/components/public/PrescriptionCard.tsx` - Rx display
- `src/components/public/RefillStatus.tsx` - Request tracking

#### 1.3 Property Listings Portal
**Route**: `/rentals/:orgSlug`

**Features**:
- Available units showcase
- Unit details with photos, amenities, pricing
- Rental application submission
- Syncs with `property_units` and `tenant_applications` tables

**Files to Create**:
- `src/pages/public/PropertyListings.tsx` - Available units grid
- `src/components/public/UnitListingCard.tsx` - Unit display
- `src/components/public/RentalApplication.tsx` - Application form

### Phase 2: Unified Business Website Hub

#### 2.1 Business Homepage
**Route**: `/site/:orgSlug`

**Features**:
- Auto-detects vertical and displays appropriate content
- Restaurant: Menu + Order online
- Hotel: Rooms + Book now
- Retail: Products + Shop online
- Pharmacy: Services + Refill prescriptions
- Property: Available rentals + Apply

**File to Create**:
- `src/pages/public/BusinessSite.tsx` - Smart hub that routes based on vertical

#### 2.2 Update App.tsx Routes
Add new public routes under `/site/*`, `/book/*`, `/rentals/*`, `/pharmacy/:orgSlug/refills`

### Phase 3: Website Settings in Admin Dashboard

#### 3.1 Website Configuration Panel
**Location**: Settings page, new "Website" tab

**Features**:
- Toggle public website on/off
- Customize hero text/tagline
- Upload cover/banner images
- Set contact information
- Social media links
- Business hours display
- Theme color selection
- SEO metadata (title, description)

**Files to Create/Modify**:
- `src/components/settings/WebsiteSettings.tsx` - Website config UI
- Modify `src/pages/Settings.tsx` - Add Website tab
- Update `organizations.settings` JSON to include website config

#### 3.2 Website Preview Link
- Add "View My Website" button in settings
- Show shareable link: `yourapp.com/site/org-slug`

### Phase 4: Sidebar Navigation Updates

#### 4.1 Add Module Access Links

| Vertical | New Sidebar Link | Route |
|----------|------------------|-------|
| Restaurant | Customer Menu | External link to `/menu/:orgSlug/:locationId` |
| Restaurant/Retail | Online Store | External link to `/store/:orgSlug` |
| Hotel | Booking Page | External link to `/book/:orgSlug` |
| Property | Public Listings | External link to `/rentals/:orgSlug` |
| Pharmacy | Patient Portal | External link to `/pharmacy/:orgSlug/refills` |

**File to Modify**:
- `src/components/layout/AppSidebar.tsx` - Add "My Website" section with external links

### Phase 5: Data Synchronization

All public portals will use the existing database tables with appropriate RLS policies:

| Portal | Data Source | Sync Method |
|--------|-------------|-------------|
| Store | `products` (is_active + available_online) | Real-time |
| Menu | `products` (is_active) | Real-time |
| Booking | `hotel_rooms`, `reservations` | Real-time availability |
| Listings | `property_units` (status = 'available') | Real-time |
| Refills | `prescriptions`, `patient_profiles` | Authenticated |

### Phase 6: Custom Domain Documentation

Add documentation/help text in Website Settings explaining:
1. How Lovable custom domains work
2. DNS configuration requirements
3. SSL auto-provisioning

## File Structure Summary

```text
src/pages/public/
├── BusinessSite.tsx        # Smart hub page
├── HotelBooking.tsx        # Room booking
├── PropertyListings.tsx    # Rental listings
└── PharmacyRefillPortal.tsx # Patient refills

src/components/public/
├── PublicHeader.tsx        # Shared header for public pages
├── RoomCard.tsx            # Hotel room display
├── BookingCalendar.tsx     # Date availability picker
├── GuestInfoForm.tsx       # Booking form
├── UnitListingCard.tsx     # Property unit card
├── RentalApplication.tsx   # Application form
├── PrescriptionCard.tsx    # Rx display
└── RefillStatus.tsx        # Status tracker

src/components/settings/
└── WebsiteSettings.tsx     # Website configuration

Modified files:
├── src/App.tsx             # New routes
├── src/pages/Settings.tsx  # Website tab
└── src/components/layout/AppSidebar.tsx # My Website links
```

## Database Considerations

The `organizations.settings` JSONB column will be extended to include:

```json
{
  "website": {
    "enabled": true,
    "heroTitle": "Welcome to Our Business",
    "heroSubtitle": "Quality service since 2020",
    "coverImage": "url-to-image",
    "contactEmail": "info@business.com",
    "contactPhone": "+1234567890",
    "socialLinks": {
      "facebook": "...",
      "instagram": "...",
      "twitter": "..."
    },
    "businessHours": {...},
    "seoTitle": "...",
    "seoDescription": "..."
  }
}
```

No new tables required - leveraging existing settings JSON.

## Implementation Order

1. ✅ **Phase 1.1**: Hotel Booking Portal - `/book/:orgSlug`
2. ✅ **Phase 1.3**: Property Listings Portal - `/rentals/:orgSlug`
3. ✅ **Phase 1.2**: Pharmacy Refill Portal - `/pharmacy/:orgSlug/refills`
4. ✅ **Phase 2**: Business Site Hub - `/site/:orgSlug`
5. ✅ **Phase 3**: Website Settings - Settings → Website tab
6. ✅ **Phase 4**: Sidebar Updates (external links per vertical)
7. ⏳ **Phase 5**: Ensure all syncs work correctly
8. ⏳ **Phase 6**: Custom domain documentation

## Technical Notes

- All public pages use the organization slug to fetch data
- RLS policies allow anonymous SELECT on public-facing data
- Website enable/disable toggle respects `settings.website.enabled`
- Mobile-responsive design for all public pages (Africa-First strategy)
- Offline-capable where possible using existing service worker

