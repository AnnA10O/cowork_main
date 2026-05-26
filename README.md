# CoWork HQ — Backend API

> **Stack:** NestJS · Node.js · PostgreSQL (Supabase) · Prisma ORM · Redis · Razorpay · WhatsApp (WATI)

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd coworkhq-backend
npm install

# 2. Environment setup
cp .env.example .env
# Fill in your Supabase DB URL, Razorpay keys, etc.

# 3. Generate Prisma client & push schema
npm run db:generate
npm run db:push

# 4. Seed the database
npm run db:seed

# 5. Start development server
npm run start:dev
# → http://localhost:3000/api/v1
```

---

## Architecture

```
src/
├── auth/           JWT auth, register, login, staff code flow
├── users/          Profile management, feedback, loyalty
├── workspaces/     CRUD, desks, pricing, coupons, QR codes, staff codes
├── bookings/       Create, confirm, reject, cancel (85% refund), reschedule
├── payments/       Razorpay orders, verify, webhook, platform fees, invoices
├── notifications/  In-app + WhatsApp (WATI) notifications
├── issues/         QR-scan reports, staff assignment, resolution
├── staff/          Staff app endpoints (dashboard, issues, workspace)
├── admin/          Full admin portal (ban/unban, analytics, feedbacks)
├── prisma/         PrismaService (global)
└── common/
    ├── guards/     JwtAuthGuard, RolesGuard
    ├── decorators/ @Roles(), @Public(), @CurrentUser()
    ├── filters/    AllExceptionsFilter
    └── interceptors/ TransformInterceptor (wraps all responses)
```

---

## User Roles & Hierarchy

```
ADMIN  →  MANAGER  →  STAFF
                ↓
            CUSTOMER
```

| Role     | Interface         | Description                                         |
|----------|-------------------|-----------------------------------------------------|
| ADMIN    | React Admin Panel | Company-owned. Bans, analytics, platform fees       |
| MANAGER  | React Dashboard   | Workspace owner. Manages spaces, staff, bookings    |
| STAFF    | Flutter Staff App | Assigned to workspace. Resolves issues              |
| CUSTOMER | Flutter App       | Books desks, makes payments, raises issues via QR   |

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

### Endpoints

| Method | Path                    | Auth | Description                           |
|--------|-------------------------|------|---------------------------------------|
| POST   | `/auth/register`        | ❌   | Register CUSTOMER or MANAGER          |
| POST   | `/auth/register/staff`  | ❌   | Register STAFF using manager's code   |
| POST   | `/auth/login`           | ❌   | Login (all roles)                     |
| POST   | `/auth/refresh`         | ❌   | Refresh access token                  |
| PATCH  | `/auth/change-password` | ✅   | Change own password                   |

**Register payload:**
```json
{
  "name": "Priya Patel",
  "email": "priya@example.com",
  "phone": "+919876543210",
  "password": "SecurePass123",
  "role": "CUSTOMER",
  "referralCode": "OPTIONAL"
}
```

**Register Staff payload:**
```json
{
  "name": "Rahul Kumar",
  "email": "rahul@staff.com",
  "password": "StaffPass123",
  "staffCode": "STAFF001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": { "id": "uuid", "email": "...", "role": "CUSTOMER" }
  }
}
```

---

## Workspaces

| Method | Path                              | Role    | Description                    |
|--------|-----------------------------------|---------|--------------------------------|
| GET    | `/workspaces`                     | Public  | Browse all active workspaces   |
| GET    | `/workspaces/:id`                 | Public  | Get workspace details          |
| GET    | `/workspaces/:id/availability`    | Public  | Desk availability for a date   |
| POST   | `/workspaces`                     | MANAGER | Create workspace               |
| PATCH  | `/workspaces/:id`                 | MANAGER | Update workspace               |
| DELETE | `/workspaces/:id`                 | MANAGER | Deactivate workspace           |
| POST   | `/workspaces/:id/images`          | MANAGER | Upload images (max 4)          |
| DELETE | `/workspaces/images/:imageId`     | MANAGER | Remove an image                |
| POST   | `/workspaces/:id/desks`           | MANAGER | Add a desk                     |
| PATCH  | `/workspaces/desks/:deskId`       | MANAGER | Update desk details / price    |
| POST   | `/workspaces/:id/pricing`         | MANAGER | Create pricing plan            |
| PATCH  | `/workspaces/pricing/:planId`     | MANAGER | Update/toggle pricing plan     |
| POST   | `/workspaces/:id/coupons`         | MANAGER | Create coupon                  |
| POST   | `/workspaces/:id/qr`              | MANAGER | Generate QR code for a desk    |
| POST   | `/workspaces/staff-codes/generate`| MANAGER | Generate 8-char staff code     |
| GET    | `/workspaces/staff-codes/my-staff`| MANAGER | List all staff members         |
| GET    | `/workspaces/manager/dashboard`   | MANAGER | Revenue + occupancy summary    |

**Query params for GET /workspaces:**
- `city=Pune`
- `search=sky`
- `page=1&limit=20`

---

## Bookings

| Method | Path                       | Role     | Description                          |
|--------|----------------------------|----------|--------------------------------------|
| POST   | `/bookings`                | CUSTOMER | Create a booking                     |
| GET    | `/bookings/my`             | CUSTOMER | My bookings (filter by ?status=)     |
| GET    | `/bookings/manager`        | MANAGER  | All workspace bookings               |
| GET    | `/bookings/:id`            | Both     | Single booking detail                |
| PATCH  | `/bookings/:id/confirm`    | MANAGER  | Confirm a pending booking            |
| PATCH  | `/bookings/:id/reject`     | MANAGER  | Reject with reason                   |
| PATCH  | `/bookings/:id/cancel`     | CUSTOMER | Cancel → 85% refund initiated        |
| PATCH  | `/bookings/:id/reschedule` | CUSTOMER | Cancel old + create new (full price) |

**Create booking payload:**
```json
{
  "workspaceId": "uuid",
  "deskId": "uuid",
  "pricingPlanId": "uuid",
  "startTime": "2026-06-01T09:00:00.000Z",
  "endTime": "2026-06-01T18:00:00.000Z",
  "couponCode": "SAVE20"
}
```

### Booking Business Rules
- **Auto-accept:** Bookings are `PENDING` until manager confirms. Manager may reject.
- **Cancellation:** 85% refund of `finalAmount`. 15% is platform charge.
- **Reschedule:** Original booking cancelled (85% refund), new booking created at full price. Customer must complete new payment.
- **Amount breakdown:**
  ```
  baseAmount     = pricingPlan.basePrice
  premiumExtra   = desk.premiumExtra (e.g. ₹75 for window desk)
  discountAmount = coupon discount
  totalAmount    = baseAmount + premiumExtra - discountAmount
  gstAmount      = totalAmount × 18%
  finalAmount    = totalAmount + gstAmount
  ```

---

## Payments (Razorpay)

| Method | Path                       | Role     | Description                          |
|--------|----------------------------|----------|--------------------------------------|
| POST   | `/payments/order/:bookingId` | CUSTOMER | Create Razorpay order               |
| POST   | `/payments/verify`          | CUSTOMER | Verify client-side payment           |
| POST   | `/payments/webhook`         | Public   | Razorpay webhook (idempotent)        |
| POST   | `/payments/platform-fee`    | MANAGER  | Pay monthly platform fee             |

**Payment flow:**
```
1. Customer creates booking → status: PENDING
2. POST /payments/order/:bookingId → get {orderId, amount, key}
3. Open Razorpay checkout in Flutter app
4. On success → POST /payments/verify with {razorpay_order_id, razorpay_payment_id, razorpay_signature}
5. Backend verifies signature → booking auto-confirms → GST invoice generated
6. WhatsApp confirmation sent to customer
```

**Platform fee:**
- Managers pay per workspace per month
- Default: ₹999/workspace/month (set in .env: PLATFORM_FEE_PER_WORKSPACE)

---

## Issues (QR Scan Flow)

| Method | Path                   | Role          | Description                       |
|--------|------------------------|---------------|-----------------------------------|
| POST   | `/issues/qr/:qrCode`   | Public        | Report issue by scanning QR       |
| GET    | `/issues`              | MANAGER/STAFF | Get workspace issues              |
| GET    | `/issues/my`           | STAFF         | Staff's assigned issues           |
| PATCH  | `/issues/:id/resolve`  | STAFF         | Mark issue resolved (with note)   |
| PATCH  | `/issues/:id/escalate` | MANAGER       | Escalate issue to Admin           |

**QR scan flow:**
```
Customer scans QR at desk
  → POST /issues/qr/QRCODE_VALUE { "description": "AC not working" }
  → Issue created, staff assigned
  → Manager + Staff get in-app notification
  → Staff resolves → Manager gets "resolved" notification
```

---

## Notifications

| Method | Path                      | Auth | Description              |
|--------|---------------------------|------|--------------------------|
| GET    | `/notifications`          | ✅   | Get unread notifications |
| PATCH  | `/notifications/mark-read`| ✅   | Mark notifications read  |

---

## Users

| Method | Path                        | Role     | Description                     |
|--------|-----------------------------|----------|---------------------------------|
| GET    | `/users/me`                 | Any      | Get own profile                 |
| PATCH  | `/users/me`                 | Any      | Update name/phone/lang          |
| PATCH  | `/users/me/manager-profile` | MANAGER  | Update business/bank details    |
| GET    | `/users/me/loyalty`         | CUSTOMER | Get loyalty points + code       |
| POST   | `/users/feedback`           | CUSTOMER | Submit workspace feedback       |
| GET    | `/users/feedback/:workspaceId` | Public | Get workspace reviews        |
| POST   | `/users/warn-customer`      | MANAGER  | Issue warning to a customer     |

---

## Staff App

| Method | Path              | Role  | Description                      |
|--------|-------------------|-------|----------------------------------|
| GET    | `/staff/profile`  | STAFF | Profile + manager + workspace    |
| GET    | `/staff/dashboard`| STAFF | Open issues + resolved today     |
| GET    | `/staff/workspace`| STAFF | Assigned workspace details       |

---

## Admin Portal

All `/admin/*` routes require `ADMIN` role.

| Method | Path                        | Description                          |
|--------|-----------------------------|--------------------------------------|
| GET    | `/admin/dashboard`          | System-wide stats                    |
| GET    | `/admin/users`              | All users (filter: ?role=MANAGER)    |
| PATCH  | `/admin/users/:id/ban`      | Ban user (with reason)               |
| PATCH  | `/admin/users/:id/unban`    | Lift ban                             |
| GET    | `/admin/workspaces`         | All workspaces (filter: ?city=Pune)  |
| PATCH  | `/admin/workspaces/:id/suspend` | Suspend workspace                |
| GET    | `/admin/feedbacks`          | Manager feedback/bug reports         |
| PATCH  | `/admin/feedbacks/:id`      | Respond to feedback / mark resolved  |
| GET    | `/admin/platform-fees`      | Platform fee payments                |
| GET    | `/admin/analytics/occupancy`| Occupancy rates by workspace         |

**Manager submits feedback to admin:**
```
POST /manager-feedback   (MANAGER role)
{ "subject": "Bug in booking", "message": "Customers can't..." }
```

---

## Response Format

All responses are wrapped:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-05-15T12:00:00.000Z"
}
```

Errors:
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Workspace not found",
  "timestamp": "...",
  "path": "/api/v1/workspaces/bad-id"
}
```

---

## Database Schema Summary

| Table                  | Key columns                                              |
|------------------------|----------------------------------------------------------|
| `users`                | id, email, role, isBanned, bannedReason                  |
| `managers`             | businessName, gstNumber, platformFeeDue                  |
| `staff`                | managerId, staffCodeId, workspaceId                      |
| `staff_codes`          | code (8-char), isUsed, expiresAt                         |
| `customers`            | loyaltyPoints, referralCode, preferredLang               |
| `workspaces`           | managerId, city, status, amenities[], lat/lng            |
| `workspace_images`     | workspaceId, url, order (max 4)                          |
| `working_hours`        | workspaceId, day, openTime, closeTime                    |
| `desks`                | workspaceId, deskNumber, type, premiumExtra              |
| `pricing_plans`        | workspaceId, type (DAILY/WEEKLY/MONTHLY/HOURLY), price   |
| `coupons`              | workspaceId, code, discountPercent/Flat, validFrom/Until |
| `bookings`             | status, startTime, endTime, finalAmount, isRescheduled   |
| `payments`             | razorpayOrderId, status, refundAmount                    |
| `invoices`             | invoiceNumber (CWH/2026/000001), pdfUrl                  |
| `platform_fee_payments`| managerId, month, amount, status                         |
| `qr_codes`             | workspaceId, deskId, code (cuid)                         |
| `issues`               | workspaceId, deskId, status, description                 |
| `issue_assignments`    | issueId, staffId, resolvedAt, note                       |
| `feedbacks`            | customerId, workspaceId, rating (1–5), comment           |
| `manager_feedbacks`    | managerId, subject, message, adminNote                   |
| `notifications`        | userId, title, body, type, isRead                        |

---

## Deployment (Railway)

```bash
# Set environment variables in Railway dashboard
# Then deploy:
railway init
railway up

# Run migrations on production
railway run npm run db:migrate:prod
railway run npm run db:seed
```

**Recommended services:**
- **Backend:** Railway (NestJS)
- **Database:** Supabase (PostgreSQL + Realtime)
- **Cache:** Railway Redis add-on
- **CDN/Security:** Cloudflare
- **File Storage:** Supabase Storage (workspace images)
- **Payments:** Razorpay (UPI-first)
- **WhatsApp:** WATI or Interakt

---

## Legal & Compliance Checklist

- [ ] GST registration (mandatory from day 1 for marketplace)
- [ ] GST collected on bookings: **18%** (included in `gstAmount`)
- [ ] DPDP Act 2023 — add privacy policy & consent flows
- [ ] Razorpay PA Agreement signed
- [ ] Never store raw card data — delegated to Razorpay vault
- [ ] Space Operator Agreement with each manager
- [ ] User T&Cs: no-show policy, refund policy (85% on cancel)
- [ ] Trademark brand name before launch
- [ ] Data residency: use Supabase India region (`ap-south-1`)

---

*CoWork HQ — Confidential & Internal Use Only — v1.0 May 2026*
