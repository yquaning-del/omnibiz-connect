# HospitalityOS User Manual

**Version 1.0** | **Last Updated: January 2026**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Navigation and Interface](#3-navigation-and-interface)
4. [Core Modules](#4-core-modules)
5. [Restaurant Module](#5-restaurant-module)
6. [Hotel Module](#6-hotel-module)
7. [Pharmacy Module](#7-pharmacy-module)
8. [Retail Module](#8-retail-module)
9. [Settings and Configuration](#9-settings-and-configuration)
10. [Subscription Plans](#10-subscription-plans)
11. [Super Admin Dashboard](#11-super-admin-dashboard)
12. [User Engagement Features](#12-user-engagement-features)
13. [Appendices](#13-appendices)

---

## 1. Introduction

### 1.1 Platform Overview

HospitalityOS is an enterprise-level, multi-tenant SaaS platform designed to serve four distinct business verticals:

| Vertical | Description |
|----------|-------------|
| **Restaurant** | Full-service dining operations with table management and kitchen display |
| **Hotel** | Comprehensive property management with front desk and housekeeping |
| **Pharmacy** | Prescription management with drug interaction checking and compliance |
| **Retail** | General retail and grocery operations with POS and inventory |

### 1.2 Key Features

- **Multi-Tenant Architecture**: Each organization operates in complete isolation
- **Multi-Location Support**: Manage multiple business locations from one account
- **Role-Based Access Control**: Granular permissions for team members
- **Real-Time Updates**: Live data synchronization across all devices
- **Vertical-Specific Features**: Specialized tools for each business type

### 1.3 System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge - latest versions)
- Stable internet connection
- Minimum screen resolution: 1024x768 (responsive design for mobile)

---

## 2. Getting Started

### 2.1 Account Creation

1. Navigate to the HospitalityOS landing page
2. Click **"Start Free Trial"** or **"Get Started"**
3. Enter your email address and create a password
4. Verify your email address (if required)
5. You will be redirected to the onboarding wizard

### 2.2 Onboarding Wizard

The onboarding process consists of three steps:

#### Step 1: Business Information

| Field | Description | Required |
|-------|-------------|----------|
| Business Name | Your organization's name | Yes |
| Business Type | Select from Restaurant, Hotel, Pharmacy, or Retail | Yes |

#### Step 2: Location Setup

| Field | Description | Required |
|-------|-------------|----------|
| Location Name | Name of your first business location | Yes |
| Address | Physical address | No |
| City | City name | No |
| Country | Country selection | No |
| Phone | Contact phone number | No |
| Email | Location email address | No |

#### Step 3: Plan Selection

All new accounts start with a **14-day free trial** of the Professional plan. You can:
- Continue with the trial
- Select a different plan
- Upgrade or downgrade at any time

### 2.3 First Login

After completing onboarding:
1. You'll be redirected to your vertical-specific dashboard
2. The **Product Tour** will automatically start (can be skipped)
3. The **Setup Checklist** appears on your dashboard to guide initial setup

---

## 3. Navigation and Interface

### 3.1 Dashboard Overview

Each business vertical has a specialized dashboard displaying relevant KPIs:

#### Restaurant Dashboard
- Today's Revenue
- Active Tables
- Pending Orders
- Average Order Value

#### Hotel Dashboard
- Today's Revenue
- Room Occupancy Rate
- Check-ins Today
- Check-outs Today

#### Pharmacy Dashboard
- Today's Revenue
- Pending Prescriptions
- Ready for Pickup
- Controlled Substances Dispensed

#### Retail Dashboard
- Today's Revenue
- Orders Today
- Low Stock Items
- Top Selling Products

### 3.2 Sidebar Navigation

The sidebar dynamically adapts based on your current location's business vertical:

#### Common Navigation Items (All Verticals)
| Menu Item | Description |
|-----------|-------------|
| Dashboard | Main overview with KPIs |
| POS | Point of Sale terminal |
| Products | Product catalog management |
| Inventory | Stock management |
| Customers | Customer database |
| Orders | Order history and tracking |
| Reports | Sales analytics |
| Staff | Team management |
| Settings | Configuration options |

#### Restaurant-Specific Items
| Menu Item | Description |
|-----------|-------------|
| Tables | Floor plan and table management |
| Kitchen | Kitchen Display System (KDS) |
| Reservations | Table reservations |

#### Hotel-Specific Items
| Menu Item | Description |
|-----------|-------------|
| Front Desk | Check-in/out operations |
| Rooms | Room inventory management |
| Reservations | Room reservations |
| Housekeeping | Cleaning task management |
| Maintenance | Work order tracking |
| Guest Services | Room service and amenities |
| Guest Profiles | Guest history and preferences |
| Billing | Folio management |

#### Pharmacy-Specific Items
| Menu Item | Description |
|-----------|-------------|
| Prescriptions | Prescription queue and management |
| Patients | Patient profile database |
| Medications | Drug database |
| Interactions | Drug interaction checker |
| Controlled | Controlled substance log |
| Insurance | Insurance claim tracking |

### 3.3 Location Switcher

Located in the sidebar header, the Location Switcher allows you to:
- View your current location
- Switch between locations (if you have multiple)
- See the location's business vertical

**To switch locations:**
1. Click on the current location name in the sidebar
2. Select the desired location from the dropdown
3. The interface will update to reflect the new location's vertical

### 3.4 Header Components

| Component | Location | Description |
|-----------|----------|-------------|
| Notification Bell | Top right | Access notification center |
| User Menu | Top right | Profile, settings, and logout |

---

## 4. Core Modules

These modules are available across all business verticals.

### 4.1 Point of Sale (POS)

The POS module provides a complete sales terminal for processing transactions.

#### 4.1.1 Interface Layout

| Section | Description |
|---------|-------------|
| Product Grid | Displays available products with images and prices |
| Search Bar | Search products by name |
| Category Filter | Filter products by category |
| Cart | Current transaction items |
| Order Summary | Subtotal, discounts, tax, and total |

#### 4.1.2 Processing a Sale

1. **Add Products to Cart**
   - Click on a product in the grid to add it
   - Use the search bar to find specific items
   - Filter by category for faster browsing

2. **Adjust Quantities**
   - Click the **+** button to increase quantity
   - Click the **-** button to decrease quantity
   - Click the **trash** icon to remove the item

3. **Apply Discounts**
   - Click **"Apply Discount"**
   - Choose discount type (percentage or fixed amount)
   - Enter the discount value
   - Click **"Apply"**

4. **Select Customer** (Optional)
   - Click **"Add Customer"**
   - Search for existing customer or create new
   - Customer loyalty points will be displayed

5. **Complete Sale**
   - Click **"Checkout"**
   - Select payment method:
     - Cash
     - Card
     - Mobile Money (country-specific)
   - Complete payment
   - Receipt is generated automatically

#### 4.1.3 Tax Calculation

- Default tax rate: **10%**
- Tax is calculated automatically on subtotal
- Formula: `Tax = (Subtotal - Discount) × 0.10`

#### 4.1.4 Stock Updates

- Stock quantities are automatically reduced after successful sale
- Low stock warnings appear when threshold is reached
- Out of stock products are flagged in the grid

### 4.2 Products

Manage your product catalog with full CRUD operations.

#### 4.2.1 Product List

| Column | Description |
|--------|-------------|
| Image | Product thumbnail |
| Name | Product name |
| SKU | Stock Keeping Unit (optional) |
| Category | Product category |
| Price | Selling price |
| Stock | Current quantity |
| Status | Active/Inactive |

#### 4.2.2 Creating a Product

1. Click **"Add Product"**
2. Fill in required fields:

| Field | Description | Required |
|-------|-------------|----------|
| Name | Product name | Yes |
| Description | Product description | No |
| SKU | Stock Keeping Unit | No |
| Barcode | Product barcode | No |
| Category | Product category | No |
| Unit Price | Selling price | Yes |
| Cost Price | Purchase cost | No |
| Stock Quantity | Initial stock | No |
| Low Stock Threshold | Alert threshold | No |
| Tax Rate | Product-specific tax | No |

3. Upload product image (optional)
4. Click **"Save Product"**

#### 4.2.3 Editing a Product

1. Click on the product row or the edit icon
2. Modify desired fields
3. Click **"Update Product"**

#### 4.2.4 Deleting a Product

1. Click the delete icon on the product row
2. Confirm deletion in the dialog
3. Product is permanently removed

> **Note:** Deleting a product does not affect historical order data.

### 4.3 Inventory

Monitor and adjust stock levels across your product catalog.

#### 4.3.1 Inventory Overview

| Metric | Description |
|--------|-------------|
| Total Products | Number of products in catalog |
| Low Stock | Products below threshold |
| Out of Stock | Products with zero quantity |
| Total Value | Sum of (stock × cost price) |

#### 4.3.2 Stock Status Indicators

| Status | Color | Description |
|--------|-------|-------------|
| In Stock | Green | Quantity above threshold |
| Low Stock | Orange | Quantity at or below threshold |
| Out of Stock | Red | Quantity is zero |

#### 4.3.3 Adjusting Stock

1. Find the product in the inventory list
2. Click **"Adjust Stock"**
3. Select adjustment type:
   - **Add**: Increase stock (receiving inventory)
   - **Remove**: Decrease stock (damaged, expired, theft)
4. Enter quantity
5. Add notes (optional)
6. Click **"Save"**

#### 4.3.4 Searching Inventory

Use the search bar to find products by:
- Product name
- SKU
- Barcode

### 4.4 Customers

Maintain a database of your customers with contact information and loyalty tracking.

#### 4.4.1 Customer List

| Column | Description |
|--------|-------------|
| Name | Customer full name |
| Email | Email address |
| Phone | Phone number |
| Loyalty Points | Accumulated points |
| Created | Account creation date |

#### 4.4.2 Creating a Customer

1. Click **"Add Customer"**
2. Fill in customer information:

| Field | Description | Required |
|-------|-------------|----------|
| Full Name | Customer's name | Yes |
| Email | Email address | No |
| Phone | Phone number | No |
| Address | Physical address | No |
| Notes | Internal notes | No |

3. Click **"Save Customer"**

#### 4.4.3 Loyalty Points

- Points are automatically tracked per customer
- Can be used for discounts (implementation varies)
- Points history is maintained

### 4.5 Orders

View and manage all orders placed through the system.

#### 4.5.1 Order List

| Column | Description |
|--------|-------------|
| Order # | Unique order number |
| Date | Order date and time |
| Customer | Customer name (if assigned) |
| Items | Number of items |
| Total | Order total amount |
| Status | Current order status |
| Payment | Payment status |

#### 4.5.2 Order Statuses

| Status | Description |
|--------|-------------|
| Pending | Order placed, awaiting processing |
| Processing | Order being prepared |
| Completed | Order fulfilled |
| Cancelled | Order cancelled |

#### 4.5.3 Filtering Orders

Use the status filter to view:
- All Orders
- Pending
- Processing
- Completed
- Cancelled

#### 4.5.4 Order Details

Click on an order to view:
- Order items with quantities and prices
- Subtotal, discounts, tax breakdown
- Payment method and status
- Order notes
- Timestamps

### 4.6 Reports

Access sales analytics and export data for external analysis.

#### 4.6.1 Dashboard Metrics

| Metric | Description |
|--------|-------------|
| Total Revenue | Sum of completed orders |
| Total Orders | Number of orders |
| Average Order Value | Revenue ÷ Orders |
| Unique Customers | Distinct customers served |

#### 4.6.2 Date Range Selection

| Range | Period |
|-------|--------|
| 7 Days | Last 7 days |
| 14 Days | Last 14 days |
| 30 Days | Last 30 days (Pro) |
| 90 Days | Last 90 days (Pro) |

> **Note:** 30-day and 90-day ranges require Professional plan or higher.

#### 4.6.3 Charts

| Chart | Description |
|-------|-------------|
| Sales Over Time | Bar chart showing daily revenue |
| Orders Over Time | Line chart showing order volume |

#### 4.6.4 CSV Export

1. Select desired date range
2. Click **"Export CSV"**
3. File downloads automatically with columns:
   - Order Number
   - Date
   - Customer
   - Items
   - Subtotal
   - Tax
   - Total
   - Status

### 4.7 Staff Management

Manage team members, roles, and permissions.

#### 4.7.1 Team Member List

| Column | Description |
|--------|-------------|
| Name | Staff member name |
| Email | Email address |
| Role | Assigned role |
| Status | Active/Suspended |
| Joined | Date added |

#### 4.7.2 Role Hierarchy

| Role | Permissions |
|------|-------------|
| Super Admin | Full platform access (platform owners only) |
| Org Admin | Full organization access, user management |
| Location Manager | Full location access, limited user management |
| Department Lead | Department-specific access |
| Staff | Basic operational access |

#### 4.7.3 Inviting Team Members

1. Click **"Invite Member"**
2. Enter email address
3. Select role
4. Click **"Send Invitation"**
5. Member receives email invitation

> **Note:** User limits apply based on subscription plan.

#### 4.7.4 Managing Roles

1. Find the team member
2. Click on their role
3. Select new role from dropdown
4. Confirm change

#### 4.7.5 Staff Scheduling

View upcoming shifts for team members:
- Shift date and time
- Assigned location
- Shift duration

---

## 5. Restaurant Module

Specialized features for restaurant operations.

### 5.1 Table Management

Visual floor plan for managing dining tables.

#### 5.1.1 Table Grid

Tables are displayed as cards showing:
- Table number
- Capacity (seats)
- Current status
- Shape (square/round)

#### 5.1.2 Table Statuses

| Status | Color | Description |
|--------|-------|-------------|
| Available | Green | Ready for seating |
| Occupied | Blue | Currently in use |
| Reserved | Purple | Reserved for future guest |
| Cleaning | Orange | Being cleaned |

#### 5.1.3 Creating a Table

1. Click **"Add Table"**
2. Enter table details:

| Field | Description | Required |
|-------|-------------|----------|
| Table Number | Unique identifier | Yes |
| Capacity | Number of seats | Yes |
| Shape | Square or Round | No |
| Notes | Additional info | No |

3. Click **"Save Table"**

#### 5.1.4 Updating Table Status

1. Click on a table card
2. Select new status from dropdown
3. Status updates immediately

### 5.2 Kitchen Display System (KDS)

Real-time order management for kitchen staff.

#### 5.2.1 Kanban Board

Orders are organized in three columns:

| Column | Description |
|--------|-------------|
| New Orders | Recently placed, not started |
| In Progress | Currently being prepared |
| Ready | Completed, awaiting pickup |

#### 5.2.2 Order Cards

Each order card displays:
- Order number
- Table number (if applicable)
- Order items with quantities
- Special notes
- Time since order placed
- Action buttons

#### 5.2.3 Processing Orders

1. **Start Order**: Click to move from "New" to "In Progress"
2. **Complete Order**: Click to move from "In Progress" to "Ready"
3. **Mark Served**: Click to mark as served and remove from board

#### 5.2.4 Real-Time Updates

- Orders appear automatically when placed
- Status changes sync across all devices
- No manual refresh required

### 5.3 Reservations

Manage table reservations for guests.

#### 5.3.1 Reservation Calendar

- 7-day view with date navigation
- Reservations displayed by time slot
- Color-coded by status

#### 5.3.2 Reservation Statuses

| Status | Color | Description |
|--------|-------|-------------|
| Confirmed | Green | Reservation confirmed |
| Pending | Yellow | Awaiting confirmation |
| Cancelled | Red | Cancelled by guest or staff |
| Completed | Gray | Guest has dined |

#### 5.3.3 Creating a Reservation

1. Click **"New Reservation"**
2. Enter reservation details:

| Field | Description | Required |
|-------|-------------|----------|
| Guest Name | Name for reservation | Yes |
| Date | Reservation date | Yes |
| Time | Reservation time | Yes |
| Party Size | Number of guests | Yes |
| Phone | Contact number | No |
| Email | Email address | No |
| Table | Assigned table | No |
| Notes | Special requests | No |

3. Click **"Save Reservation"**

#### 5.3.4 Managing Reservations

- Click on a reservation to view details
- Update status as guest arrives
- Assign or change table
- Cancel with reason

---

## 6. Hotel Module

Comprehensive property management features.

### 6.1 Front Desk

Central hub for guest check-in and check-out operations.

#### 6.1.1 Dashboard Metrics

| Metric | Description |
|--------|-------------|
| Today's Arrivals | Expected check-ins |
| In-House Guests | Current guests |
| Today's Departures | Expected check-outs |
| Available Rooms | Rooms ready for check-in |

#### 6.1.2 Guest Search

Search for guests by:
- Guest name
- Reservation number
- Room number
- Phone number

#### 6.1.3 Check-In Process

1. Find the reservation or create walk-in
2. Click **"Check In"**
3. Verify guest identity:
   - Select ID type (Passport, Driver's License, National ID)
   - Enter ID number
   - Check "ID Verified" box
4. Issue key card (check box when issued)
5. Assign room (if not pre-assigned)
6. Click **"Complete Check-In"**

**Automatic Actions:**
- Room status changes to "Occupied"
- Guest folio is created
- Room charge is posted

#### 6.1.4 Check-Out Process

1. Find the guest
2. Click **"Check Out"**
3. Review outstanding charges
4. Process payment (if balance due)
5. Click **"Complete Check-Out"**

**Automatic Actions:**
- Room status changes to "Dirty"
- Folio is closed
- Housekeeping task is created

#### 6.1.5 Express Check-Out

For guests opting for express checkout:
1. Mark "Express Checkout" on reservation
2. Guest can leave without front desk interaction
3. Final bill sent to email on file
4. Card on file is charged automatically

### 6.2 Room Management

Manage room inventory and status.

#### 6.2.1 Room Grid

Rooms displayed with:
- Room number
- Room type
- Status (Available, Occupied, Reserved, Maintenance)
- Housekeeping status (Clean, Dirty, Cleaning)
- Price per night

#### 6.2.2 Room Types

| Type | Description |
|------|-------------|
| Standard | Basic room |
| Deluxe | Upgraded amenities |
| Suite | Separate living area |
| Executive | Business amenities |
| Penthouse | Premium suite |

#### 6.2.3 Room Statuses

| Status | Color | Description |
|--------|-------|-------------|
| Available | Green | Ready for sale |
| Occupied | Blue | Guest in-house |
| Reserved | Purple | Booked for future date |
| Maintenance | Red | Out of order |

#### 6.2.4 Housekeeping Statuses

| Status | Color | Description |
|--------|-------|-------------|
| Clean | Green | Ready for guest |
| Dirty | Red | Needs cleaning |
| Cleaning | Yellow | Being cleaned |

#### 6.2.5 Room Pricing

| Rate Type | Description |
|-----------|-------------|
| Base Rate | Standard weekday rate |
| Weekend Rate | Friday-Sunday rate |
| Seasonal Rate | Special period pricing |
| OTA Markup | Additional % for OTA bookings |

#### 6.2.6 Creating a Room

1. Click **"Add Room"**
2. Enter room details:

| Field | Description | Required |
|-------|-------------|----------|
| Room Number | Unique identifier | Yes |
| Room Type | Type category | Yes |
| Floor | Floor number | No |
| Capacity | Max guests | Yes |
| Price Per Night | Base rate | Yes |
| Amenities | Room features | No |
| Notes | Staff notes | No |

3. Click **"Save Room"**

### 6.3 Housekeeping

Manage cleaning tasks and staff assignments.

#### 6.3.1 Dashboard Statistics

| Metric | Description |
|--------|-------------|
| Pending Tasks | Tasks not started |
| In Progress | Tasks being worked |
| Completed Today | Finished tasks |
| Dirty Rooms | Rooms needing cleaning |

#### 6.3.2 Task Types

| Type | Description |
|------|-------------|
| Cleaning | Standard room cleaning |
| Deep Clean | Thorough cleaning |
| Turnover | Quick refresh between guests |
| Inspection | Quality check |
| Maintenance | Minor repairs |

#### 6.3.3 Priority Levels

| Priority | Description |
|----------|-------------|
| Low | Standard timing |
| Normal | Regular priority |
| High | Expedited |
| Urgent | Immediate attention |

#### 6.3.4 Creating a Task

1. Click **"Add Task"**
2. Select room
3. Choose task type
4. Set priority
5. Assign staff member
6. Set scheduled date/time
7. Add notes (optional)
8. Click **"Save Task"**

#### 6.3.5 Task Status Flow

```
Pending → In Progress → Completed
```

#### 6.3.6 Room Status Board

Quick visual of all room housekeeping statuses:
- Grid view by floor
- Color-coded by status
- Click to update status

### 6.4 Billing and Folios

Guest billing and charge management.

#### 6.4.1 Folio Overview

A folio is the guest's bill, containing:
- Room charges
- Incidental charges
- Payments
- Balance due

#### 6.4.2 Folio Statuses

| Status | Description |
|--------|-------------|
| Open | Active, accepting charges |
| Pending Payment | Checkout initiated |
| Paid | Fully settled |
| Closed | Finalized |

#### 6.4.3 Charge Types

| Type | Description |
|------|-------------|
| Room | Nightly room rate |
| Restaurant | F&B charges |
| Minibar | In-room minibar |
| Spa | Spa services |
| Laundry | Laundry service |
| Parking | Parking fees |
| Phone | Phone calls |
| Other | Miscellaneous |

#### 6.4.4 Posting Charges

1. Open the guest folio
2. Click **"Add Charge"**
3. Select charge type
4. Enter description
5. Enter amount
6. Click **"Post Charge"**

#### 6.4.5 Recording Payments

1. Open the guest folio
2. Click **"Record Payment"**
3. Select payment method:
   - Cash
   - Credit Card
   - Mobile Money
   - Bank Transfer
4. Enter amount
5. Click **"Apply Payment"**

#### 6.4.6 Voiding Charges

1. Find the charge in the folio
2. Click **"Void"**
3. Enter void reason
4. Confirm void
5. Charge is reversed

> **Note:** Voided charges remain visible with strikethrough for audit purposes.

### 6.5 Guest Services

Manage room service and amenity requests.

#### 6.5.1 Request Types

| Type | Description |
|------|-------------|
| Room Service | Food and beverage delivery |
| Amenity Request | Extra towels, pillows, etc. |
| Wake-Up Call | Scheduled calls |
| Transportation | Airport transfers, taxis |
| Concierge | General assistance |

#### 6.5.2 Request Status

| Status | Description |
|--------|-------------|
| Pending | New request |
| In Progress | Being fulfilled |
| Completed | Delivered/Done |
| Cancelled | Request cancelled |

#### 6.5.3 Creating a Request

1. Click **"New Request"**
2. Select guest/room
3. Choose request type
4. Enter details
5. Set priority
6. Assign staff (optional)
7. Click **"Submit Request"**

### 6.6 Guest Profiles

Maintain detailed guest history and preferences.

#### 6.6.1 Profile Information

| Section | Fields |
|---------|--------|
| Personal | Name, nationality, ID details |
| Contact | Phone, email, address |
| Preferences | Room type, floor, bed, amenities |
| Dietary | Restrictions, allergies |
| History | Total stays, nights, spend |
| Notes | Special requests, VIP status |

#### 6.6.2 Loyalty Tiers

| Tier | Criteria |
|------|----------|
| Member | Base level |
| Silver | 5+ stays |
| Gold | 15+ stays |
| Platinum | 30+ stays |

#### 6.6.3 VIP Status

Mark guests as VIP for:
- Priority room assignment
- Complimentary upgrades
- Special amenities
- Staff alerts on arrival

### 6.7 Maintenance

Track and manage property maintenance.

#### 6.7.1 Work Order Categories

| Category | Description |
|----------|-------------|
| Plumbing | Water, pipes, drains |
| Electrical | Power, lighting |
| HVAC | Heating, cooling |
| Appliance | Equipment repairs |
| Furniture | Fixtures, furnishings |
| General | Other maintenance |

#### 6.7.2 Creating Work Orders

1. Click **"New Request"**
2. Enter title
3. Select category
4. Choose priority
5. Select room (if applicable)
6. Enter description
7. Assign technician
8. Click **"Create"**

#### 6.7.3 Work Order Flow

```
Open → Assigned → In Progress → Completed
```

#### 6.7.4 Cost Tracking

- Estimated cost (entered at creation)
- Actual cost (entered at completion)
- Cost variance reporting

---

## 7. Pharmacy Module

Specialized features for pharmacy operations.

### 7.1 Prescription Management

Core prescription workflow from intake to dispensing.

#### 7.1.1 Prescription Queue

Prescriptions organized by status:
- Pending (new prescriptions)
- Processing (being prepared)
- Ready (awaiting pickup)
- Dispensed (completed)

#### 7.1.2 Prescription Status Flow

```
Pending → Processing → Ready → Dispensed
```

#### 7.1.3 Creating a Prescription

1. Click **"New Prescription"**
2. Enter prescription details:

| Field | Description | Required |
|-------|-------------|----------|
| Patient | Select existing or create new | Yes |
| Prescriber Name | Doctor's name | Yes |
| Prescriber License | License number | No |
| Prescriber Phone | Contact number | No |
| Date Written | Prescription date | Yes |
| Controlled Substance | Is this a controlled substance? | Yes |
| Refills Authorized | Number of refills | No |
| Notes | Special instructions | No |

3. Add medications:

| Field | Description | Required |
|-------|-------------|----------|
| Medication | Select from database | Yes |
| Dosage | Strength | Yes |
| Quantity | Amount to dispense | Yes |
| Directions | How to take | Yes |
| Days Supply | Duration | No |

4. Click **"Save Prescription"**

#### 7.1.4 Drug Interaction Check

When adding medications:
1. System automatically checks for interactions
2. Warnings displayed if interactions found
3. Severity levels: Mild, Moderate, Severe
4. Pharmacist must acknowledge before proceeding

#### 7.1.5 Processing a Prescription

1. Select prescription from queue
2. Review patient information
3. Verify drug interactions
4. Fill prescription
5. Record who dispensed
6. Move to "Ready" status
7. Notify patient (if configured)

#### 7.1.6 Dispensing a Prescription

1. Patient arrives for pickup
2. Verify patient identity
3. Provide counseling (if required)
4. Record pickup
5. Status changes to "Dispensed"

### 7.2 Patient Profiles

Comprehensive patient health information.

#### 7.2.1 Profile Sections

| Section | Description |
|---------|-------------|
| Personal | Name, DOB, gender, contact |
| Medical | Conditions, blood type |
| Allergies | Drug and other allergies |
| Insurance | Provider, policy, group number |
| Emergency | Emergency contact info |
| Notes | Special considerations |

#### 7.2.2 Creating a Patient

1. Click **"Add Patient"**
2. Link to existing customer or create new
3. Enter medical information:

| Field | Description | Required |
|-------|-------------|----------|
| Date of Birth | Patient's DOB | Yes |
| Gender | Male/Female/Other | No |
| Blood Type | Blood type | No |
| Allergies | List of allergies | No |
| Medical Conditions | Chronic conditions | No |
| Insurance Provider | Insurance company | No |
| Policy Number | Insurance policy # | No |
| Group Number | Insurance group # | No |
| Emergency Contact | Name and phone | No |

4. Click **"Save Patient"**

#### 7.2.3 Allergy Alerts

- Allergies display prominently on patient profile
- Checked against prescribed medications
- Alert appears if allergen detected

### 7.3 Medications Database

Maintain your pharmacy's drug catalog.

#### 7.3.1 Medication Information

| Field | Description |
|-------|-------------|
| Name | Brand/Generic name |
| Generic Name | Generic equivalent |
| Drug Class | Therapeutic class |
| Dosage Forms | Tablet, capsule, liquid, etc. |
| Strengths | Available strengths |
| Route | How administered |
| Controlled Schedule | DEA schedule (if applicable) |
| Storage | Storage requirements |
| Warnings | Important warnings |
| Contraindications | When not to use |
| Side Effects | Common side effects |

#### 7.3.2 Adding a Medication

1. Click **"Add Medication"**
2. Enter medication details
3. Mark if prescription required
4. Mark if controlled substance
5. Click **"Save Medication"**

### 7.4 Drug Interactions

AI-powered drug interaction checking.

#### 7.4.1 How It Works

1. When prescription is created, all medications are analyzed
2. AI checks for known interactions
3. Results displayed with severity level
4. Recommendations provided

#### 7.4.2 Severity Levels

| Level | Color | Description |
|-------|-------|-------------|
| Mild | Yellow | Minor interaction, monitor |
| Moderate | Orange | May require adjustment |
| Severe | Red | Avoid combination |

#### 7.4.3 Manual Interaction Check

1. Navigate to Interactions page
2. Select medications to check
3. Click **"Check Interactions"**
4. Results displayed

### 7.5 Controlled Substances

DEA compliance and tracking.

#### 7.5.1 Transaction Log

Every controlled substance transaction is logged:
- Date and time
- Medication name
- Quantity change
- Before/after quantities
- Performed by (pharmacist)
- Witnessed by (second person)
- Lot number
- Expiry date
- Notes

#### 7.5.2 Actions Logged

| Action | Description |
|--------|-------------|
| Received | Inventory received |
| Dispensed | Prescription filled |
| Destroyed | Expired/damaged drugs |
| Returned | Return to wholesaler |
| Adjustment | Inventory correction |

#### 7.5.3 Logging a Transaction

1. Select medication
2. Choose action
3. Enter quantity
4. Enter lot number
5. Enter expiry date
6. Select witness (required)
7. Add notes
8. Click **"Log Transaction"**

#### 7.5.4 DEA Reporting

- Transaction history exportable
- Includes all required fields
- Sorted by date and medication

### 7.6 Insurance Billing

Track and manage insurance claims.

#### 7.6.1 Claim Statuses

| Status | Description |
|--------|-------------|
| Pending | Not yet submitted |
| Submitted | Sent to insurance |
| Processing | Under review |
| Approved | Payment approved |
| Denied | Claim denied |
| Partial | Partially approved |

#### 7.6.2 Creating a Claim

1. From prescription, click **"Create Claim"**
2. Verify patient insurance info
3. Enter claim details:
   - Amount claimed
   - Copay amount
   - Submission date
4. Click **"Submit Claim"**

#### 7.6.3 Processing Denials

1. Review denial reason
2. Options:
   - Resubmit with corrections
   - Appeal with documentation
   - Mark as patient responsibility

#### 7.6.4 Claim Metrics

| Metric | Description |
|--------|-------------|
| Pending Claims | Not yet processed |
| Total Claimed | Amount submitted |
| Approved Amount | Amount approved |
| Denial Rate | Percentage denied |

---

## 8. Retail Module

Features optimized for retail and grocery operations.

### 8.1 Product Catalog

Enhanced product management for retail.

#### 8.1.1 Retail-Specific Fields

| Field | Description |
|-------|-------------|
| Barcode | EAN/UPC barcode |
| Variants | Size, color, etc. |
| Promotions | Active discounts |
| Supplier | Vendor information |
| Expiry Date | For perishables |

### 8.2 Quick Checkout POS

Optimized for high-volume transactions.

#### 8.2.1 Barcode Scanning

1. Focus on search field
2. Scan product barcode
3. Product auto-adds to cart
4. Scan next item

#### 8.2.2 Quick Keys

Programmable buttons for frequent items:
- Configure in Settings
- One-tap to add
- Custom icons

### 8.3 Promotions

Manage sales and discounts.

#### 8.3.1 Promotion Types

| Type | Description |
|------|-------------|
| Percentage Off | % discount on items |
| Fixed Amount | $ off on items |
| BOGO | Buy one get one |
| Bundle | Discounted product sets |

#### 8.3.2 Creating a Promotion

1. Navigate to Products → Promotions
2. Click **"Add Promotion"**
3. Select promotion type
4. Choose products/categories
5. Set discount value
6. Set date range
7. Click **"Activate"**

### 8.4 Inventory Tracking

Enhanced inventory for retail needs.

#### 8.4.1 Expiry Tracking

- Set expiry dates on perishable products
- Alerts before expiration
- Expired items flagged
- Write-off tracking

#### 8.4.2 Stock Transfers

For multi-location retail:
1. Create transfer request
2. Specify source and destination
3. Select products and quantities
4. Approve transfer
5. Receive at destination

---

## 9. Settings and Configuration

### 9.1 Organization Settings

Manage your business identity.

| Setting | Description |
|---------|-------------|
| Business Name | Your organization name |
| Logo | Upload business logo |
| Primary Vertical | Default business type |

### 9.2 Location Settings

Configure individual locations.

| Setting | Description |
|---------|-------------|
| Location Name | Branch/store name |
| Address | Physical address |
| City | City |
| Country | Country |
| Phone | Contact number |
| Email | Location email |
| Vertical | Business type for this location |

### 9.3 Profile Settings

Personal user settings.

| Setting | Description |
|---------|-------------|
| Full Name | Your display name |
| Email | Login email (read-only) |
| Phone | Contact number |
| Avatar | Profile picture |

### 9.4 Notification Settings

Control what notifications you receive.

| Setting | Description |
|---------|-------------|
| Email Notifications | Receive email alerts |
| Low Stock Alerts | Inventory warnings |
| Order Notifications | New order alerts |

### 9.5 Subscription Management

View and manage your plan.

| Information | Description |
|-------------|-------------|
| Current Plan | Your active subscription |
| Status | Active, trial, expired |
| Trial End | Trial expiration date |
| Features | What's included |
| Upgrade | Change plan options |

### 9.6 Language Settings

Change the interface language.

Supported languages:
- English
- French
- Spanish
- (Additional languages available)

### 9.7 Data Import

Import existing data into the system.

#### 9.7.1 Supported Import Types

| Type | Description |
|------|-------------|
| Medications | Pharmacy drug catalog |
| Products | Product catalog |
| Customers | Customer database |
| Patient Profiles | Pharmacy patients |
| Hotel Rooms | Room inventory |

#### 9.7.2 Import Process

1. Select import type
2. Download template (recommended)
3. Upload CSV file
4. Map columns to fields
5. Validate data
6. Review errors (if any)
7. Start import
8. Monitor progress

#### 9.7.3 Field Mapping

- Auto-mapping for standard column names
- Manual mapping for custom columns
- Required fields highlighted
- Sample data preview

---

## 10. Subscription Plans

### 10.1 Plan Comparison

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Monthly Price | Free | $29/mo | Custom |
| Locations | 1 | 5 | Unlimited |
| Users | 3 | 15 | Unlimited |
| POS | ✓ | ✓ | ✓ |
| Inventory | ✓ | ✓ | ✓ |
| Basic Reports | ✓ | ✓ | ✓ |
| Advanced Reports | - | ✓ | ✓ |
| Data Export | - | ✓ | ✓ |
| Staff Management | - | ✓ | ✓ |
| AI Insights | - | ✓ | ✓ |
| Priority Support | - | - | ✓ |
| Custom Integrations | - | - | ✓ |

### 10.2 Trial Period

- **Duration**: 14 days
- **Features**: Full Professional plan access
- **No credit card required** to start
- Automatic downgrade to Starter after trial

### 10.3 Upgrading

1. Navigate to Settings → Subscription
2. Click **"Upgrade Plan"**
3. Select desired plan
4. Enter payment information
5. Confirm upgrade
6. Features unlock immediately

### 10.4 Plan Limits

When you exceed plan limits:
- Soft limit warnings appear
- Cannot add more users/locations
- Must upgrade to continue adding

---

## 11. Super Admin Dashboard

*For platform administrators only*

### 11.1 Accessing Super Admin

1. Must have `super_admin` role
2. Navigate to `/admin` or click admin banner on dashboard
3. Separate interface for platform management

### 11.2 Platform Overview

#### 11.2.1 Key Metrics

| Metric | Description |
|--------|-------------|
| Total MRR | Monthly Recurring Revenue |
| Active Organizations | Paying + trial orgs |
| Total Users | All platform users |
| Conversion Rate | Trial to paid % |
| Churn Rate | Monthly cancellations |
| DAU/WAU/MAU | Active user metrics |

#### 11.2.2 Revenue Chart

- Daily MRR breakdown
- 30-day trend
- Plan distribution

### 11.3 Organization Management

Manage all organizations on the platform.

#### 11.3.1 Organization List

| Column | Description |
|--------|-------------|
| Name | Organization name |
| Plan | Current subscription |
| Status | Active, trial, suspended |
| Users | Number of users |
| Created | Registration date |
| Revenue | Monthly contribution |

#### 11.3.2 Organization Actions

- View details
- Manage subscription
- Suspend/reactivate
- Impersonate users

### 11.4 User Management

Cross-organization user directory.

#### 11.4.1 User List

| Column | Description |
|--------|-------------|
| Name | User's name |
| Email | Email address |
| Organization | Affiliated org |
| Role | Assigned role |
| Last Active | Last login |
| Status | Active/suspended |

#### 11.4.2 User Actions

- View profile
- Reset password
- Suspend/reactivate
- Change role

### 11.5 Subscription Analytics

Revenue and subscription insights.

#### 11.5.1 Metrics

| Metric | Description |
|--------|-------------|
| MRR by Plan | Revenue per plan tier |
| Plan Distribution | % of orgs per plan |
| Trial Conversions | Trials becoming paid |
| Upgrades/Downgrades | Plan changes |
| Churn Analysis | Cancellation reasons |

### 11.6 Support Tools

#### 11.6.1 User Impersonation

1. Find user in directory
2. Click **"Impersonate"**
3. View platform as that user
4. Troubleshoot issues
5. Click **"End Session"** to return

> **Note:** All impersonation sessions are logged.

#### 11.6.2 Support Tickets

View and manage support requests from users.

### 11.7 Platform Analytics

Usage trends and feature adoption.

#### 11.7.1 Metrics

| Metric | Description |
|--------|-------------|
| Feature Usage | Which features are used most |
| API Calls | Platform load |
| Error Rates | System health |
| Page Views | User engagement |

### 11.8 Audit Logs

Complete administrative action history.

#### 11.8.1 Logged Actions

| Action Type | Description |
|-------------|-------------|
| User Management | Role changes, suspensions |
| Subscription | Plan changes, cancellations |
| Configuration | Settings modifications |
| Impersonation | Support sessions |
| Security | Password resets, access changes |

#### 11.8.2 Log Fields

| Field | Description |
|-------|-------------|
| Timestamp | When action occurred |
| Admin | Who performed action |
| Action | What was done |
| Target | What was affected |
| Details | Additional context |
| IP Address | Source IP |

---

## 12. User Engagement Features

### 12.1 Command Palette

Quick navigation and actions from anywhere.

#### 12.1.1 Opening Command Palette

- **Keyboard**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows)
- **Click**: Search icon in header

#### 12.1.2 Features

| Category | Description |
|----------|-------------|
| Quick Actions | New Sale, Add Product, etc. |
| Navigation | Jump to any page |
| Search | Find items quickly |
| Admin | Platform admin (super admins) |

#### 12.1.3 Usage

1. Open command palette
2. Type to search
3. Use arrow keys to navigate
4. Press Enter to select
5. Action executes immediately

### 12.2 Product Tour

Interactive walkthrough for new users.

#### 12.2.1 Tour Steps

1. **Welcome**: Platform overview
2. **Dashboard**: Understanding your metrics
3. **Point of Sale**: Making your first sale
4. **Products**: Managing inventory
5. **Reports**: Tracking performance
6. **Settings**: Customizing your experience

#### 12.2.2 Controls

- **Next**: Continue to next step
- **Previous**: Go back
- **Skip**: End tour early
- **Complete**: Finish tour

> **Note:** Tour completion is saved to your profile.

### 12.3 Setup Checklist

Getting started tasks on your dashboard.

#### 12.3.1 Checklist Items

| Task | Description |
|------|-------------|
| Add First Product | Create your catalog |
| Create Customer | Build your database |
| Complete Sale | Use the POS |
| Invite Team Member | Add your staff |
| Customize Settings | Configure your account |

#### 12.3.2 Features

- Progress indicator shows completion %
- Click item to navigate to relevant page
- Dismiss checklist when done
- Reopen from settings if needed

### 12.4 Notification Center

Persistent notification history.

#### 12.4.1 Opening Notifications

Click the bell icon in the header.

#### 12.4.2 Notification Types

| Type | Icon | Description |
|------|------|-------------|
| Info | Blue | Informational updates |
| Success | Green | Completed actions |
| Warning | Yellow | Attention needed |
| Error | Red | Action required |

#### 12.4.3 Actions

- Click notification to see details
- Mark as read/unread
- Clear all notifications
- Real-time updates

### 12.5 Feedback Widget

Submit feedback directly from the app.

#### 12.5.1 Opening Feedback

Click the floating button (bottom right).

#### 12.5.2 Feedback Types

| Type | Description |
|------|-------------|
| Bug Report | Something isn't working |
| Feature Request | Suggest improvements |
| Question | Need help |
| General | Other feedback |

#### 12.5.3 Submitting Feedback

1. Click feedback button
2. Select feedback type
3. Rate your experience (1-5 stars)
4. Enter your message
5. Click **"Submit"**

---

## 13. Appendices

### Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open Command Palette |
| `Shift + P` | Go to POS |
| `Shift + I` | Go to Inventory |
| `Shift + O` | Go to Orders |
| `Shift + C` | Go to Customers |
| `Shift + R` | Go to Reports |
| `Shift + S` | Go to Settings |

### Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Organization** | Your business entity in HospitalityOS |
| **Location** | A physical branch or store |
| **Vertical** | Business type (Restaurant, Hotel, Pharmacy, Retail) |
| **Folio** | Guest bill in hotel operations |
| **KDS** | Kitchen Display System |
| **POS** | Point of Sale |
| **SKU** | Stock Keeping Unit |
| **MRR** | Monthly Recurring Revenue |
| **DAU** | Daily Active Users |
| **WAU** | Weekly Active Users |
| **MAU** | Monthly Active Users |
| **RLS** | Row Level Security |
| **OTA** | Online Travel Agency |

### Appendix C: Troubleshooting

#### Common Issues

| Issue | Solution |
|-------|----------|
| Can't log in | Check email/password, reset if needed |
| Page won't load | Refresh browser, clear cache |
| Data not saving | Check internet connection |
| Feature not available | Verify subscription plan |
| User limit reached | Upgrade plan or remove users |

#### Getting Help

1. Check this manual
2. Use the Feedback Widget
3. Contact support at support@hospitalityos.com

### Appendix D: Data Security

| Feature | Description |
|---------|-------------|
| Encryption | All data encrypted in transit and at rest |
| Row Level Security | Data isolation between organizations |
| Role-Based Access | Permissions control data access |
| Audit Logging | All changes tracked |
| Backup | Automated daily backups |

### Appendix E: Browser Compatibility

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Last Updated | January 2026 |
| Author | HospitalityOS Team |
| Status | Production |

---

*© 2026 HospitalityOS. All rights reserved.*
