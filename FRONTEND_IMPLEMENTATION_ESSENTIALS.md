# Frontend Implementation Essentials

> **Last Updated:** February 2026  
> **Purpose:** Essential information for frontend developers to integrate with the backend API

---

## 🔑 Authentication

### Required Environment Variables
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
```

### Token Storage
- **Access Token:** Store in memory or secure storage (15 min expiry)
- **Refresh Token:** Store securely (7 days expiry)
- **Token Refresh:** Implement automatic refresh before expiry

### Auth Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - Email/password login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Invalidate refresh token
- `GET /auth/google` - Initiate Google OAuth (redirect)
- `GET /auth/google/callback` - Google callback (handled by backend)
- `GET /auth/me` - Get current user (requires token)

### Google OAuth Flow
1. User clicks "Login with Google"
2. Redirect to: `{API_URL}/auth/google`
3. Backend redirects to Google login
4. After login, Google redirects to: `{FRONTEND_URL}/auth/callback?accessToken=...&refreshToken=...`
5. Extract tokens from URL and store
6. Redirect to dashboard

---

## 📡 API Configuration

### Base Configuration
- **Base URL:** `http://localhost:3000/api/v1` (dev) or your production URL
- **Content-Type:** `application/json` for most requests
- **File Uploads:** `multipart/form-data` for images/CSV
- **Auth Header:** `Authorization: Bearer {accessToken}`

### Response Format
All responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-02-15T10:30:00Z"
}
```

### Error Handling
- **401 Unauthorized:** Token expired/invalid → Refresh token or redirect to login
- **403 Forbidden:** Insufficient permissions → Show error message
- **404 Not Found:** Resource doesn't exist → Show 404 page
- **409 Conflict:** Duplicate data → Show validation error
- **422 Validation Error:** Invalid input → Show field errors

---

## 🚗 Core Features to Implement

### 1. User Registration & Login
**Required Fields:**
- Email, Password, Full Name, Phone Number, City, Address
- Account Type: `INDIVIDUAL` or `CAR_RENTAL`
- Business Name & License (if CAR_RENTAL)

**CNIC Verification:**
- Upload CNIC image after registration
- Show verification status: `NOT_UPLOADED`, `PENDING`, `VERIFIED`
- Block certain actions until verified

### 2. Car Registration Flow
**Step 1: Select from Catalog**
- Fetch catalog: `GET /car-catalog`
- Filter by manufacturer, model, year
- User selects car from catalog

**Step 2: Enter Car Details**
- Registration number (required, unique)
- Color, mileage, condition, purchase info
- Endpoint: `POST /user-cars`

**Step 3: Upload Registration Images**
- Upload 4 images: Front, Back, Left, Right
- Endpoint: `POST /car-images/:carId/register`
- These images are **permanent** (cannot be changed)

**Step 4: Complete Registration**
- Car is now registered and visible in "My Cars"

### 3. Marketplace Listings
**Browse Listings:**
- Endpoint: `GET /car-listings`
- Filters: manufacturer, model, year, price range, city, condition
- Pagination: `page` and `limit` query params

**Create Listing:**
- Requires: CNIC verification
- Select car from "My Cars"
- Set price, title, description, negotiable flag
- Upload additional listing images
- Endpoint: `POST /car-listings`

**View Listing:**
- Endpoint: `GET /car-listings/:id`
- Shows car details, images, damage history
- Contact seller (requires CNIC verification)

### 4. Damage Detection
**Upload Image:**
- Endpoint: `POST /car-images/:carId/damage-detection`
- Upload single image for detection

**Run Detection:**
- Endpoint: `POST /damage-detection/image/:imageId`
- Returns: damage results with bounding boxes, confidence scores

**View Results:**
- Display detected damages on image
- Show severity levels
- Download PDF report: `GET /pdf/damage-report/:imageId`

### 5. Rental Management (CAR_RENTAL only)
**Create Rental:**
- Endpoint: `POST /rentals`
- Requires: CNIC verification
- Enter renter details, dates, pricing

**Pre-Rental Inspection:**
- Upload 4 images automatically captured
- Add pre-rental notes
- Endpoint: `PUT /rentals/:id/pre-inspect`

**Complete Rental:**
- Upload post-rental images
- Calculate damage charges
- Endpoint: `PUT /rentals/:id/complete`

**Download Report:**
- Endpoint: `GET /pdf/rental-report/:rentalId`

### 6. Bulk Import (CAR_RENTAL only)
**CSV Format:**
```csv
registrationNumber,manufacturer,modelName,year,variant,color,mileage,condition
ABC-123,Toyota,Corolla,2020,GLI,White,50000,USED
```

**Endpoint:** `POST /user-cars/bulk-import`
- Content-Type: `multipart/form-data`
- Form field: `file` (CSV file)
- Query param: `validateOnly=true` (optional, for validation only)

**Response:**
- Shows successful/failed rows
- Lists errors with row numbers

---

## 📸 Image Upload Requirements

### File Specifications
- **Max Size:** 10MB per image
- **Formats:** JPG, PNG, WebP
- **Upload Type:** `multipart/form-data`

### Image Categories
1. **Registration Images:** 4 required (Front, Back, Left, Right) - Permanent
2. **Periodic Images:** 4 optional (same angles) - Versioned
3. **Damage Detection:** Single image
4. **Listing Images:** Multiple optional
5. **Catalog Images:** Admin only

### Upload Endpoints
- Registration: `POST /car-images/:carId/register`
- Periodic: `POST /car-images/:carId/periodic`
- Damage: `POST /car-images/:carId/damage-detection`
- Listing: `POST /car-images/listing/:listingId`

---

## 🔐 Role-Based Access

### INDIVIDUAL Users
- ✅ Register cars
- ✅ Create listings (requires CNIC verification)
- ✅ Browse marketplace
- ✅ Contact sellers (requires CNIC verification)
- ✅ Damage detection
- ❌ Cannot create rentals

### CAR_RENTAL Users
- ✅ All INDIVIDUAL features
- ✅ Create rental records (requires CNIC verification)
- ✅ Bulk import cars
- ✅ Fleet management
- ✅ Rental reports

### ADMIN Users
- ✅ All features
- ✅ User management
- ✅ CNIC verification queue
- ✅ Catalog management
- ✅ Bulk catalog import
- ✅ Platform analytics

---

## 📋 Required Pages/Routes

### Public Pages
- `/` - Home/Landing page
- `/login` - Login page
- `/register` - Registration page
- `/marketplace` - Browse listings (public)
- `/listings/:id` - View listing details (public)

### Protected Pages (Require Auth)
- `/dashboard` - User dashboard
- `/profile` - User profile & settings
- `/cars` - My Cars list
- `/cars/register` - Car registration flow (multi-step)
- `/cars/:id` - Car details
- `/listings/create` - Create listing (requires CNIC verification)
- `/rentals` - Rental management (CAR_RENTAL only)
- `/rentals/:id` - Rental details

### Admin Pages (ADMIN only)
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/verifications` - CNIC verification queue
- `/admin/catalog` - Catalog management

### OAuth Callback
- `/auth/callback` - Handle OAuth redirect with tokens

---

## 🎯 Key User Flows

### Flow 1: New User Registration
1. Register → `/register`
2. Upload CNIC → `/profile` (CNIC upload)
3. Wait for verification (admin approval)
4. Register car → `/cars/register`
5. Upload registration images
6. Create listing (after CNIC verified)

### Flow 2: Car Purchase
1. Browse marketplace → `/marketplace`
2. View listing → `/listings/:id`
3. Contact seller (requires CNIC verification)
4. Negotiate (via messaging - if implemented)

### Flow 3: Rental Business
1. Register as CAR_RENTAL
2. Bulk import cars → `/cars/bulk-import`
3. Create rental → `/rentals/create`
4. Pre-rental inspection
5. Complete rental with post-inspection

---

## 🔔 Notifications

### Notification Types
- `INFO` - General information
- `SUCCESS` - Success messages
- `WARNING` - Warnings
- `ERROR` - Errors
- `SYSTEM` - System announcements

### Endpoints
- `GET /notifications` - Get all notifications
- `GET /notifications/unread-count` - Get unread count
- `PUT /notifications/:id/read` - Mark as read
- `PUT /notifications/read-all` - Mark all as read

### When to Show
- CNIC verification approved
- Account suspended
- New message (if messaging implemented)
- System announcements

---

## 📄 PDF Downloads

### Available Reports
1. **Damage Report:** `GET /pdf/damage-report/:imageId`
2. **Rental Report:** `GET /pdf/rental-report/:rentalId`

### Implementation
- Open in new tab or download directly
- Requires authentication
- PDF format, ready to print

---

## 🚨 Important Constraints

### CNIC Verification Required For:
- Creating marketplace listings
- Contacting sellers
- Creating rental records
- Completing rentals
- Downloading rental reports

### Image Constraints:
- Registration images: **Cannot be changed** after upload
- Periodic images: Can be re-uploaded (creates new version)
- Max 10MB per image

### Account Type Restrictions:
- Only `CAR_RENTAL` can create rentals
- Only `CAR_RENTAL` can bulk import
- Only `ADMIN` can manage catalog
- Only `ADMIN` can verify CNIC

---

## 🔄 State Management Needs

### Global State Required:
- Current user (from `/auth/me`)
- Auth tokens (access & refresh)
- CNIC verification status
- Account type (INDIVIDUAL/CAR_RENTAL/ADMIN)

### Local State:
- Car registration form (multi-step)
- Listing creation form
- Rental creation form
- Image upload progress

---

## 📱 Responsive Requirements

### Must Work On:
- Desktop (1920px+)
- Tablet (768px - 1024px)
- Mobile (320px - 767px)

### Critical Mobile Features:
- Image upload (camera access)
- Form inputs
- Navigation menu
- Marketplace browsing

---

## 🎨 UI/UX Essentials

### Loading States
- Show loading indicators for API calls
- Skeleton screens for data loading
- Progress bars for file uploads

### Error States
- Show user-friendly error messages
- Validation errors on forms
- Network error handling
- 404/500 error pages

### Success States
- Success toasts/notifications
- Confirmation modals for destructive actions
- Success pages after completion

---

## 🔗 External Integrations

### Cloudinary
- All images served via Cloudinary CDN
- Image URLs returned from backend
- No direct Cloudinary integration needed in frontend

### Google OAuth
- Redirect-based flow
- No SDK needed (backend handles it)

---

## 📊 Data Display Requirements

### Car Information Display:
- Manufacturer, Model, Year, Variant
- Registration number
- Color, Mileage, Condition
- Images (with categories)
- Damage history (if any)

### Listing Display:
- Car details
- Price (with negotiable indicator)
- Location (city)
- View count
- Listing status
- Contact seller button

### Rental Display:
- Renter information
- Rental dates
- Pre/post inspection images
- Damage charges
- Total amount

---

## 🛠️ Development Checklist

### Setup Phase:
- [ ] Configure API base URL
- [ ] Setup token storage mechanism
- [ ] Implement token refresh logic
- [ ] Setup error handling
- [ ] Configure routing

### Core Features:
- [ ] Authentication (login/register/OAuth)
- [ ] User profile management
- [ ] CNIC upload & status
- [ ] Car registration flow
- [ ] Image uploads
- [ ] Marketplace browsing
- [ ] Listing creation
- [ ] Damage detection UI
- [ ] Notifications

### Advanced Features:
- [ ] Rental management (CAR_RENTAL)
- [ ] Bulk import (CAR_RENTAL)
- [ ] Admin panel (ADMIN)
- [ ] PDF downloads
- [ ] Messaging (if implemented)

---

## 📝 Notes for Frontend Team

1. **Always check CNIC verification status** before allowing restricted actions
2. **Handle token expiration** gracefully (auto-refresh or redirect to login)
3. **Validate file sizes** before upload (10MB limit)
4. **Show appropriate errors** based on user role
5. **Implement proper loading states** for better UX
6. **Handle image upload progress** for better user feedback
7. **Validate forms** before submission
8. **Show success/error messages** for all actions

---

**Last Updated:** February 2026  
**For detailed API documentation, see:** `docs/API_REFERENCE.md`  
**For user flows, see:** `docs/USER_FLOWS.md`

