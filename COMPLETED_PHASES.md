# Completed Phases — Backend Implementation Details

> **Status:** ALL 52 ENDPOINTS BUILT  
> **Covers:** Phase 1 (Foundation & Auth) + Phase 2 (Users & Admin) + Phase 3 (Car Ecosystem)  
> **Base URL:** `http://localhost:3000/api/v1`  
> **Auth:** Bearer Token (JWT) unless marked PUBLIC  
> **Response Format:** `{ success: boolean, data: any, timestamp: string }`

---

## PHASE 1: Foundation & Authentication (9 Endpoints)

### What Was Built
- NestJS project scaffolding with TypeScript
- Prisma v7 schema with 8 models, 7 enums
- Database migration to PostgreSQL (Neon)
- Admin seed script
- JWT authentication (access 15min + refresh 7d)
- Google & Facebook OAuth strategy files (routes commented — need API keys)
- Global guards: JwtAuthGuard, RolesGuard, VerificationGuard
- Global filters: AllExceptionsFilter
- Global interceptors: TransformInterceptor
- Cloudinary integration for image uploads
- Email service (pluggable provider)
- Helmet security headers
- CORS configuration
- Swagger docs at `/api/docs`
- Validation pipe (whitelist + transform)

### Phase 1 Endpoints — Authentication Module

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `POST` | `/auth/register` | PUBLIC | Register new account (INDIVIDUAL or CAR_RENTAL) |
| 2 | `POST` | `/auth/login` | PUBLIC | Login with email & password |
| 3 | `POST` | `/auth/refresh` | JWT | Refresh access token using refresh token |
| 4 | `POST` | `/auth/logout` | JWT | Logout (invalidate refresh token) |
| 5 | `GET` | `/auth/me` | JWT | Get current authenticated user |
| 6 | `GET` | `/auth/google` | PUBLIC | *DISABLED — Google OAuth initiate* |
| 7 | `GET` | `/auth/google/callback` | PUBLIC | *DISABLED — Google OAuth callback* |
| 8 | `GET` | `/auth/facebook` | PUBLIC | *DISABLED — Facebook OAuth initiate* |
| 9 | `GET` | `/auth/facebook/callback` | PUBLIC | *DISABLED — Facebook OAuth callback* |

> **Note:** OAuth routes 6–9 are coded but commented out. They need Google/Facebook API credentials configured in `.env` to enable.

### Frontend Integration — Auth

**Register:**
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongP@ss123",
  "fullName": "Ahmed Khan",
  "accountType": "INDIVIDUAL",
  "phoneNumber": "+923001234567",
  "city": "Lahore",
  "businessName": "Khan Rentals",       // CAR_RENTAL only
  "businessLicense": "BL-12345"          // CAR_RENTAL only
}

Response 201:
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "fullName": "...", "accountType": "INDIVIDUAL", "isVerified": false },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Login:**
```
POST /api/v1/auth/login
{ "email": "user@example.com", "password": "StrongP@ss123" }

Response 200: Same shape as register
```

**Refresh:**
```
POST /api/v1/auth/refresh
Authorization: Bearer <access_token>
{ "refreshToken": "eyJ..." }

Response 200: { "data": { "accessToken": "new...", "refreshToken": "new..." } }
```

**Logout:**
```
POST /api/v1/auth/logout
Authorization: Bearer <access_token>

Response 200: { "message": "Logged out successfully" }
```

**Get Me:**
```
GET /api/v1/auth/me
Authorization: Bearer <access_token>

Response 200: { "data": { full user object } }
```

---

## PHASE 2: User Management & Admin (12 Endpoints)

### What Was Built
- User profile CRUD (get, update)
- Password change with bcrypt verification
- CNIC image upload to Cloudinary
- Avatar/profile picture upload to Cloudinary
- User dashboard statistics (different for INDIVIDUAL vs CAR_RENTAL)
- Admin user management (list, detail, update)
- Admin CNIC verification queue
- Admin system notification broadcast
- Admin platform analytics/stats
- Notification triggers on verification approval/rejection and suspension

### Phase 2 Endpoints — Users Module (6 endpoints)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `GET` | `/users/profile` | JWT | Get full profile |
| 2 | `PATCH` | `/users/profile` | JWT | Update profile fields |
| 3 | `POST` | `/users/change-password` | JWT | Change password |
| 4 | `POST` | `/users/upload-cnic` | JWT | Upload CNIC image (multipart/form-data, field: `cnic`) |
| 5 | `POST` | `/users/upload-avatar` | JWT | Upload avatar image (multipart/form-data, field: `avatar`) |
| 6 | `GET` | `/users/dashboard` | JWT | Dashboard stats (totalCars, activeListings, etc.) |

### Phase 2 Endpoints — Admin Module (6 endpoints)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 7 | `GET` | `/admin/users` | ADMIN | Get all users (paginated, filterable) |
| 8 | `GET` | `/admin/users/:id` | ADMIN | Get user detail |
| 9 | `PATCH` | `/admin/users/:id` | ADMIN | Update user (status, type, verification) |
| 10 | `GET` | `/admin/verifications` | ADMIN | Get pending CNIC verification queue |
| 11 | `POST` | `/admin/notifications` | ADMIN | Send system notification to users |
| 12 | `GET` | `/admin/stats` | ADMIN | Get platform analytics |

### Frontend Integration — Users

**Get Profile:**
```
GET /api/v1/users/profile
Authorization: Bearer <token>

Response 200:
{
  "data": {
    "id": "uuid", "email": "...", "accountType": "INDIVIDUAL",
    "fullName": "...", "phoneNumber": "...", "city": "...",
    "cnicImageUrl": "https://cloudinary...", "isVerified": false,
    "avatarUrl": "https://cloudinary...", "createdAt": "...", "lastLogin": "..."
  }
}
```

**Update Profile:**
```
PATCH /api/v1/users/profile
Authorization: Bearer <token>
{ "fullName": "New Name", "phoneNumber": "+923009876543", "city": "Karachi", "address": "..." }
```

**Change Password:**
```
POST /api/v1/users/change-password
Authorization: Bearer <token>
{ "currentPassword": "OldPass@123", "newPassword": "NewSecure@456" }
```

**Upload CNIC:**
```
POST /api/v1/users/upload-cnic
Authorization: Bearer <token>
Content-Type: multipart/form-data
Field: cnic = <image file> (max 5MB, jpg/png/webp)

Response 201: { "message": "CNIC image uploaded. Awaiting admin verification.", "cnicImageUrl": "..." }
```

**Upload Avatar:**
```
POST /api/v1/users/upload-avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
Field: avatar = <image file> (max 5MB, jpg/png/webp)

Response 201: { "message": "Avatar uploaded successfully", "avatarUrl": "..." }
```

**Dashboard Stats:**
```
GET /api/v1/users/dashboard
Authorization: Bearer <token>

Response (INDIVIDUAL): { "totalCars": 3, "activeListings": 1, "totalDamageDetections": 5, "cnicVerificationStatus": "VERIFIED" }
Response (CAR_RENTAL): { ...above + "activeRentalBookings": 8, "totalRevenue": 450000, "fleetUtilization": "32.00%" }
```

### Frontend Integration — Admin

**Get Users:**
```
GET /api/v1/admin/users?accountType=INDIVIDUAL&accountStatus=ACTIVE&isVerified=true&search=ahmed&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Update User (Verify/Suspend):**
```
PATCH /api/v1/admin/users/:id
Authorization: Bearer <admin_token>
{ "isVerified": true }                    // Approve CNIC
{ "accountStatus": "SUSPENDED" }          // Suspend user
{ "accountType": "CAR_RENTAL" }           // Upgrade user
```

**Verification Queue:**
```
GET /api/v1/admin/verifications?page=1&limit=20
Authorization: Bearer <admin_token>
```

**Send Notification:**
```
POST /api/v1/admin/notifications
Authorization: Bearer <admin_token>
{ "title": "Maintenance", "message": "Platform down 2AM-4AM", "sendToAll": true }
OR
{ "title": "Notice", "message": "Update license", "userIds": ["uuid-1", "uuid-2"] }
```

**Platform Stats:**
```
GET /api/v1/admin/stats
Authorization: Bearer <admin_token>

Response: {
  "users": { "total": 1250, "individuals": 1100, "rentalBusinesses": 148, "suspended": 12, "pendingVerifications": 23 },
  "cars": { "total": 850 },
  "listings": { "total": 320, "active": 180 },
  "rentals": { "total": 2100, "active": 45 }
}
```

---

## PHASE 3: Car Ecosystem (31 Endpoints)

### What Was Built
- Car catalog public browse with filters + admin CRUD
- Catalog image upload
- Bulk catalog create
- User car registration from catalog
- Car CRUD (get all, get one, update, delete, check registration images)
- Image upload: registration (4 permanent), periodic (4 versioned), single
- Image retrieval: all, registration only, inspection history
- Marketplace listings: browse (public), create, get my listings, update, change status, contact seller
- Rentals: create, get all, get stats, get detail, complete, cancel
- Damage detection: detect on single image, detect on car, get history
- Notifications: get all, unread count, mark read, mark all read, delete
- PDF reports: damage report, rental report

### Phase 3 Endpoints — Car Catalog (9 endpoints)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `GET` | `/car-catalog` | PUBLIC | Browse catalog with filters |
| 2 | `GET` | `/car-catalog/manufacturers` | PUBLIC | Get all manufacturer names |
| 3 | `GET` | `/car-catalog/manufacturers/:manufacturer/models` | PUBLIC | Get models by manufacturer |
| 4 | `GET` | `/car-catalog/:id` | PUBLIC | Get single catalog entry with images |
| 5 | `POST` | `/car-catalog` | ADMIN | Create new catalog entry |
| 6 | `POST` | `/car-catalog/bulk` | ADMIN | Bulk create catalog entries |
| 7 | `PATCH` | `/car-catalog/:id` | ADMIN | Update catalog entry |
| 8 | `DELETE` | `/car-catalog/:id` | ADMIN | Delete/deactivate catalog entry |
| 9 | `POST` | `/car-catalog/:id/images` | ADMIN | Upload catalog image |

### Frontend Integration — Car Catalog

**Browse Catalog:**
```
GET /api/v1/car-catalog?manufacturer=Toyota&modelName=Corolla&yearFrom=2020&yearTo=2026&bodyType=Sedan&fuelType=Petrol&transmission=Automatic&page=1&limit=20
```

**Get Manufacturers:**
```
GET /api/v1/car-catalog/manufacturers
Response: ["Toyota", "Honda", "Suzuki", "Hyundai", ...]
```

**Get Models by Manufacturer:**
```
GET /api/v1/car-catalog/manufacturers/Toyota/models
Response: [{ "modelName": "Corolla", "years": [2022, 2023, 2024], "variants": ["GLi", "XLi", "Altis"] }, ...]
```

**Create Catalog Entry (Admin):**
```
POST /api/v1/car-catalog
Authorization: Bearer <admin_token>
{
  "manufacturer": "Toyota", "modelName": "Corolla", "year": 2024, "variant": "GLi",
  "bodyType": "Sedan", "fuelType": "Petrol", "transmission": "Automatic",
  "engineCapacity": "1800cc", "seatingCapacity": 5, "basePrice": 5500000,
  "description": "...", "features": ["ABS", "Airbags"]
}
```

**Upload Catalog Image (Admin):**
```
POST /api/v1/car-catalog/:id/images
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
Fields: image=<file>, isPrimary="true", altText="Front view"
```

### Phase 3 Endpoints — User Cars (6 endpoints)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `POST` | `/user-cars` | JWT | Register a new car from catalog |
| 2 | `GET` | `/user-cars` | JWT | Get all my registered cars |
| 3 | `GET` | `/user-cars/:id` | JWT | Get car details |
| 4 | `PATCH` | `/user-cars/:id` | JWT | Update car (color, mileage, condition) |
| 5 | `DELETE` | `/user-cars/:id` | JWT | Delete car (blocked if active listings/rentals) |
| 6 | `GET` | `/user-cars/:id/has-registration-images` | JWT | Check if registration images exist |

### Frontend Integration — User Cars

**Register Car:**
```
POST /api/v1/user-cars
Authorization: Bearer <token>
{
  "catalogId": "catalog-uuid",
  "registrationNumber": "LEA-1234",
  "vinNumber": "1HGCM82633A004352",
  "color": "White", "mileage": 45000, "condition": "USED",
  "purchaseDate": "2022-06-15", "purchasePrice": 4200000
}
```

**Get All Cars:**
```
GET /api/v1/user-cars
Authorization: Bearer <token>
```

**Check Registration Images:**
```
GET /api/v1/user-cars/:id/has-registration-images
Response: { "hasRegistrationImages": true }
```

### Phase 3 Endpoints — Car Images (6 endpoints)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `POST` | `/car-images/:carId/registration` | JWT | Upload 4 registration images (PERMANENT) |
| 2 | `POST` | `/car-images/:carId/periodic` | JWT | Upload 4 periodic images (new version) |
| 3 | `POST` | `/car-images/:carId/upload` | JWT | Upload single image (damage/listing) |
| 4 | `GET` | `/car-images/:carId` | JWT | Get all images for a car |
| 5 | `GET` | `/car-images/:carId/registration` | JWT | Get registration images only |
| 6 | `GET` | `/car-images/:carId/inspection-history` | JWT | Get inspection history by version |

### Frontend Integration — Car Images

**Upload Registration Images (4 required, PERMANENT):**
```
POST /api/v1/car-images/:carId/registration
Authorization: Bearer <token>
Content-Type: multipart/form-data
Fields: front=<file>, back=<file>, left=<file>, right=<file>
(max 10MB each, jpg/png/webp)
```

**Upload Periodic Images (creates new version):**
```
POST /api/v1/car-images/:carId/periodic
Authorization: Bearer <token>
Content-Type: multipart/form-data
Fields: front=<file>, back=<file>, left=<file>, right=<file>
```

**Upload Single Image:**
```
POST /api/v1/car-images/:carId/upload?category=DAMAGE_DETECTION
Authorization: Bearer <token>
Content-Type: multipart/form-data
Field: image=<file>
```

**Get Inspection History:**
```
GET /api/v1/car-images/:carId/inspection-history
Response: {
  "data": {
    "carId": "uuid",
    "versions": [
      { "version": 3, "isCurrent": true, "uploadedAt": "...", "images": [...] },
      { "version": 2, "isCurrent": false, "uploadedAt": "...", "images": [...] }
    ]
  }
}
```

### Phase 3 Endpoints — Car Listings / Marketplace (7 endpoints)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `GET` | `/car-listings` | PUBLIC | Browse marketplace with filters |
| 2 | `GET` | `/car-listings/:id` | PUBLIC | Get listing details (increments view count) |
| 3 | `POST` | `/car-listings` | JWT + VERIFIED | Create listing (requires CNIC) |
| 4 | `GET` | `/car-listings/my/listings` | JWT | Get my listings |
| 5 | `PATCH` | `/car-listings/:id` | JWT | Update listing (price, title, desc) |
| 6 | `PATCH` | `/car-listings/:id/status` | JWT | Update status (SOLD, INACTIVE) |
| 7 | `POST` | `/car-listings/:id/contact` | JWT + VERIFIED | Contact seller via email |

### Frontend Integration — Marketplace

**Browse Listings:**
```
GET /api/v1/car-listings?manufacturer=Toyota&modelName=Corolla&yearFrom=2020&yearTo=2026&priceFrom=2000000&priceTo=5000000&city=Lahore&condition=USED&sortBy=price_asc&page=1&limit=20
```

**Create Listing:**
```
POST /api/v1/car-listings
Authorization: Bearer <token>   (user must be CNIC verified)
{
  "carId": "user-car-uuid",
  "askingPrice": 4500000,
  "title": "Toyota Corolla GLi 2022 - Excellent Condition",
  "description": "Single owner...",
  "isNegotiable": true
}
```

**Contact Seller:**
```
POST /api/v1/car-listings/:id/contact
Authorization: Bearer <token>   (user must be CNIC verified)
{ "buyerName": "Ali Hassan", "buyerEmail": "ali@example.com", "message": "Interested in your car" }
```

**Update Listing Status:**
```
PATCH /api/v1/car-listings/:id/status
Authorization: Bearer <token>
{ "status": "SOLD" }
```

### Phase 3 Endpoints — Rentals (6 endpoints)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `POST` | `/rentals` | CAR_RENTAL + VERIFIED | Create rental |
| 2 | `GET` | `/rentals` | CAR_RENTAL | Get all rentals (filtered) |
| 3 | `GET` | `/rentals/stats` | CAR_RENTAL | Business dashboard stats |
| 4 | `GET` | `/rentals/:id` | CAR_RENTAL | Get rental details |
| 5 | `PATCH` | `/rentals/:id/complete` | CAR_RENTAL | Complete rental (car returned) |
| 6 | `PATCH` | `/rentals/:id/cancel` | CAR_RENTAL | Cancel rental |

### Frontend Integration — Rentals

**Create Rental:**
```
POST /api/v1/rentals
Authorization: Bearer <token>   (CAR_RENTAL account + CNIC verified)
{
  "carId": "uuid", "renterName": "Hassan Ali", "renterPhone": "+923009876543",
  "renterEmail": "hassan@example.com", "renterCnic": "35201-1234567-8",
  "startDate": "2026-02-15", "endDate": "2026-02-20",
  "mileageAtStart": 45000, "rentalPrice": 15000, "preRentalNotes": "Minor scratch on rear bumper"
}
```

**Complete Rental:**
```
PATCH /api/v1/rentals/:id/complete
Authorization: Bearer <token>
{
  "mileageAtEnd": 45350, "postRentalNotes": "New dent on front-left door",
  "damageCharges": 5000, "damageDescription": "Dent ~3cm, front-left door", "totalCharges": 20000
}
```

**Get Stats:**
```
GET /api/v1/rentals/stats
Response: { "activeRentals": 3, "completedRentals": 47, "totalRentals": 52, "totalRevenue": 1250000 }
```

**Filter Rentals:**
```
GET /api/v1/rentals?status=ACTIVE&carId=uuid&fromDate=2026-02-01&toDate=2026-02-28&page=1&limit=20
```

### Phase 3 Endpoints — Damage Detection (3 endpoints)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `POST` | `/damage-detection/image` | JWT + VERIFIED | Run detection on single image |
| 2 | `POST` | `/damage-detection/car` | JWT + VERIFIED | Run detection on all current periodic images |
| 3 | `GET` | `/damage-detection/history/:carId` | JWT | Get damage detection history |

### Frontend Integration — Damage Detection

**Detect on Single Image:**
```
POST /api/v1/damage-detection/image
Authorization: Bearer <token>
{ "imageId": "car-image-uuid" }

Response: {
  "hasDamage": true, "confidence": 0.92,
  "detections": [{ "label": "dent", "confidence": 0.95, "bbox": [120,340,280,450] }],
  "processedImageUrl": "https://..."
}
```

**Detect on All Car Images:**
```
POST /api/v1/damage-detection/car
Authorization: Bearer <token>
{ "carId": "user-car-uuid" }

Response: {
  "carId": "uuid", "totalImagesScanned": 4, "imagesWithDamage": 2,
  "results": [{ "imageId": "uuid", "category": "PERIODIC_FRONT", "hasDamage": false, "detections": [] }, ...]
}
```

**Get History:**
```
GET /api/v1/damage-detection/history/:carId
Authorization: Bearer <token>
```

### Phase 3 Endpoints — Notifications (5 endpoints)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `GET` | `/notifications` | JWT | Get my notifications (paginated) |
| 2 | `GET` | `/notifications/unread-count` | JWT | Get unread count |
| 3 | `PATCH` | `/notifications/:id/read` | JWT | Mark as read |
| 4 | `PATCH` | `/notifications/read-all` | JWT | Mark all as read |
| 5 | `DELETE` | `/notifications/:id` | JWT | Delete notification |

### Frontend Integration — Notifications

**Get Notifications:**
```
GET /api/v1/notifications?unreadOnly=true&type=SUCCESS&page=1&limit=20
Authorization: Bearer <token>

Response: {
  "data": [{ "id": "uuid", "title": "CNIC Verified", "message": "...", "type": "SUCCESS", "isRead": false, "createdAt": "..." }],
  "unreadCount": 3,
  "meta": { "total": 15, "page": 1, "limit": 20, "totalPages": 1 }
}
```

**Unread Count (for bell icon badge):**
```
GET /api/v1/notifications/unread-count
Response: { "unreadCount": 3 }
```

### Phase 3 Endpoints — PDF Reports (2 endpoints)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `GET` | `/reports/damage/:carId` | JWT + VERIFIED | Download damage report PDF |
| 2 | `GET` | `/reports/rental/:rentalId` | JWT + VERIFIED | Download rental summary PDF |

### Frontend Integration — PDF Reports

**Download Damage Report:**
```
GET /api/v1/reports/damage/:carId
Authorization: Bearer <token>
Response: Binary PDF file (Content-Type: application/pdf)
```

**Download Rental Report:**
```
GET /api/v1/reports/rental/:rentalId
Authorization: Bearer <token>
Response: Binary PDF file
```

> Frontend should use: `window.open(url)` or `<a href={url} download>` with auth token in header via fetch + blob download.

---

## Database Schema (Implemented)

### Models (8 tables)
| Model | Table Name | Purpose |
|-------|-----------|---------|
| `User` | `users` | All platform accounts |
| `CarCatalog` | `car_catalog` | Admin-managed car reference catalog |
| `CarCatalogImage` | `car_catalog_images` | Stock photos for catalog entries |
| `UserCar` | `user_cars` | User-owned car instances |
| `CarImage` | `car_images` | All user car photos (registration/periodic/damage/listing) |
| `CarListing` | `car_listings` | Marketplace resale listings |
| `Rental` | `rentals` | Rental records for car rental businesses |
| `Notification` | `notifications` | In-app notification system |

### Enums (7)
| Enum | Values |
|------|--------|
| `AccountType` | INDIVIDUAL, CAR_RENTAL, ADMIN |
| `AccountStatus` | ACTIVE, SUSPENDED, DELETED |
| `CarCondition` | NEW, USED, DAMAGED |
| `ListingStatus` | ACTIVE, SOLD, PENDING, INACTIVE |
| `ImageCategory` | REGISTRATION_FRONT/BACK/LEFT/RIGHT, PERIODIC_FRONT/BACK/LEFT/RIGHT, DAMAGE_DETECTION, LISTING_IMAGE |
| `RentalStatus` | ACTIVE, COMPLETED, CANCELLED |
| `NotificationType` | INFO, WARNING, SUCCESS, ERROR, SYSTEM |

---

## Guards & Decorators (Implemented)

| Guard/Decorator | Purpose | Usage |
|-----------------|---------|-------|
| `JwtAuthGuard` | Global — protects all routes | Opt-out with `@Public()` |
| `RolesGuard` | Enforces role-based access | `@Roles('ADMIN')`, `@Roles('CAR_RENTAL')` |
| `VerificationGuard` | Requires CNIC verification | `@RequireVerification()` |
| `@Public()` | Marks route as public (no JWT needed) | On register, login, catalog browse, marketplace browse |
| `@CurrentUser()` | Extracts user from JWT token | `@CurrentUser('id')` for userId |
| `@Roles()` | Specifies required role(s) | Admin endpoints, rental endpoints |
| `@RequireVerification()` | Requires isVerified=true | Create listing, contact seller, create rental, damage detection, PDF reports |

---

## Error Response Format (Implemented)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-02-14T12:00:00.000Z"
}
```

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation error |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (wrong role or not verified) |
| 404 | Not Found |
| 409 | Conflict (duplicate data) |
| 500 | Internal Server Error |

---

## Environment Variables (Required)

```env
DATABASE_URL=postgresql://user:pass@host/dbname
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/v1/auth/facebook/callback
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
DAMAGE_DETECTION_SERVICE_URL=http://localhost:8000
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@carplatform.pk
FRONTEND_URL=http://localhost:3001
ADMIN_EMAIL=admin@carplatform.pk
ADMIN_PASSWORD=Admin@123456
PORT=3000
```

---

*This document covers all 52 implemented backend endpoints with complete frontend integration details.*
