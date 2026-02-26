# Carper Backend — API Reference for Frontend Developers

This document lists **all API endpoints**, request shapes, and response shapes for frontend integration. Use it alongside Swagger at `http://localhost:3000/api/docs` for live testing.

---

## 1. Base URL & Auth

| Item | Value |
|------|--------|
| **Base URL** | `http://localhost:3000/api/v1` (or your backend `PORT` and host) |
| **Auth** | Bearer JWT in header: `Authorization: Bearer <accessToken>` |
| **Content-Type** | `application/json` for JSON bodies; `multipart/form-data` for file uploads |

**Public routes** do not require a token: register, login, car catalog browse, marketplace browse. All other routes require a valid JWT.

---

## 2. Global Response Format

Every **successful** response is wrapped by the backend as:

```json
{
  "success": true,
  "data": <payload>,
  "timestamp": "2026-02-27T12:00:00.000Z"
}
```

- The **payload** is in `data`. If the controller returns an object (e.g. `{ data: users, meta: {} }`), then the **actual list** is at `response.data.data` and **meta** at `response.data.meta`.
- After a typical HTTP client (e.g. axios): `res.data` = full body → **payload** = `res.data.data`. For paginated lists, **items** = `res.data.data.data`, **meta** = `res.data.data.meta`.

**Example — paginated list (e.g. admin users):**

- HTTP body: `{ success: true, data: { data: [...users], meta: { total, page, limit, totalPages } }, timestamp: "..." }`
- In code: `const users = res.data?.data?.data ?? [];` and `const meta = res.data?.data?.meta;`

**Example — single object (e.g. auth/me):**

- HTTP body: `{ success: true, data: { id, email, fullName, ... }, timestamp: "..." }`
- In code: `const user = res.data?.data;`

---

## 3. Error Response Format

On error, the backend returns (no `data`):

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed" | ["field must be a string", ...] | { "field": "error" },
  "timestamp": "2026-02-27T12:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

| statusCode | Meaning |
|------------|---------|
| 400 | Bad Request / validation error |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (wrong role or not verified) |
| 404 | Not Found |
| 409 | Conflict (e.g. duplicate email) |
| 500 | Internal server error |

Always use `response.data?.data` for success payload and `response.data?.message` (and `response.status`) for errors.

---

## 4. Enums (for types and filters)

| Enum | Values |
|------|--------|
| **AccountType** | `INDIVIDUAL`, `CAR_RENTAL`, `ADMIN` |
| **AccountStatus** | `ACTIVE`, `SUSPENDED`, `DELETED` |
| **CarCondition** | `NEW`, `USED`, `DAMAGED` |
| **ListingStatus** | `ACTIVE`, `SOLD`, `PENDING`, `INACTIVE` |
| **RentalStatus** | `ACTIVE`, `COMPLETED`, `CANCELLED` |
| **NotificationType** | `INFO`, `WARNING`, `SUCCESS`, `ERROR`, `SYSTEM` |

---

## 5. Quick Endpoint Table

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **Auth** |
| POST | `/auth/register` | PUBLIC | Register |
| POST | `/auth/login` | PUBLIC | Login |
| POST | `/auth/refresh` | JWT | Refresh access token |
| POST | `/auth/logout` | JWT | Logout |
| GET | `/auth/me` | JWT | Current user |
| **Users** |
| GET | `/users/profile` | JWT | Get my profile |
| PATCH | `/users/profile` | JWT | Update profile |
| POST | `/users/change-password` | JWT | Change password |
| POST | `/users/upload-cnic` | JWT | Upload CNIC (multipart) |
| POST | `/users/upload-avatar` | JWT | Upload avatar (multipart) |
| GET | `/users/dashboard` | JWT | Dashboard stats |
| **Admin** |
| GET | `/admin/users` | ADMIN | List users (paginated) |
| GET | `/admin/users/:id` | ADMIN | User detail |
| PATCH | `/admin/users/:id` | ADMIN | Update user |
| GET | `/admin/verifications` | ADMIN | Pending verifications |
| POST | `/admin/notifications` | ADMIN | Send notification |
| GET | `/admin/stats` | ADMIN | Platform stats |
| **Car catalog** |
| GET | `/car-catalog` | PUBLIC | Browse catalog |
| GET | `/car-catalog/manufacturers` | PUBLIC | Manufacturers list |
| GET | `/car-catalog/manufacturers/:manufacturer/models` | PUBLIC | Models by manufacturer |
| GET | `/car-catalog/:id` | PUBLIC | Catalog entry by id |
| POST | `/car-catalog` | ADMIN | Create catalog entry |
| POST | `/car-catalog/bulk` | ADMIN | Bulk create |
| PATCH | `/car-catalog/:id` | ADMIN | Update catalog entry |
| DELETE | `/car-catalog/:id` | ADMIN | Delete catalog entry |
| POST | `/car-catalog/:id/images` | ADMIN | Upload catalog image |
| **User cars** |
| POST | `/user-cars` | JWT | Register car from catalog |
| GET | `/user-cars` | JWT | My cars |
| GET | `/user-cars/:id` | JWT | Car detail |
| PATCH | `/user-cars/:id` | JWT | Update car |
| DELETE | `/user-cars/:id` | JWT | Delete car |
| GET | `/user-cars/:id/has-registration-images` | JWT | Has registration images |
| **Car images** |
| POST | `/car-images/:carId/registration` | JWT | Upload 4 registration images |
| POST | `/car-images/:carId/periodic` | JWT | Upload 4 periodic images |
| POST | `/car-images/:carId/upload` | JWT | Upload single image |
| GET | `/car-images/:carId` | JWT | All images for car |
| GET | `/car-images/:carId/registration` | JWT | Registration images only |
| GET | `/car-images/:carId/inspection-history` | JWT | Inspection history |
| **Car listings (marketplace)** |
| GET | `/car-listings` | PUBLIC | Browse listings |
| GET | `/car-listings/:id` | PUBLIC | Listing detail |
| POST | `/car-listings` | JWT + VERIFIED | Create listing |
| GET | `/car-listings/my/listings` | JWT | My listings |
| PATCH | `/car-listings/:id` | JWT | Update listing |
| PATCH | `/car-listings/:id/status` | JWT | Update status |
| POST | `/car-listings/:id/contact` | JWT + VERIFIED | Contact seller |
| **Rentals** |
| POST | `/rentals` | CAR_RENTAL + VERIFIED | Create rental |
| GET | `/rentals` | CAR_RENTAL | List rentals |
| GET | `/rentals/stats` | CAR_RENTAL | Rental stats |
| GET | `/rentals/:id` | CAR_RENTAL | Rental detail |
| PATCH | `/rentals/:id/complete` | CAR_RENTAL | Complete rental |
| PATCH | `/rentals/:id/cancel` | CAR_RENTAL | Cancel rental |
| **Damage detection** |
| POST | `/damage-detection/image` | JWT + VERIFIED | Detect on single image |
| POST | `/damage-detection/car` | JWT + VERIFIED | Detect on car images |
| GET | `/damage-detection/history/:carId` | JWT | Detection history |
| **Notifications** |
| GET | `/notifications` | JWT | My notifications (paginated) |
| GET | `/notifications/unread-count` | JWT | Unread count |
| PATCH | `/notifications/:id/read` | JWT | Mark read |
| PATCH | `/notifications/read-all` | JWT | Mark all read |
| DELETE | `/notifications/:id` | JWT | Delete notification |
| **Reports (PDF)** |
| GET | `/reports/damage/:carId` | JWT + VERIFIED | Download damage PDF |
| GET | `/reports/rental/:rentalId` | JWT + VERIFIED | Download rental PDF |

---

## 6. Detailed Endpoints: Request & Response

All paths are relative to base `/api/v1`. Response shapes are the **payload** (what is inside `data` after the global wrapper).

---

### 6.1 Auth

#### POST `/auth/register` (PUBLIC)

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "StrongP@ss123",
  "fullName": "Ahmed Khan",
  "accountType": "INDIVIDUAL",
  "phoneNumber": "+923001234567",
  "city": "Lahore",
  "businessName": "Khan Rentals",
  "businessLicense": "BL-12345"
}
```

- Required: `email`, `password`, `fullName`, `accountType` (`INDIVIDUAL` | `CAR_RENTAL`).
- Optional: `phoneNumber`, `city`, `address`, `country`, `postalCode`.
- For `accountType: "CAR_RENTAL"`: optional `businessName`, `businessLicense`.

**Response (201):** payload = `{ user, accessToken, refreshToken }`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "Ahmed Khan",
    "accountType": "INDIVIDUAL",
    "isVerified": false
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

#### POST `/auth/login` (PUBLIC)

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "StrongP@ss123"
}
```

**Response (200):** same shape as register (`user`, `accessToken`, `refreshToken`).

---

#### POST `/auth/refresh` (JWT)

**Request body:**

```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200):** payload = `{ accessToken, refreshToken }` (new tokens).

---

#### POST `/auth/logout` (JWT)

No body. **Response (200):** payload = `{ message: "Logged out successfully" }`.

---

#### GET `/auth/me` (JWT)

No body. **Response (200):** payload = current user object (id, email, fullName, accountType, accountStatus, isVerified, etc.).

---

### 6.2 Users

#### GET `/users/profile` (JWT)

**Response (200):** payload = profile object (id, email, fullName, phoneNumber, city, address, cnicImageUrl, isVerified, avatarUrl, createdAt, lastLogin, ...).

---

#### PATCH `/users/profile` (JWT)

**Request body (all optional):**

```json
{
  "fullName": "New Name",
  "phoneNumber": "+923009876543",
  "city": "Karachi",
  "address": "123 Street",
  "country": "Pakistan",
  "postalCode": "54000"
}
```

**Response (200):** payload = updated user profile.

---

#### POST `/users/change-password` (JWT)

**Request body:**

```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewSecure@456"
}
```

**Response (200):** payload = `{ message: "Password changed successfully" }`.

---

#### POST `/users/upload-cnic` (JWT)

- **Content-Type:** `multipart/form-data`
- **Field name:** `cnic` (file; max 5MB; jpg/png/webp).

**Response (201):** payload = `{ message: "CNIC image uploaded. Awaiting admin verification.", cnicImageUrl: "https://..." }`.

---

#### POST `/users/upload-avatar` (JWT)

- **Content-Type:** `multipart/form-data`
- **Field name:** `avatar` (file; max 5MB; jpg/png/webp).

**Response (201):** payload = `{ message: "Avatar uploaded successfully", avatarUrl: "https://..." }`.

---

#### GET `/users/dashboard` (JWT)

**Response (200):** payload depends on account type.

- **INDIVIDUAL:** `{ totalCars, activeListings, totalDamageDetections, cnicVerificationStatus }`
- **CAR_RENTAL:** above + `{ activeRentalBookings, totalRevenue, fleetUtilization }`

---

### 6.3 Admin

#### GET `/admin/users` (ADMIN)

**Query params (all optional):**

- `accountType`: INDIVIDUAL | CAR_RENTAL
- `accountStatus`: ACTIVE | SUSPENDED | DELETED
- `isVerified`: true | false
- `search`: string (name/email)
- `page`: number (default 1)
- `limit`: number (default 20)

**Response (200):** payload = `{ data: User[], meta: { total, page, limit, totalPages } }`.

**Frontend:** `users = res.data.data.data`, `meta = res.data.data.meta`. Each user includes `_count: { cars, listings, rentals }` and fields like id, email, fullName, accountType, accountStatus, isVerified, phoneNumber, city, businessName, cnicImageUrl, avatarUrl, createdAt, lastLogin.

---

#### GET `/admin/users/:id` (ADMIN)

**Response (200):** payload = full user object (including address, country, postalCode, business details, car/listings/rentals counts).

---

#### PATCH `/admin/users/:id` (ADMIN)

**Request body (all optional):**

```json
{
  "accountStatus": "SUSPENDED",
  "accountType": "CAR_RENTAL",
  "isVerified": true
}
```

**Response (200):** payload = updated user object.

---

#### GET `/admin/verifications` (ADMIN)

**Query params:** `page`, `limit` (optional).

**Response (200):** payload = `{ data: User[], meta: { total, page, limit, totalPages } }` (users with CNIC pending verification). Same unwrap: `res.data.data.data`, `res.data.data.meta`.

---

#### POST `/admin/notifications` (ADMIN)

**Request body (one of):**

```json
{
  "title": "Maintenance",
  "message": "Platform down 2AM-4AM",
  "sendToAll": true
}
```

or

```json
{
  "title": "Notice",
  "message": "Update license",
  "userIds": ["uuid-1", "uuid-2"]
}
```

**Response (200):** payload = `{ message: "Notification sent to N users" }`.

---

#### GET `/admin/stats` (ADMIN)

**Response (200):** payload =

```json
{
  "users": {
    "total": 1250,
    "individuals": 1100,
    "rentalBusinesses": 148,
    "suspended": 12,
    "pendingVerifications": 23
  },
  "cars": { "total": 850 },
  "listings": { "total": 320, "active": 180 },
  "rentals": { "total": 2100, "active": 45 }
}
```

---

### 6.4 Car catalog

#### GET `/car-catalog` (PUBLIC)

**Query params (all optional):** `manufacturer`, `modelName`, `yearFrom`, `yearTo`, `bodyType`, `fuelType`, `transmission`, `page`, `limit`.

**Response (200):** payload = `{ data: CarCatalog[], meta: { total, page, limit, totalPages } }`. Unwrap: `res.data.data.data`, `res.data.data.meta`.

---

#### GET `/car-catalog/manufacturers` (PUBLIC)

**Response (200):** payload = `["Toyota", "Honda", "Suzuki", ...]` (array of strings).

---

#### GET `/car-catalog/manufacturers/:manufacturer/models` (PUBLIC)

**Response (200):** payload = array of `{ modelName, years[], variants[] }`.

---

#### GET `/car-catalog/:id` (PUBLIC)

**Response (200):** payload = catalog entry with images (id, manufacturer, modelName, year, variant, bodyType, fuelType, transmission, engineCapacity, seatingCapacity, basePrice, description, features, images[]).

---

#### POST `/car-catalog` (ADMIN)

**Request body:**

```json
{
  "manufacturer": "Toyota",
  "modelName": "Corolla",
  "year": 2024,
  "variant": "GLi",
  "bodyType": "Sedan",
  "fuelType": "Petrol",
  "transmission": "Automatic",
  "engineCapacity": "1800cc",
  "seatingCapacity": 5,
  "basePrice": 5500000,
  "description": "...",
  "features": ["ABS", "Airbags"]
}
```

**Response (201):** payload = created catalog entry.

---

#### POST `/car-catalog/bulk` (ADMIN)

**Request body:** array of same objects as single create. **Response (201):** payload = `{ created: number, failed: number, errors?: [...] }`.

---

#### PATCH `/car-catalog/:id` (ADMIN)

**Request body:** same fields as create (all optional). **Response (200):** payload = updated catalog entry.

---

#### DELETE `/car-catalog/:id` (ADMIN)

**Response (200):** payload = `{ message: "..." }`.

---

#### POST `/car-catalog/:id/images` (ADMIN)

- **Content-Type:** `multipart/form-data`
- **Fields:** `image` (file), optional `isPrimary` ("true"/"false"), optional `altText`.

**Response (201):** payload = created image or catalog with images.

---

### 6.5 User cars

#### POST `/user-cars` (JWT)

**Request body:**

```json
{
  "catalogId": "catalog-uuid",
  "registrationNumber": "LEA-1234",
  "vinNumber": "1HGCM82633A004352",
  "color": "White",
  "mileage": 45000,
  "condition": "USED",
  "purchaseDate": "2022-06-15",
  "purchasePrice": 4200000
}
```

**Response (201):** payload = created user car (with catalog relation).

---

#### GET `/user-cars` (JWT)

**Response (200):** payload = array of user's cars (with catalog info).

---

#### GET `/user-cars/:id` (JWT)

**Response (200):** payload = single user car with catalog and image counts/details.

---

#### PATCH `/user-cars/:id` (JWT)

**Request body (optional):** `color`, `mileage`, `condition`, etc. **Response (200):** payload = updated car.

---

#### DELETE `/user-cars/:id` (JWT)

**Response (200):** payload = `{ message: "..." }`. Blocked if car has active listings or rentals.

---

#### GET `/user-cars/:id/has-registration-images` (JWT)

**Response (200):** payload = `{ hasRegistrationImages: true | false }`.

---

### 6.6 Car images

#### POST `/car-images/:carId/registration` (JWT)

- **Content-Type:** `multipart/form-data`
- **Fields:** `front`, `back`, `left`, `right` (4 files; max 10MB each; jpg/png/webp).

**Response (201):** payload = message or image list.

---

#### POST `/car-images/:carId/periodic` (JWT)

Same as registration: 4 fields `front`, `back`, `left`, `right`. Creates a new inspection version.

**Response (201):** payload = new version info.

---

#### POST `/car-images/:carId/upload` (JWT)

- **Content-Type:** `multipart/form-data`
- **Field:** `image` (file).
- **Query param:** `category` = e.g. `DAMAGE_DETECTION`, `LISTING_IMAGE`.

**Response (201):** payload = created image.

---

#### GET `/car-images/:carId` (JWT)

**Response (200):** payload = all images for the car (grouped by category).

---

#### GET `/car-images/:carId/registration` (JWT)

**Response (200):** payload = registration images only.

---

#### GET `/car-images/:carId/inspection-history` (JWT)

**Response (200):** payload = `{ carId, versions: [{ version, isCurrent, uploadedAt, images[] }, ...] }`.

---

### 6.7 Car listings (marketplace)

#### GET `/car-listings` (PUBLIC)

**Query params (optional):** `manufacturer`, `modelName`, `yearFrom`, `yearTo`, `priceFrom`, `priceTo`, `city`, `condition`, `sortBy` (e.g. `price_asc`, `price_desc`, `newest`), `page`, `limit`.

**Response (200):** payload = `{ data: Listing[], meta: { total, page, limit, totalPages } }`. Unwrap: `res.data.data.data`, `res.data.data.meta`.

---

#### GET `/car-listings/:id` (PUBLIC)

**Response (200):** payload = listing detail (increments view count). Includes car, seller summary, images.

---

#### POST `/car-listings` (JWT + VERIFIED)

**Request body:**

```json
{
  "carId": "user-car-uuid",
  "askingPrice": 4500000,
  "title": "Toyota Corolla GLi 2022 - Excellent Condition",
  "description": "Single owner...",
  "isNegotiable": true
}
```

**Response (201):** payload = created listing.

---

#### GET `/car-listings/my/listings` (JWT)

**Response (200):** payload = array of current user's listings.

---

#### PATCH `/car-listings/:id` (JWT)

**Request body (optional):** `askingPrice`, `title`, `description`, `isNegotiable`. **Response (200):** payload = updated listing.

---

#### PATCH `/car-listings/:id/status` (JWT)

**Request body:** `{ "status": "SOLD" | "INACTIVE" }`. **Response (200):** payload = updated listing.

---

#### POST `/car-listings/:id/contact` (JWT + VERIFIED)

**Request body:**

```json
{
  "buyerName": "Ali Hassan",
  "buyerEmail": "ali@example.com",
  "message": "Interested in your car"
}
```

**Response (200):** payload = `{ message: "..." }` (email sent to seller).

---

### 6.8 Rentals

#### POST `/rentals` (CAR_RENTAL + VERIFIED)

**Request body:**

```json
{
  "carId": "uuid",
  "renterName": "Hassan Ali",
  "renterPhone": "+923009876543",
  "renterEmail": "hassan@example.com",
  "renterCnic": "35201-1234567-8",
  "startDate": "2026-02-15",
  "endDate": "2026-02-20",
  "mileageAtStart": 45000,
  "rentalPrice": 15000,
  "preRentalNotes": "Minor scratch on rear bumper"
}
```

**Response (201):** payload = created rental.

---

#### GET `/rentals` (CAR_RENTAL)

**Query params (optional):** `status` (ACTIVE | COMPLETED | CANCELLED), `carId`, `fromDate`, `toDate`, `page`, `limit`.

**Response (200):** payload = `{ data: Rental[], meta: { total, page, limit, totalPages } }`. Unwrap: `res.data.data.data`, `res.data.data.meta`.

---

#### GET `/rentals/stats` (CAR_RENTAL)

**Response (200):** payload = `{ activeRentals, completedRentals, totalRentals, totalRevenue }`.

---

#### GET `/rentals/:id` (CAR_RENTAL)

**Response (200):** payload = rental detail (car, renter info, dates, mileage, charges, etc.).

---

#### PATCH `/rentals/:id/complete` (CAR_RENTAL)

**Request body:**

```json
{
  "mileageAtEnd": 45350,
  "postRentalNotes": "New dent on front-left door",
  "damageCharges": 5000,
  "damageDescription": "Dent ~3cm, front-left door",
  "totalCharges": 20000
}
```

**Response (200):** payload = updated rental.

---

#### PATCH `/rentals/:id/cancel` (CAR_RENTAL)

No body. **Response (200):** payload = updated rental (status CANCELLED).

---

### 6.9 Damage detection

#### POST `/damage-detection/image` (JWT + VERIFIED)

**Request body:** `{ "imageId": "car-image-uuid" }`.

**Response (200):** payload = `{ hasDamage, confidence, detections: [{ label, confidence, bbox }], processedImageUrl }`.

---

#### POST `/damage-detection/car` (JWT + VERIFIED)

**Request body:** `{ "carId": "user-car-uuid" }`.

**Response (200):** payload = `{ carId, totalImagesScanned, imagesWithDamage, results: [{ imageId, category, hasDamage, detections }] }`.

---

#### GET `/damage-detection/history/:carId` (JWT)

**Response (200):** payload = array of past detection runs for the car.

---

### 6.10 Notifications

#### GET `/notifications` (JWT)

**Query params (optional):** `unreadOnly` (true/false), `type` (NotificationType), `page`, `limit`.

**Response (200):** payload = `{ data: Notification[], unreadCount, meta: { total, page, limit, totalPages } }`. Unwrap: `res.data.data.data`, `res.data.data.unreadCount`, `res.data.data.meta`.

---

#### GET `/notifications/unread-count` (JWT)

**Response (200):** payload = `{ unreadCount: number }`.

---

#### PATCH `/notifications/:id/read` (JWT)

No body. **Response (200):** payload = updated notification or message.

---

#### PATCH `/notifications/read-all` (JWT)

No body. **Response (200):** payload = message.

---

#### DELETE `/notifications/:id` (JWT)

**Response (200):** payload = message.

---

### 6.11 Reports (PDF)

#### GET `/reports/damage/:carId` (JWT + VERIFIED)

Returns **binary PDF**. Headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename=damage-report-{carId}.pdf`.

**Frontend:** use fetch with `Authorization: Bearer <token>`, then `blob()` and create object URL or trigger download.

---

#### GET `/reports/rental/:rentalId` (JWT + VERIFIED)

Returns **binary PDF**. Headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename=rental-report-{rentalId}.pdf`.

**Frontend:** same as damage report (fetch + blob + download).

---

## 7. Pagination Convention

Endpoints that return paginated lists use:

- **Query:** `page` (1-based), `limit` (default often 20).
- **Payload:** `{ data: T[], meta: { total, page, limit, totalPages } }`.

After global wrap: **items** = `response.data.data.data`, **meta** = `response.data.data.meta`. Always guard with `(response.data?.data?.data ?? []).map(...)` to avoid `map is not a function` when the API returns an error or unexpected shape.

---

## 8. File uploads summary

| Endpoint | Field(s) | Notes |
|----------|----------|--------|
| POST `/users/upload-cnic` | `cnic` | Single file, max 5MB |
| POST `/users/upload-avatar` | `avatar` | Single file, max 5MB |
| POST `/car-catalog/:id/images` | `image`, optional `isPrimary`, `altText` | Catalog image |
| POST `/car-images/:carId/registration` | `front`, `back`, `left`, `right` | 4 files, max 10MB each |
| POST `/car-images/:carId/periodic` | `front`, `back`, `left`, `right` | Same |
| POST `/car-images/:carId/upload` | `image` + query `category` | Single file |

---

## 9. Swagger

Interactive API docs: **http://localhost:3000/api/docs**. Use “Authorize” with `Bearer <accessToken>` to call protected endpoints.

---

*Document version: 1.0 — matches backend as of Phase 1–3 (52 endpoints).*
