# Screens & UI Design — Complete Screen Reference

> **Frontend Framework:** Next.js (React)  
> **Purpose:** This document lists every screen, its layout, components, data requirements, and API calls.  
> **Total Screens: 38**

---

## Table of Contents

1. [Public Pages (No Auth)](#1-public-pages-no-auth)
2. [Auth Pages](#2-auth-pages)
3. [Shared Dashboard Layout](#3-shared-dashboard-layout)
4. [Individual User Screens](#4-individual-user-screens)
5. [Car Rental Business Screens](#5-car-rental-business-screens)
6. [Admin Panel Screens](#6-admin-panel-screens)
7. [Common Components Library](#7-common-components-library)
8. [Responsive Breakpoints](#8-responsive-breakpoints)

---

## 1. Public Pages (No Auth)

These pages are accessible to everyone, even without logging in.

---

### 1.1 Landing Page `/`

**Purpose:** Marketing page that introduces the platform.

**Sections:**
| Section | Content |
|---------|---------|
| Hero Banner | Tagline: "AI-Powered Car Damage Detection & Marketplace". CTA buttons: "Get Started", "Browse Cars" |
| Features Grid | 4 cards: Damage Detection, Marketplace, Rental Management, PDF Reports |
| How It Works | 3-step visual: Register Car → Upload Images → Get AI Report |
| Browse by Manufacturer | Logo grid: Toyota, Honda, Suzuki, Hyundai, KIA, etc. |
| Stats Section | Total cars listed, total detections run, active listings |
| Footer | Links, contact info, social media, copyright |

**API Calls:** None (static content)

---

### 1.2 Marketplace (Browse Listings) `/marketplace`

**Purpose:** Public car listing search page.

**Layout:**
```
┌───────────────────────────────────────────────────┐
│  🔍 Search Bar + Filter Toggle Button             │
├───────────┬───────────────────────────────────────┤
│           │                                       │
│  FILTERS  │     LISTING CARDS GRID                │
│  SIDEBAR  │     (3 columns on desktop)            │
│           │                                       │
│  □ Manuf. │  ┌─────────┐ ┌─────────┐ ┌────────┐  │
│  □ Model  │  │  Image   │ │  Image   │ │ Image  │  │
│  □ Year   │  │  Title   │ │  Title   │ │ Title  │  │
│  ₨ Price  │  │  Price   │ │  Price   │ │ Price  │  │
│  □ City   │  │  City    │ │  City    │ │ City   │  │
│  □ Cond.  │  └─────────┘ └─────────┘ └────────┘  │
│           │                                       │
│  [Sort ▼] │  ─── Pagination ───                   │
└───────────┴───────────────────────────────────────┘
```

**Filter Sidebar Components:**
- Manufacturer dropdown (auto-loaded from API)
- Model dropdown (loads when manufacturer selected)
- Year range slider (min/max)
- Price range slider (PKR, min/max)
- City text input
- Condition checkboxes: New, Used, Damaged
- Sort dropdown: Price ↑, Price ↓, Newest, Most Viewed
- "Clear Filters" button

**Listing Card Components:**
- Car image (first listing image or catalog image)
- Title
- Price in PKR (formatted: ₨ 45,00,000)
- City, Year, Condition badge
- View count icon
- "Negotiable" badge (if applicable)

**API Calls:**
- `GET /car-listings?...filters` — on load + filter change
- `GET /car-catalog/manufacturers` — populate manufacturer dropdown

---

### 1.3 Listing Detail Page `/marketplace/:id`

**Purpose:** Full details of a single car listing.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  ◀ Back to Marketplace                                  │
├─────────────────────────────┬───────────────────────────┤
│                             │                           │
│   IMAGE GALLERY             │  LISTING INFO             │
│   (Main image + thumbnails) │  ─────────────            │
│                             │  Title                    │
│   [img] [img] [img] [img]   │  ₨ 45,00,000              │
│                             │  ✅ Negotiable             │
│                             │  📍 Lahore                 │
│                             │  👁 234 views              │
│                             │  📅 Listed: Feb 10, 2026   │
│                             │                           │
│                             │  ─── SELLER INFO ───      │
│                             │  Name (if logged in)      │
│                             │  [Contact Seller] button  │
├─────────────────────────────┴───────────────────────────┤
│                                                         │
│  ─── CAR SPECIFICATIONS ───                             │
│  Manufacturer  │ Model    │ Year  │ Variant             │
│  Condition     │ Color    │ Mileage │ Fuel Type         │
│  Transmission  │ Engine   │ Body Type                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ─── DESCRIPTION ───                                    │
│  Full description text...                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ─── DAMAGE DETECTION STATUS ───                        │
│  ✅ No damage detected  OR  ⚠️ 2 images with damage     │
│  Last scanned: Feb 12, 2026                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Contact Seller Modal:**
```
┌──── Contact Seller ─────────────┐
│  Your Name:    [____________]   │
│  Your Email:   [____________]   │
│  Message:      [____________]   │
│                [____________]   │
│                                 │
│  [Cancel]         [Send Email]  │
└─────────────────────────────────┘
```

**API Calls:**
- `GET /car-listings/:id` — load listing details
- `POST /car-listings/:id/contact` — send contact email (requires auth + CNIC)

---

### 1.4 Car Catalog Browse `/catalog`

**Purpose:** Browse all car models in the platform catalog (reference/discovery).

**Layout:** Grid of catalog cards with filters (manufacturer, year, body type).

**Catalog Card:**
- Catalog image
- Manufacturer + Model + Year
- Base price
- Body type, fuel type, transmission badges

**API Calls:**
- `GET /car-catalog?...filters`
- `GET /car-catalog/manufacturers`

---

## 2. Auth Pages

---

### 2.1 Login Page `/auth/login`

**Layout:**
```
┌──────────────────────────────────────────┐
│              🚗 Car Platform              │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Email       [________________]   │  │
│  │  Password    [________________]   │  │
│  │                                    │  │
│  │  [        Login Button          ]  │  │
│  │                                    │  │
│  │  ──── or continue with ────       │  │
│  │  [🔴 Google]   [🔵 Facebook]      │  │
│  │                                    │  │
│  │  Don't have an account? Register   │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**API Calls:**
- `POST /auth/login`
- Redirect: `GET /auth/google`
- Redirect: `GET /auth/facebook`

---

### 2.2 Register Page `/auth/register`

**Layout:**
```
┌──────────────────────────────────────────────┐
│              Create Account                   │
│                                              │
│  Account Type:                               │
│  [● Individual]  [○ Car Rental Business]     │
│                                              │
│  Full Name      [____________________]       │
│  Email          [____________________]       │
│  Password       [____________________]       │
│  Confirm Pass   [____________________]       │
│  Phone          [____________________]       │
│  City           [____________________]       │
│                                              │
│  ── If Car Rental: ──                        │
│  Business Name  [____________________]       │
│  License No.    [____________________]       │
│                                              │
│  [        Create Account          ]          │
│                                              │
│  ──── or continue with ────                  │
│  [🔴 Google]   [🔵 Facebook]                  │
│                                              │
│  Already have an account? Login              │
└──────────────────────────────────────────────┘
```

**API Calls:**
- `POST /auth/register`

---

### 2.3 OAuth Callback `/auth/callback`

**Purpose:** Hidden page that captures tokens from OAuth redirect query params.

**Behavior:**
1. Reads `accessToken` and `refreshToken` from URL query params
2. Stores them in localStorage/cookies
3. Redirects to `/dashboard`

---

## 3. Shared Dashboard Layout

All authenticated pages use a consistent dashboard layout.

```
┌────────────────────────────────────────────────────────────┐
│  TOPBAR                                                    │
│  [≡ Menu]   Car Platform   [🔔 3]  [Avatar ▼ Dropdown]    │
├────────────┬───────────────────────────────────────────────┤
│            │                                               │
│  SIDEBAR   │   MAIN CONTENT AREA                           │
│            │                                               │
│  Dashboard │   (Page-specific content renders here)        │
│  My Cars   │                                               │
│  Images    │                                               │
│  Detection │                                               │
│  Listings  │                                               │
│  Rentals*  │                                               │
│  Profile   │                                               │
│  Settings  │                                               │
│            │                                               │
│  * = CAR_  │                                               │
│  RENTAL    │                                               │
│  only      │                                               │
└────────────┴───────────────────────────────────────────────┘
```

**Sidebar Menu Items (by role):**

| Menu Item | INDIVIDUAL | CAR_RENTAL | ADMIN |
|-----------|:----------:|:----------:|:-----:|
| Dashboard | ✅ | ✅ | ✅ |
| My Cars | ✅ | ✅ | ❌ |
| Car Images | ✅ | ✅ | ❌ |
| Damage Detection | ✅ | ✅ | ❌ |
| My Listings | ✅ | ✅ | ❌ |
| Rentals | ❌ | ✅ | ❌ |
| Marketplace | ✅ | ✅ | ❌ |
| Profile | ✅ | ✅ | ✅ |
| Users | ❌ | ❌ | ✅ |
| Verifications | ❌ | ❌ | ✅ |
| Car Catalog | ❌ | ❌ | ✅ |
| Platform Stats | ❌ | ❌ | ✅ |
| Notifications (send) | ❌ | ❌ | ✅ |

**Topbar Components:**
- Hamburger menu (mobile toggle)
- App logo + name
- Notification bell with unread count badge
- User avatar dropdown: Profile, Settings, Logout

---

## 4. Individual User Screens

---

### 4.1 Dashboard `/dashboard`

**Purpose:** Overview of user's activity.

**Cards:**
| Card | Data | API |
|------|------|-----|
| Total Cars | Count of registered cars | `GET /users/dashboard` |
| Active Listings | Count of active marketplace listings | `GET /users/dashboard` |
| Damage Scans | Total images with damage detected | `GET /users/dashboard` |
| Notifications | Unread count | `GET /notifications/unread-count` |

**Recent Activity Section:**
- Last 5 notifications
- Last 3 cars registered

---

### 4.2 My Cars List `/dashboard/cars`

**Purpose:** View all registered cars.

**Layout:** Table or card grid.

| Column | Content |
|--------|---------|
| Car | Manufacturer + Model + Year |
| Registration # | LEA-1234 |
| Condition | Badge: NEW/USED/DAMAGED |
| Mileage | 45,000 km |
| Images | ✅ Registration / ⏳ No periodic |
| Actions | View, Edit, Delete, Upload Images |

**Buttons:**
- "+ Register New Car" → opens registration flow
- Each row: View details, Edit, Delete

**API Calls:**
- `GET /user-cars` — load all user cars

---

### 4.3 Register New Car `/dashboard/cars/register`

**Purpose:** Step-by-step car registration.

**Step 1 — Select from Catalog:**
```
┌─────────────────────────────────────────────────────┐
│  Step 1 of 3: Select Your Car Model                 │
│                                                     │
│  Manufacturer: [ Toyota          ▼ ]                │
│  Model:        [ Corolla         ▼ ]                │
│  Year:         [ 2024            ▼ ]                │
│  Variant:      [ GLi             ▼ ]                │
│                                                     │
│  ── Selected Catalog Entry ──                       │
│  Toyota Corolla GLi 2024                            │
│  Base Price: ₨ 55,00,000                             │
│  Sedan | Petrol | Automatic | 1800cc                │
│                                                     │
│                              [Next →]               │
└─────────────────────────────────────────────────────┘
```

**Step 2 — Car Details:**
```
┌─────────────────────────────────────────────────────┐
│  Step 2 of 3: Your Car Details                      │
│                                                     │
│  Registration Number*  [ LEA-1234      ]            │
│  VIN Number            [ _____________ ]            │
│  Color                 [ White         ]            │
│  Mileage (km)          [ 45000         ]            │
│  Condition             [● Used] [○ New] [○ Damaged] │
│  Purchase Date         [ 📅 2022-06-15  ]           │
│  Purchase Price (PKR)  [ 4200000       ]            │
│                                                     │
│  [← Back]                        [Next →]           │
└─────────────────────────────────────────────────────┘
```

**Step 3 — Upload Registration Images:**
```
┌─────────────────────────────────────────────────────┐
│  Step 3 of 3: Registration Images (Required)        │
│                                                     │
│  Upload 4 images of your car. These are permanent.  │
│                                                     │
│  ┌──────────┐  ┌──────────┐                         │
│  │  FRONT   │  │  BACK    │                         │
│  │  📷 Drop │  │  📷 Drop │                         │
│  │  or Click│  │  or Click│                         │
│  └──────────┘  └──────────┘                         │
│  ┌──────────┐  ┌──────────┐                         │
│  │  LEFT    │  │  RIGHT   │                         │
│  │  📷 Drop │  │  📷 Drop │                         │
│  │  or Click│  │  or Click│                         │
│  └──────────┘  └──────────┘                         │
│                                                     │
│  [← Back]             [Register Car]                │
└─────────────────────────────────────────────────────┘
```

**API Calls (in sequence):**
1. `GET /car-catalog/manufacturers` → populate manufacturer dropdown
2. `GET /car-catalog/manufacturers/:name/models` → populate model dropdown
3. `GET /car-catalog?manufacturer=X&modelName=Y&year=Z` → get catalog entry
4. `POST /user-cars` → register car
5. `POST /car-images/:carId/registration` → upload 4 images

---

### 4.4 Car Detail Page `/dashboard/cars/:id`

**Purpose:** Full view of a single registered car.

**Tabs:**
| Tab | Content |
|-----|---------|
| Overview | Car specs, registration info, catalog data |
| Registration Images | 4 permanent photos (front, back, left, right) |
| Inspection History | Versioned periodic images with timeline |
| Damage Detection | Detection results, "Run Detection" button |
| Listing | Current listing info (if listed) |

**API Calls:**
- `GET /user-cars/:id`
- `GET /car-images/:id/registration`
- `GET /car-images/:id/inspection-history`
- `GET /damage-detection/history/:id`

---

### 4.5 Upload Periodic Images `/dashboard/cars/:id/periodic`

**Purpose:** Upload a new set of periodic inspection images.

**Layout:** Same as Step 3 of car registration, but for periodic images (front, back, left, right).

**Note to user:** "This will create a new inspection version. Previous versions are kept in history."

**API Calls:**
- `POST /car-images/:carId/periodic`

---

### 4.6 Damage Detection Page `/dashboard/cars/:id/detection`

**Purpose:** Run AI damage detection and view results.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Damage Detection — Toyota Corolla 2022 (LEA-1234)          │
│                                                             │
│  [🔍 Run Detection on All Images]  [📄 Download PDF Report] │
│                                                             │
│  ── Current Periodic Images ──                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────┐  │
│  │   FRONT    │  │   BACK     │  │  LEFT    │  │ RIGHT  │  │
│  │  ✅ Clean   │  │  ⚠️ Damage │  │ ✅ Clean │  │⚠️ Damage│  │
│  │            │  │  Dent:95%  │  │          │  │Scratch │  │
│  │  [Detect]  │  │  [Detect]  │  │ [Detect] │  │ 87%    │  │
│  └────────────┘  └────────────┘  └──────────┘  └────────┘  │
│                                                             │
│  ── Detection History ──                                    │
│  Version 3 (Current) — Feb 10, 2026 — 2 damages found      │
│  Version 2 — Jan 15, 2026 — 0 damages found                │
│  Version 1 — Dec 01, 2025 — 1 damage found                 │
└─────────────────────────────────────────────────────────────┘
```

**API Calls:**
- `POST /damage-detection/car` — run detection on all images
- `POST /damage-detection/image` — run on single image
- `GET /damage-detection/history/:carId` — load history
- `GET /reports/damage/:carId` — download PDF

---

### 4.7 Create Listing `/dashboard/listings/create`

**Purpose:** List a car for sale on the marketplace.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Create New Listing                                 │
│                                                     │
│  Select Car:  [ Toyota Corolla 2022 (LEA-1234)  ▼ ] │
│                                                     │
│  Title:       [ _______________________________ ]   │
│  Asking Price (PKR): [ 4500000 ]                    │
│  Negotiable:  [✅]                                   │
│                                                     │
│  Description:                                       │
│  [ _____________________________________________ ]  │
│  [ _____________________________________________ ]  │
│  [ _____________________________________________ ]  │
│                                                     │
│  ⚠️ Requirements:                                    │
│  ✅ Registration images uploaded                     │
│  ✅ CNIC verified                                    │
│  ✅ No active listing for this car                   │
│                                                     │
│  [Cancel]                    [Publish Listing]       │
└─────────────────────────────────────────────────────┘
```

**API Calls:**
- `GET /user-cars` — populate car dropdown
- `POST /car-listings` — create listing

---

### 4.8 My Listings `/dashboard/listings`

**Purpose:** View all user's marketplace listings.

**Table Columns:**
| Column | Content |
|--------|---------|
| Car | Toyota Corolla 2022 |
| Title | Listing title |
| Price | ₨ 45,00,000 |
| Status | Badge: ACTIVE / SOLD / INACTIVE |
| Views | 234 |
| Listed Date | Feb 10, 2026 |
| Actions | Edit, Mark Sold, Deactivate |

**API Calls:**
- `GET /car-listings/my/listings`

---

### 4.9 Profile Page `/dashboard/profile`

**Purpose:** View and edit user profile.

**Sections:**
1. **Avatar** — Upload/change profile picture
2. **Personal Info** — Name, email (readonly), phone, address, city
3. **CNIC Verification** — Upload CNIC image, status badge (Pending/Verified/Not Uploaded)
4. **Password** — Change password form
5. **Account Info** — Account type, created date, last login

**API Calls:**
- `GET /users/profile`
- `PATCH /users/profile`
- `POST /users/upload-cnic`
- `POST /users/change-password`

---

### 4.10 Notifications Page `/dashboard/notifications`

**Purpose:** View all notifications with read/unread management.

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  Notifications                     [Mark All as Read]    │
│                                                          │
│  ● CNIC Verified — Your CNIC has been verified...        │
│    SUCCESS | 2 hours ago                          [×]    │
│                                                          │
│  ○ New Inquiry — Someone inquired about your Corolla...  │
│    INFO | 1 day ago                               [×]    │
│                                                          │
│  ○ System — Platform maintenance scheduled...            │
│    SYSTEM | 3 days ago                            [×]    │
│                                                          │
│  ─── Pagination ───                                      │
└──────────────────────────────────────────────────────────┘
```

● = unread, ○ = read

**API Calls:**
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `DELETE /notifications/:id`

---

## 5. Car Rental Business Screens

Car Rental Business users have **all Individual screens** plus the following additional screens.

---

### 5.1 Rental Dashboard `/dashboard` (enhanced)

**Additional Cards (on top of Individual dashboard):**
| Card | Data |
|------|------|
| Active Rentals | Count |
| Completed Rentals | Count |
| Total Revenue | Sum in PKR |
| Fleet Size | Total registered cars |

**API Calls:**
- `GET /rentals/stats`
- `GET /users/dashboard`

---

### 5.2 Rentals List `/dashboard/rentals`

**Purpose:** View all rental records.

**Filter Bar:** Status dropdown, Car dropdown, Date range picker

**Table Columns:**
| Column | Content |
|--------|---------|
| Car | Corolla 2022 (LEA-1234) |
| Renter | Hassan Ali |
| Period | Feb 15 – Feb 20, 2026 |
| Price | ₨ 15,000 |
| Status | ACTIVE / COMPLETED / CANCELLED |
| Actions | View, Complete, Cancel |

**API Calls:**
- `GET /rentals?status=...&carId=...`

---

### 5.3 Create Rental `/dashboard/rentals/create`

**Purpose:** Log a new car rental.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  Create New Rental                                   │
│                                                      │
│  ── Vehicle ──                                       │
│  Select Car:  [ Corolla 2022 (LEA-1234)         ▼ ]  │
│                                                      │
│  ── Renter Information ──                            │
│  Name*:        [ Hassan Ali_______________ ]         │
│  Phone:        [ +923009876543____________ ]          │
│  Email:        [ hassan@example.com_______ ]         │
│  CNIC:         [ 35201-1234567-8__________ ]         │
│                                                      │
│  ── Rental Period ──                                 │
│  Start Date*:  [ 📅 Feb 15, 2026 ]                   │
│  End Date*:    [ 📅 Feb 20, 2026 ]                   │
│                                                      │
│  ── Details ──                                       │
│  Mileage at Start:  [ 45000 ]                        │
│  Rental Price (PKR)*: [ 15000 ]                      │
│  Pre-Rental Notes:                                   │
│  [ Minor scratch on rear bumper________________ ]    │
│                                                      │
│  [Cancel]                      [Create Rental]       │
└──────────────────────────────────────────────────────┘
```

**API Calls:**
- `GET /user-cars` — populate car dropdown
- `POST /rentals` — create rental

---

### 5.4 Rental Detail `/dashboard/rentals/:id`

**Purpose:** View full rental details.

**Sections:**
1. Vehicle info
2. Renter info
3. Rental period & mileage
4. Financial summary
5. Pre/post rental notes
6. Pre-inspection images (linked version) & post-inspection images
7. Action buttons: Complete, Cancel, Download PDF

**API Calls:**
- `GET /rentals/:id`
- `GET /car-images/:carId/inspection-history` — for inspection versions
- `GET /reports/rental/:rentalId` — download PDF

---

### 5.5 Complete Rental Modal/Page `/dashboard/rentals/:id/complete`

**Purpose:** Fill in return details when car comes back.

**Fields:**
- Mileage at End
- Post-Rental Notes
- Damage Charges (PKR)
- Damage Description
- Total Charges (auto-calculated: rental price + damage charges)

**API Calls:**
- `PATCH /rentals/:id/complete`

---

## 6. Admin Panel Screens

Admin users see a completely different sidebar and dashboard.

---

### 6.1 Admin Dashboard `/admin`

**Purpose:** Platform overview with key metrics.

**Stat Cards:**
| Card | Data |
|------|------|
| Total Users | 1,250 |
| Individuals | 1,100 |
| Car Rental Businesses | 148 |
| Pending Verifications | 23 |
| Active Listings | 180 |
| Active Rentals | 45 |
| Suspended Users | 12 |
| Total Cars | 850 |

**API Calls:**
- `GET /admin/stats`

---

### 6.2 User Management `/admin/users`

**Purpose:** View, search, filter, and manage all users.

**Filter Bar:**
- Account type dropdown
- Status dropdown
- Verification status toggle
- Search input (name/email)

**Table Columns:**
| Column | Content |
|--------|---------|
| User | Name + Avatar |
| Email | user@example.com |
| Type | Badge: INDIVIDUAL / CAR_RENTAL / ADMIN |
| Status | Badge: ACTIVE / SUSPENDED |
| Verified | ✅ / ❌ |
| Cars | 3 |
| Listings | 1 |
| Joined | Feb 01, 2026 |
| Actions | View, Verify, Suspend |

**API Calls:**
- `GET /admin/users?...filters`

---

### 6.3 User Detail (Admin) `/admin/users/:id`

**Purpose:** Full details of a user for admin review.

**Sections:**
1. **Profile Info** — All user fields
2. **CNIC Image** — Large view of uploaded CNIC (if any)
3. **Status Controls** — Dropdowns/buttons for:
   - Account Status: ACTIVE / SUSPENDED
   - Verification: Approve / Reject
   - Account Type: Change role
4. **Activity** — Cars, listings, rentals counts
5. **Action Buttons** — Save Changes, Suspend, Send Notification

**API Calls:**
- `GET /admin/users/:id`
- `PATCH /admin/users/:id`

---

### 6.4 CNIC Verification Queue `/admin/verifications`

**Purpose:** Queue of users awaiting CNIC verification.

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  CNIC Verification Queue                    23 pending       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Ahmed Khan — ahmed@example.com                      │    │
│  │  Type: INDIVIDUAL | City: Lahore                     │    │
│  │  Submitted: Feb 13, 2026                             │    │
│  │                                                      │    │
│  │  [View CNIC Image]    [✅ Approve]   [❌ Reject]      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Khan Rentals — rental@example.com                   │    │
│  │  Type: CAR_RENTAL | City: Karachi                    │    │
│  │  ...                                                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ─── Pagination ───                                          │
└──────────────────────────────────────────────────────────────┘
```

**CNIC Image Modal:** Opens the CNIC image in full-size for admin to inspect.

**API Calls:**
- `GET /admin/verifications`
- `PATCH /admin/users/:id` — with `{ isVerified: true }`

---

### 6.5 Car Catalog Management `/admin/catalog`

**Purpose:** CRUD interface for the car catalog.

**Table Columns:**
| Column | Content |
|--------|---------|
| Image | Primary catalog image |
| Manufacturer | Toyota |
| Model | Corolla |
| Year | 2024 |
| Variant | GLi |
| Base Price | ₨ 55,00,000 |
| Active | ✅ / ❌ |
| Actions | Edit, Delete, Add Image |

**Buttons:**
- "+ Add New Car Model"
- "Bulk Import" (CSV/JSON)

**API Calls:**
- `GET /car-catalog`
- `POST /car-catalog`
- `PATCH /car-catalog/:id`
- `DELETE /car-catalog/:id`
- `POST /car-catalog/:id/image`

---

### 6.6 Add/Edit Catalog Entry `/admin/catalog/create` or `/admin/catalog/:id/edit`

**Form Fields:**
| Field | Type | Required |
|-------|------|----------|
| Manufacturer | Text | Yes |
| Model Name | Text | Yes |
| Year | Number | Yes |
| Variant | Text | No |
| Body Type | Dropdown (Sedan, SUV, Hatchback, etc.) | No |
| Fuel Type | Dropdown (Petrol, Diesel, Hybrid, Electric) | No |
| Transmission | Dropdown (Manual, Automatic, CVT) | No |
| Engine Capacity | Text (e.g., 1800cc) | No |
| Seating Capacity | Number | No |
| Base Price (PKR) | Number | Yes |
| Description | Textarea | No |
| Features | Tag input (add/remove features) | No |

**API Calls:**
- `POST /car-catalog` or `PATCH /car-catalog/:id`

---

### 6.7 Send Notification `/admin/notifications`

**Purpose:** Broadcast system notifications.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Send System Notification                       │
│                                                 │
│  Title:     [ Platform Maintenance_________ ]   │
│  Message:   [ _____________________________ ]   │
│             [ _____________________________ ]   │
│                                                 │
│  Recipients:                                    │
│  [● All Users]  [○ Specific Users]              │
│                                                 │
│  (If Specific Users: multi-select user list)    │
│                                                 │
│  [Cancel]           [Send Notification]         │
└─────────────────────────────────────────────────┘
```

**API Calls:**
- `POST /admin/notifications`

---

## 7. Common Components Library

These reusable components appear across multiple screens.

| Component | Description | Used In |
|-----------|-------------|---------|
| `<Navbar>` | Top navigation with logo, notifications, avatar | All pages |
| `<Sidebar>` | Role-based navigation sidebar | Dashboard |
| `<DataTable>` | Sortable, paginated table with filter bar | Listings, Cars, Rentals, Users |
| `<CarCard>` | Car listing card for grid displays | Marketplace, Catalog |
| `<ImageUploader>` | Drag-and-drop image upload with preview | Registration, Periodic, CNIC |
| `<ImageGallery>` | Thumbnail strip + main image viewer | Listing Detail, Car Detail |
| `<FilterSidebar>` | Collapsible filter panel with inputs | Marketplace, Catalog |
| `<StatCard>` | Dashboard stat card (icon, number, label) | Dashboard |
| `<StatusBadge>` | Colored badge (Active/Sold/Suspended...) | Tables |
| `<Modal>` | Reusable modal overlay | Contact Seller, CNIC, Confirm |
| `<LoadingSpinner>` | Full-page or inline spinner | All pages |
| `<Pagination>` | Page controls with prev/next | All lists |
| `<EmptyState>` | Illustration + text for empty lists | All lists |
| `<ConfirmDialog>` | "Are you sure?" confirmation modal | Delete, Suspend actions |
| `<PriceDisplay>` | Formatted PKR price with ₨ symbol | Listings, Catalog |
| `<NotificationToast>` | Toast popup for real-time notifications | Global |
| `<StepWizard>` | Multi-step form navigation | Car Registration |
| `<FileDownloadBtn>` | Button that triggers PDF download | Reports |
| `<VerificationBadge>` | CNIC verified/pending/unverified badge | Profile, Users |
| `<DamageOverlay>` | Bounding box overlay on car images | Detection Results |

---

## 8. Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Sidebar hidden (hamburger), single column, cards stack |
| Tablet | 640–1024px | Sidebar collapsible, 2-column card grid |
| Desktop | > 1024px | Sidebar visible, 3-column card grid, full tables |

**Key Mobile Adaptations:**
- Marketplace filters become a bottom sheet / modal
- Tables become card-based layouts
- Image galleries become swipeable carousels
- Sidebar becomes hamburger menu overlay

---

## Screen Count Summary

| Section | Screens |
|---------|---------|
| Public Pages | 4 |
| Auth Pages | 3 |
| Individual User | 10 |
| Car Rental Business | 5 (additional) |
| Admin Panel | 7 |
| **Total** | **29 unique screens + shared layout** |

---

*This document provides the complete UI specification. Use it alongside the API Reference to build each screen with the correct data requirements and API integrations.*
