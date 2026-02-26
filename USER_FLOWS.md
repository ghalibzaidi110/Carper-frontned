# User Flows — Complete Journey Documentation

> **Purpose:** This document describes every user flow in the platform from every perspective, step-by-step, with decision points, error cases, and API mappings.

---

## Table of Contents

1. [Authentication Flows](#1-authentication-flows)
2. [Profile & Verification Flows](#2-profile--verification-flows)
3. [Car Management Flows](#3-car-management-flows)
4. [Image Management Flows](#4-image-management-flows)
5. [Damage Detection Flows](#5-damage-detection-flows)
6. [Marketplace Flows](#6-marketplace-flows)
7. [Rental Flows (Car Rental Business)](#7-rental-flows-car-rental-business)
8. [Admin Flows](#8-admin-flows)
9. [Notification Flows](#9-notification-flows)
10. [Error & Edge Case Flows](#10-error--edge-case-flows)

---

## 1. Authentication Flows

### 1.1 Email Registration

```
User visits /auth/register
        │
        ▼
Selects Account Type ──────────────────────────┐
  ● INDIVIDUAL                                 │
  ● CAR_RENTAL                                 │
        │                                      │
        ▼                                      │
Fills form:                                    │
  - Full Name*                                 │
  - Email*                                     │
  - Password* (min 8 chars, 1 uppercase,       │
    1 number, 1 special)                       │
  - Confirm Password*                          │
  - Phone                                      │
  - City                                       │
  - (CAR_RENTAL only):                         │
    - Business Name*                           │
    - Business License No.                     │
        │                                      │
        ▼                                      │
Submit ──────> POST /auth/register             │
        │                                      │
   ┌────┴────┐                                 │
   │ Success │ Email already exists?           │
   │         │ → Show error: "Email in use"    │
   │         │                                 │
   ▼         │                                 │
Receive:     │                                 │
 - accessToken (15min)                         │
 - refreshToken (7 days)                       │
 - user object                                 │
        │                                      │
        ▼                                      │
Store tokens in httpOnly cookies / localStorage│
        │                                      │
        ▼                                      │
Redirect to /dashboard                         │
```

**Result:** User created with `status: ACTIVE`, `isVerified: false`

---

### 1.2 Email Login

```
User visits /auth/login
        │
        ▼
Enters Email + Password
        │
        ▼
Submit ──────> POST /auth/login
        │
   ┌────┴────────────────────────────┐
   │ Success                         │ Wrong password → "Invalid credentials"
   │                                 │ Account SUSPENDED → "Account suspended"
   ▼                                 │
Receive tokens + user object         │
        │
        ▼
Store tokens → redirect to /dashboard
(Admin accounts redirect to /admin)
```

---

### 1.3 Google OAuth Login

```
User clicks "Login with Google"
        │
        ▼
Browser redirects to ──────> GET /auth/google
        │
        ▼
Google consent screen shown
        │
        ▼
User authorizes the app
        │
        ▼
Google redirects to ──────> GET /auth/google/callback
        │
        ▼
Backend processes OAuth data:
  ┌─────────────────────────────────────────────────┐
  │ Does a user with this Google email exist?       │
  │                                                 │
  │ YES → Login that user (generate tokens)         │
  │                                                 │
  │ NO → Auto-register new INDIVIDUAL account       │
  │      with Google email, name, phone, avatar     │
  │      (no password set → cannot use email login) │
  └─────────────────────────────────────────────────┘
        │
        ▼
Backend redirects to:
  FRONTEND_URL/auth/callback?accessToken=xxx&refreshToken=xxx
        │
        ▼
Frontend /auth/callback page:
  1. Reads token from URL params
  2. Stores tokens
  3. Redirects to /dashboard
```

### 1.4 Facebook OAuth Login

Same flow as Google OAuth but uses `GET /auth/facebook` and `GET /auth/facebook/callback`.

---

### 1.5 Token Refresh

```
API call returns 401 Unauthorized
(accessToken expired)
        │
        ▼
Frontend interceptor catches 401
        │
        ▼
Send ──────> POST /auth/refresh
  Body: { refreshToken: "stored_refresh_token" }
        │
   ┌────┴──────────────┐
   │ Success            │ Invalid/Expired → Force logout
   ▼                    │
New tokens received     │
        │               │
        ▼               │
Retry original API call │
with new accessToken    │
```

---

### 1.6 Logout

```
User clicks Logout
        │
        ▼
Send ──────> POST /auth/logout
  (with current accessToken in header)
        │
        ▼
Backend invalidates refreshToken (sets null)
        │
        ▼
Frontend clears stored tokens
        │
        ▼
Redirect to /auth/login
```

---

## 2. Profile & Verification Flows

### 2.1 CNIC Verification Flow (Critical for Transactions)

```
User navigates to /dashboard/profile
        │
        ▼
Sees "CNIC Verification" section
  Status: ❌ Not Verified
        │
        ▼
User uploads CNIC image ──────> POST /users/upload-cnic
  (front side of CNIC card, jpg/png, max 10MB)
        │
        ▼
Image uploaded to Cloudinary
cnicImageUrl saved to user record
        │
        ▼
User sees: "CNIC submitted — Pending Admin Review"
        │
        ▼
                ┌─────────────────────────────────────┐
                │         ADMIN SIDE                   │
                │                                      │
                │  Admin sees user in Verification     │
                │  Queue (/admin/verifications)        │
                │         │                            │
                │         ▼                            │
                │  Admin clicks user → views CNIC      │
                │  image in full size                   │
                │         │                            │
                │    ┌────┴────┐                       │
                │    │ APPROVE │ REJECT                 │
                │    │         │ (sets isVerified=false │
                │    │         │  + sends notification) │
                │    ▼         │                        │
                │  PATCH /admin/users/:id               │
                │  { isVerified: true }                 │
                │         │                            │
                │         ▼                            │
                │  Auto-sends:                         │
                │  - In-app notification               │
                │  - Email: "CNIC Verified"            │
                └─────────────────────────────────────┘
        │
        ▼
User sees: ✅ CNIC Verified
User can now: Contact sellers, Create rentals
```

**⚠️ Without CNIC Verification, user CANNOT:**
- Contact sellers on marketplace (POST /car-listings/:id/contact blocked)
- This is enforced by `VerificationGuard` on the backend

---

### 2.2 Profile Update Flow

```
User navigates to /dashboard/profile
        │
        ▼
Edits fields: name, phone, city, address
        │
        ▼
Save ──────> PATCH /users/profile
        │
        ▼
Success toast: "Profile updated"
```

---

### 2.3 Change Password Flow

```
User navigates to /dashboard/profile → Password section
        │
        ▼
Enters:
  - Current Password
  - New Password
  - Confirm New Password
        │
        ▼
Frontend validates: New Password === Confirm
        │
        ▼
Submit ──────> POST /users/change-password
        │
   ┌────┴──────────────────┐
   │ Success                │ Wrong current → "Current password incorrect"
   ▼                        │
"Password changed"          │
All other sessions should   │
re-authenticate              │
```

---

## 3. Car Management Flows

### 3.1 Register a New Car

```
User clicks "+ Register New Car" on /dashboard/cars
        │
        ▼
── Step 1: Select from Catalog ──
        │
  Load ──────> GET /car-catalog/manufacturers
        │
  Select Manufacturer ──────> GET /car-catalog/manufacturers/:name/models
        │
  Select Model → Select Year → Select Variant
        │
  Load catalog entry details ──────> GET /car-catalog?filters
        │
        ▼
── Step 2: Enter Car Details ──
        │
  Registration Number* (e.g., LEA-1234)
    → Frontend validates format
    → Backend checks uniqueness
  VIN (optional)
  Color, Mileage, Condition, Purchase Date, Purchase Price
        │
        ▼
── Step 3: Upload Registration Images ──
        │
  Upload 4 images (front, back, left, right)
    → Each max 10MB, jpg/png/webp
    → Preview shown before submit
        │
        ▼
Submit ──────> POST /user-cars
  { catalogCarId, registrationNumber, color, ... }
        │
        ▼
  ┌──────────────────────────────────────────┐
  │ Duplicate registration #?                 │
  │ YES → Error: "Registration # already      │
  │        exists in your cars"               │
  │ NO → Car created successfully             │
  └──────────────────────────────────────────┘
        │
        ▼
Upload images ──────> POST /car-images/:carId/registration
  (multipart form: front, back, left, right)
        │
        ▼
Redirect to /dashboard/cars/:id
```

**Important:** Cars can ONLY be registered from the catalog. Users cannot enter custom manufacturer/model. The catalog is managed by Admin.

---

### 3.2 Edit Car Details

```
User navigates to /dashboard/cars/:id → Edit
        │
        ▼
Load car ──────> GET /user-cars/:id
        │
        ▼
Edit: color, mileage, condition, purchase info
(Cannot change: registration #, catalog car)
        │
        ▼
Save ──────> PATCH /user-cars/:id
```

---

### 3.3 Delete a Car

```
User clicks Delete on /dashboard/cars/:id
        │
        ▼
Confirmation dialog: "Are you sure? This will also
  remove all images and listings."
        │
   ┌────┴──────┐
   │ Confirm    │ Cancel → do nothing
   ▼            │
DELETE /user-cars/:id
        │
   ┌────┴──────────────────────────────────┐
   │ Has active listings or rentals?        │
   │                                        │
   │ YES → Error: "Cannot delete car with   │
   │        active listings/rentals.        │
   │        Deactivate them first."         │
   │                                        │
   │ NO → Car soft-deleted (or hard delete) │
   │       All images deleted from          │
   │       Cloudinary                       │
   └────────────────────────────────────────┘
```

---

## 4. Image Management Flows

### 4.1 Registration Images (Permanent, One-Time)

```
During car registration (Step 3)
        │
        ▼
Upload 4 images: front, back, left, right
        │
        ▼
POST /car-images/:carId/registration
  (multipart: front=file, back=file, left=file, right=file)
        │
        ▼
Backend:
  1. Upload each image to Cloudinary
  2. Generate thumbnails
  3. Save CarImage records with:
     - category: REGISTRATION
     - imageUrl + thumbnailUrl
     - carId
        │
        ▼
Images are PERMANENT and cannot be overwritten.
They serve as the car's baseline photo record.
```

---

### 4.2 Periodic Inspection Images (Versioned)

```
User navigates to /dashboard/cars/:id
  → "Upload New Inspection" button
        │
        ▼
/dashboard/cars/:id/periodic
        │
        ▼
Upload 4 images (same angles: front, back, left, right)
        │
        ▼
POST /car-images/:carId/periodic
  (multipart: front=file, back=file, left=file, right=file)
        │
        ▼
Backend:
  1. Determine next version number:
     - Find MAX(inspectionVersion) for this car
     - New version = MAX + 1
  2. Upload to Cloudinary + generate thumbnails
  3. Save records with:
     - category: PERIODIC
     - inspectionVersion: N
        │
        ▼
Inspection History now shows:
  Version 3 (Latest) — Feb 10, 2026
  Version 2 — Jan 15, 2026
  Version 1 — Dec 01, 2025

Each version is preserved and viewable.
```

---

### 4.3 Image Lifecycle

```
REGISTRATION (Version 0)
  │  Created once during car registration
  │  Permanent baseline
  │
  ▼
PERIODIC (Version 1)
  │  First periodic inspection upload
  │
  ▼
PERIODIC (Version 2)
  │  Second periodic inspection upload
  │  Used for damage detection comparison
  │
  ▼
DAMAGE_DETECTION
  │  Created when YOLOv8 runs on periodic images
  │  Contains annotated images with bounding boxes
  │  Links back to source periodic image
  │
  ▼
LISTING
     Created when car is listed on marketplace
     Public-facing images for the listing
```

---

## 5. Damage Detection Flows

### 5.1 Run Detection on All Current Images

```
User navigates to /dashboard/cars/:id/detection
        │
        ▼
Clicks "Run Detection on All Images"
        │
        ▼
POST /damage-detection/car
  Body: { carId: "uuid" }
        │
        ▼
Backend:
  1. Fetch latest periodic images for this car
     (highest inspectionVersion)
  2. For each image, call Python FastAPI:
     POST http://YOLO_SERVICE_URL/detect
       Body: { imageUrl: "cloudinary_url" }
  3. YOLOv8 processes image:
     - Detects: dents, scratches, cracks, paint chips
     - Returns: bounding boxes, confidence scores,
       annotated image URL
  4. Save results in CarImage.damageDetectionData (JSON)
  5. Create damage detection CarImage records
        │
        ▼
Response:
  [
    {
      "imageId": "uuid",
      "angle": "front",
      "damageFound": false
    },
    {
      "imageId": "uuid",
      "angle": "back",
      "damageFound": true,
      "damages": [
        { "type": "dent", "confidence": 0.95, "bbox": [...] },
        { "type": "scratch", "confidence": 0.87, "bbox": [...] }
      ],
      "annotatedImageUrl": "https://cloudinary.../annotated.jpg"
    }
  ]
        │
        ▼
UI updates to show:
  ✅ Front — No damage
  ⚠️ Back — 2 damages detected (Dent 95%, Scratch 87%)
  ✅ Left — No damage
  ⚠️ Right — 1 damage detected (Paint chip 72%)
```

---

### 5.2 Run Detection on Single Image

```
User clicks "Detect" button on one specific image
        │
        ▼
POST /damage-detection/image
  Body: { imageId: "uuid" }
        │
        ▼
Same flow as above but for a single image
```

---

### 5.3 View Damage History

```
User navigates to detection history tab
        │
        ▼
GET /damage-detection/history/:carId
        │
        ▼
Shows timeline:
  Version 3 (Feb 2026) → 2 damages
  Version 2 (Jan 2026) → 0 damages
  Version 1 (Dec 2025) → 1 damage

User can click any version to see detailed results
```

---

### 5.4 Download Damage Report PDF

```
User clicks "Download PDF Report"
        │
        ▼
GET /reports/damage/:carId
        │
        ▼
Backend generates PDF with:
  - Car info (model, reg#, owner)
  - All inspection versions
  - Detection results per image
  - Annotated images (if available)
  - Summary table
        │
        ▼
PDF streams as download
  Content-Disposition: attachment; filename="damage-report-LEA1234.pdf"
```

---

## 6. Marketplace Flows

### 6.1 Seller: Create a Listing

```
Prerequisites:
  ✅ User has at least 1 registered car
  ✅ Car has registration images uploaded
  ✅ User's CNIC is verified
  ✅ Car doesn't have an existing ACTIVE listing
        │
        ▼
User navigates to /dashboard/listings/create
        │
        ▼
Select car from dropdown ──────> GET /user-cars
  (shows only eligible cars)
        │
        ▼
Fill form:
  - Title* ("2022 Toyota Corolla GLi — Excellent Condition")
  - Asking Price (PKR)*
  - Negotiable? (checkbox)
  - Description (rich text)
        │
        ▼
Submit ──────> POST /car-listings
        │
        ▼
Listing created with status: ACTIVE
        │
        ▼
Redirect to /dashboard/listings
```

---

### 6.2 Buyer: Browse & Contact Seller

```
Buyer visits /marketplace
        │
        ▼
Browse listings with filters:
  - Manufacturer, Model, Year range
  - Price range (PKR)
  - City
  - Condition
  - Sort by price/date/views
        │
        ▼
Clicks on a listing card
        │
        ▼
/marketplace/:id ──────> GET /car-listings/:id
  (view count incremented automatically)
        │
        ▼
Reviews: images, specs, description, damage status
        │
        ▼
Clicks "Contact Seller"
        │
   ┌────┴──────────────────┐
   │ Not logged in?         │
   │ → Redirect to login    │
   │                        │
   │ Logged in but          │
   │ not CNIC verified?     │
   │ → Error: "Verify CNIC  │
   │   before contacting"   │
   │                        │
   │ Logged in + verified?  │
   │ → Open contact modal   │
   └────────────────────────┘
        │
        ▼
Contact modal:
  Name: [auto-filled from profile]
  Email: [auto-filled from profile]
  Message: [________________]
        │
        ▼
Submit ──────> POST /car-listings/:id/contact
        │
        ▼
Backend sends email to seller:
  Subject: "Inquiry about your Toyota Corolla"
  Body: Buyer's message, name, email
        │
        ▼
Notification created for seller:
  "Someone inquired about your listing"
        │
        ▼
Buyer sees: "Message sent to seller!"
Seller receives: Email + in-app notification
```

---

### 6.3 Seller: Manage Listing

```
Seller navigates to /dashboard/listings
        │
        ▼
Table of all listings with status indicators
        │
   ┌────┴─────────────────────────────────┐
   │                                       │
   │  ACTIVE listing actions:              │
   │  ─────────────────────                │
   │  • Edit → PATCH /car-listings/:id     │
   │    (title, price, description)        │
   │  • Mark as Sold                       │
   │    → PATCH /car-listings/:id          │
   │      { status: "SOLD" }               │
   │  • Deactivate                         │
   │    → PATCH /car-listings/:id          │
   │      { status: "INACTIVE" }           │
   │                                       │
   │  INACTIVE listing actions:            │
   │  ─────────────────────                │
   │  • Reactivate                         │
   │    → PATCH /car-listings/:id          │
   │      { status: "ACTIVE" }             │
   │                                       │
   │  SOLD listing actions:                │
   │  ─────────────────────                │
   │  • (Read-only, archived)              │
   │  • Delete listing                     │
   │    → DELETE /car-listings/:id         │
   └───────────────────────────────────────┘
```

---

## 7. Rental Flows (Car Rental Business)

> **Only users with accountType: CAR_RENTAL can access rental features.**

### 7.1 Create a Rental

```
Car Rental Business user navigates to /dashboard/rentals/create
        │
        ▼
Select car ──────> GET /user-cars
  (shows only cars without active rentals)
        │
        ▼
Fill renter info:
  - Renter Name*
  - Renter Phone
  - Renter Email
  - Renter CNIC
        │
        ▼
Fill rental details:
  - Start Date*
  - End Date*
  - Mileage at Start
  - Rental Price (PKR)*
  - Pre-Rental Notes
        │
        ▼
Submit ──────> POST /rentals
        │
        ▼
Backend:
  1. Validates car belongs to user
  2. Checks for existing ACTIVE rental on this car
  3. Records current periodic images version as
     preRentalInspectionVersion
  4. Creates rental with status: ACTIVE
        │
        ▼
Notification: "Rental created for [Car] to [Renter]"
        │
        ▼
Redirect to /dashboard/rentals/:id
```

**Recommended Pre-Rental Steps:**
```
Before creating a rental, best practice is:
  1. Upload latest periodic images
  2. Run damage detection → get baseline
  3. Create rental (locks in pre-inspection version)
  4. Download damage report PDF as pre-rental proof
```

---

### 7.2 Complete a Rental

```
Car returned by renter
        │
        ▼
User navigates to /dashboard/rentals/:id
        │
        ▼
Clicks "Complete Rental"
        │
        ▼
** RECOMMENDED: Before completing **
  1. Upload new periodic images of returned car
  2. Run damage detection on new images
  3. Compare pre vs post inspection results
        │
        ▼
Fill completion form:
  - Mileage at End*
  - Post-Rental Notes
  - Damage Charges (PKR) — 0 if no damage
  - Damage Description (if charges > 0)
        │
        ▼
Submit ──────> PATCH /rentals/:id/complete
  {
    "mileageEnd": 46500,
    "postRentalNotes": "Minor scratch on left door",
    "damageCharges": 5000,
    "damageDescription": "2cm scratch on driver door"
  }
        │
        ▼
Backend:
  1. Sets status: COMPLETED
  2. Records current periodic images version as
     postRentalInspectionVersion
  3. Sets actualEndDate to now
  4. Calculates:
     totalCharges = rentalPrice + damageCharges
        │
        ▼
Notification: "Rental completed — Total: ₨20,000"
```

---

### 7.3 Cancel a Rental

```
User navigates to /dashboard/rentals/:id
        │
        ▼
Clicks "Cancel Rental"
        │
        ▼
Confirmation: "Are you sure? This cannot be undone."
        │
        ▼
Submit ──────> PATCH /rentals/:id/cancel
        │
        ▼
Status set to: CANCELLED
```

---

### 7.4 Download Rental Report PDF

```
User navigates to /dashboard/rentals/:id
        │
        ▼
Clicks "Download PDF Report"
        │
        ▼
GET /reports/rental/:rentalId
        │
        ▼
PDF contains:
  - Car info
  - Renter info
  - Rental period
  - Mileage (start → end → total driven)
  - Financial summary (price + damage charges = total)
  - Pre vs Post inspection notes
  - Damage details (if any)
        │
        ▼
PDF downloads
```

---

### 7.5 Rental Business Statistics

```
User navigates to /dashboard (CAR_RENTAL dashboard)
        │
        ▼
GET /rentals/stats
        │
        ▼
Dashboard shows:
  - Total Rentals
  - Active Rentals
  - Completed Rentals
  - Total Revenue (PKR)
  - Average Rental Duration
  - Revenue by Month (chart data)
  - Most Rented Cars
```

---

## 8. Admin Flows

### 8.1 CNIC Verification Processing

```
Admin navigates to /admin/verifications
        │
        ▼
GET /admin/verifications
  Returns list of users with CNIC uploaded but isVerified=false
        │
        ▼
Admin clicks on a user
        │
        ▼
GET /admin/users/:id
  Full user details + CNIC image
        │
        ▼
Admin views CNIC image at full resolution
        │
   ┌────┴──────────────────────────────────┐
   │                                        │
   │  ✅ APPROVE                             │
   │  PATCH /admin/users/:id                │
   │  { isVerified: true }                  │
   │        │                               │
   │        ▼                               │
   │  Backend auto-sends:                   │
   │  - Notification: "CNIC verified"       │
   │  - Email: verification approved        │
   │                                        │
   │  ❌ REJECT                              │
   │  PATCH /admin/users/:id                │
   │  { isVerified: false }                 │
   │  (optionally send notification         │
   │   explaining rejection reason)         │
   │        │                               │
   │        ▼                               │
   │  Notification: "CNIC rejected"         │
   │  User must re-upload                   │
   └────────────────────────────────────────┘
```

---

### 8.2 User Management

```
Admin navigates to /admin/users
        │
        ▼
GET /admin/users?accountType=&status=&search=
        │
        ▼
Browse/Search/Filter users
        │
        ▼
Click user → /admin/users/:id
        │
        ▼
GET /admin/users/:id
        │
        ▼
Admin can:
  ┌──────────────────────────────────────────────┐
  │                                              │
  │  1. Change Account Status                    │
  │     ACTIVE ↔ SUSPENDED                       │
  │     Suspended users cannot login             │
  │                                              │
  │  2. Change Account Type                      │
  │     INDIVIDUAL ↔ CAR_RENTAL                  │
  │     (Upgrade a user to rental business)      │
  │                                              │
  │  3. Toggle Verification                      │
  │     Verify/Unverify CNIC                     │
  │                                              │
  │  All changes trigger:                        │
  │  - In-app notification to user               │
  │  - Email notification to user                │
  │                                              │
  │  PATCH /admin/users/:id                      │
  │  { status, accountType, isVerified }         │
  └──────────────────────────────────────────────┘
```

---

### 8.3 Car Catalog Management

```
Admin navigates to /admin/catalog
        │
        ▼
GET /car-catalog ──────> shows all catalog entries
        │
   ┌────┴──────────────────────────────────────────┐
   │                                                │
   │  ADD NEW ──────> /admin/catalog/create         │
   │    Fill: manufacturer, model, year, variant,   │
   │    bodyType, fuelType, transmission, engine,    │
   │    seating, basePrice, description, features   │
   │    POST /car-catalog                           │
   │                                                │
   │  EDIT ──────> /admin/catalog/:id/edit          │
   │    PATCH /car-catalog/:id                      │
   │                                                │
   │  DELETE ──────> DELETE /car-catalog/:id         │
   │    ⚠️ Check: cars registered from this entry?   │
   │    If yes → may block or warn                  │
   │                                                │
   │  UPLOAD IMAGE ──────> POST /car-catalog/:id/   │
   │    image                                       │
   │                                                │
   │  BULK IMPORT ──────> POST /car-catalog/bulk    │
   │    Upload JSON/CSV of multiple entries          │
   └────────────────────────────────────────────────┘
```

---

### 8.4 Broadcast System Notification

```
Admin navigates to /admin/notifications
        │
        ▼
Fills form:
  - Title: "Scheduled Maintenance"
  - Message: "Platform will be down Saturday 2AM-4AM"
  - Recipients: All Users / Filtered
        │
        ▼
POST /admin/notifications
  {
    "title": "...",
    "message": "...",
    "type": "SYSTEM"
  }
        │
        ▼
Backend creates notification for ALL users
(or filtered subset)
        │
        ▼
All users see system notification in their bell icon
```

---

### 8.5 Platform Analytics

```
Admin navigates to /admin → Dashboard
        │
        ▼
GET /admin/stats
        │
        ▼
Returns:
  {
    "totalUsers": 1250,
    "individualUsers": 1100,
    "carRentalUsers": 148,
    "adminUsers": 2,
    "activeUsers": 1200,
    "suspendedUsers": 50,
    "pendingVerifications": 23,
    "totalCars": 850,
    "totalListings": 300,
    "activeListings": 180,
    "activeRentals": 45
  }
        │
        ▼
Admin sees dashboard cards + optional charts
```

---

## 9. Notification Flows

### 9.1 Notification Triggers

| Event | Recipient | Type | Message |
|-------|-----------|------|---------|
| CNIC Approved | User | VERIFICATION | "Your CNIC has been verified" |
| CNIC Rejected | User | VERIFICATION | "Your CNIC verification was rejected" |
| Account Suspended | User | WARNING | "Your account has been suspended" |
| Account Reactivated | User | INFO | "Your account has been reactivated" |
| Account Type Changed | User | INFO | "Your account type updated to CAR_RENTAL" |
| Listing Inquiry Received | Seller | INFO | "Someone inquired about [Car Title]" |
| Rental Created | Owner | RENTAL | "New rental created for [Car]" |
| Rental Completed | Owner | RENTAL | "Rental completed — Total: ₨X" |
| Rental Cancelled | Owner | RENTAL | "Rental cancelled for [Car]" |
| System Broadcast | All Users | SYSTEM | Custom admin message |

---

### 9.2 Notification UI Flow

```
User is on any page
        │
        ▼
🔔 Bell icon shows unread count ──────> GET /notifications/unread-count
        │
        ▼
User clicks bell → dropdown shows latest 5
        │
        ▼
Click "View All" → /dashboard/notifications
        │
        ▼
GET /notifications?page=1&limit=20
        │
        ▼
Click notification → Mark as read
  PATCH /notifications/:id/read
        │
        ▼
"Mark All as Read" button
  PATCH /notifications/read-all
        │
        ▼
Delete notification
  DELETE /notifications/:id
```

---

## 10. Error & Edge Case Flows

### 10.1 Session Expiry

```
User's accessToken expires (15 minutes)
        │
        ▼
API returns 401
        │
        ▼
Frontend interceptor attempts refresh
  POST /auth/refresh
        │
   ┌────┴──────────────┐
   │ Refresh succeeds   │ Refresh also expired (7 days)
   │ → Retry request    │ → Clear all tokens
   │ → User unaware     │ → Redirect to /auth/login
   └────────────────────┘   → Toast: "Session expired"
```

---

### 10.2 Account Suspended

```
Suspended user tries to login
        │
        ▼
POST /auth/login → 403 Forbidden
  "Your account has been suspended"
        │
        ▼
Show error on login page
User cannot proceed until admin reactivates
```

---

### 10.3 Unverified User Attempts Restricted Action

```
User without CNIC verification tries to:
  - Contact a seller
  - Create a rental (CAR_RENTAL)
        │
        ▼
Backend returns 403 Forbidden
  "CNIC verification required for this action"
        │
        ▼
Frontend shows modal:
  "You need to verify your CNIC first"
  [Go to Profile] → /dashboard/profile
```

---

### 10.4 Duplicate Car Registration

```
User tries POST /user-cars with existing registration number
        │
        ▼
Backend checks: registrationNumber unique per user
        │
        ▼
409 Conflict: "A car with this registration number already exists"
        │
        ▼
Frontend highlights registration # field with error
```

---

### 10.5 Delete Car with Active Listing

```
User tries DELETE /user-cars/:id
        │
        ▼
Backend checks for ACTIVE listings on this car
        │
        ▼
400 Bad Request: "Cannot delete car with active listings.
  Deactivate or mark as sold first."
```

---

### 10.6 Image Upload Failures

```
User uploads oversized image (> 10MB)
        │
        ▼
Backend returns 400: "File size exceeds 10MB limit"

User uploads wrong format (.gif, .bmp)
        │
        ▼
Backend returns 400: "Only JPG, PNG, WEBP formats allowed"

Cloudinary upload fails (service down)
        │
        ▼
Backend returns 500: "Image upload failed. Please try again."
```

---

### 10.7 YOLOv8 Service Unavailable

```
User runs damage detection
        │
        ▼
Backend calls Python FastAPI service
        │
        ▼
Service unreachable / timeout
        │
        ▼
Backend returns 503: "Damage detection service unavailable.
  Please try again later."
```

---

## Flow Summary Matrix

| Flow | Individual | Car Rental | Admin |
|------|:----------:|:----------:|:-----:|
| Email Register/Login | ✅ | ✅ | ❌ (seeded) |
| OAuth Login | ✅ | ✅ | ❌ |
| CNIC Upload | ✅ | ✅ | ❌ |
| Register Car | ✅ | ✅ | ❌ |
| Upload Registration Images | ✅ | ✅ | ❌ |
| Upload Periodic Images | ✅ | ✅ | ❌ |
| Run Damage Detection | ✅ | ✅ | ❌ |
| Download Damage PDF | ✅ | ✅ | ❌ |
| Create Listing | ✅ | ✅ | ❌ |
| Browse Marketplace | ✅ | ✅ | ❌ |
| Contact Seller | ✅ (verified) | ✅ (verified) | ❌ |
| Create Rental | ❌ | ✅ | ❌ |
| Complete Rental | ❌ | ✅ | ❌ |
| Download Rental PDF | ❌ | ✅ | ❌ |
| Verify CNICs | ❌ | ❌ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| Manage Catalog | ❌ | ❌ | ✅ |
| Send Notifications | ❌ | ❌ | ✅ |
| View Analytics | ❌ | ❌ | ✅ |

---

*This document covers every user journey in the platform. Cross-reference with the API Reference for exact endpoint details and with the Screens & UI guide for visual component specifications.*
