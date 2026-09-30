# ParkingSpot – Smart Parking Reservation Platform

An enterprise-grade, paperless, real-time smart parking reservation and management platform built with **React**, **Node.js + Express**, and **MongoDB + Mongoose**.

---

## 🌟 Key Features

1. **Role-Based Access Control (RBAC)**:
   - **COMMUTER**: Search nearby parking on interactive Google Maps, view live slot availability, select dates/times, reserve slots with zero double-booking, make secure online payments (Razorpay/UPI QR), receive secure QR tokens, access digital parking passes, track active parking sessions, cancel bookings with automatic refund processing, and view complete history.
   - **OWNER**: Manage multi-location parking facilities, configure bay capacity and hourly/daily rates, toggle slot maintenance, track real-time occupancy, monitor revenue analytics (today, weekly, monthly, and 7-day revenue trends), and inspect peak-hour utilization metrics.
   - **ADMIN**: Central control over commuters, owners, all parking lots, slots, system-wide bookings, financial settlements, and platform settings.

2. **Real-Time Dynamic Slot Availability & Double-Booking Prevention**:
   - Color-coded slot visualization:
     - 🟩 **GREEN**: Available
     - 🟨 **YELLOW**: Reserved
     - 🟥 **RED**: Occupied
     - ⬛ **GRAY**: Maintenance
   - Overlap validation on the backend: checks `(new.startTime < existing.endTime) && (new.endTime > existing.startTime)` to prevent overlapping reservations for the same slot.
   - Dynamic real-time transition:
     `AVAILABLE → RESERVED → OCCUPIED → AVAILABLE`.

3. **Digital Parking Pass & QR Generation**:
   - Unique alphanumeric booking IDs (e.g. `PK-2026-X7B2K`).
   - Secure offline vector QR code generated via `qrcode.react`.
   - Complete digital receipt with vehicle details, bay assignment, check-in time, and status.
   - WhatsApp shareable pass link and public URL verification (`/pass/:id`).

4. **Payment Gateway Integration**:
   - Razorpay payment order generation and cryptographic backend signature verification (`POST /api/payments/verify`).
   - Instant UPI QR payment modal for mobile wallet scan-and-pay (GPay, PhonePe, Paytm).
   - Automated refund calculation on booking cancellation.

5. **Location-Based Search & Google Maps**:
   - Real-time geolocation detection and Haversine distance calculation in kilometers.
   - Interactive map embedded locator with directions launcher.

---

## 🛠️ Mandatory Tech Stack

- **Frontend**: React.js (v19), Tailwind CSS / Modern CSS, JavaScript, React Router, Axios, Lucide React, QRCode React
- **Backend**: Node.js, Express.js REST API
- **Database**: MongoDB (Mongoose ODM) — *SQLite completely removed*
- **Authentication**: JWT (JSON Web Tokens), bcrypt password hashing, Role-Based Access Control
- **Integrations**: Google Maps API, Razorpay & UPI QR Payment Gateway, Fast2SMS notification engine

---

## 📂 Project Structure

```text
ParkingSpot/
│
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & standalone fallback
│   ├── models/
│   │   ├── User.js               # Commuter, Owner, Admin schema with bcrypt
│   │   ├── ParkingLot.js         # Parking location & coordinates schema
│   │   ├── ParkingSlot.js         # Bay/Slot schema & status tracking
│   │   ├── Booking.js             # Reservation & session lifecycle schema
│   │   ├── Payment.js             # Razorpay/UPI transaction schema
│   │   ├── Notification.js        # Alerts schema
│   │   └── Settings.js            # Platform defaults schema
│   ├── controllers/              # REST controllers for all modules
│   ├── middleware/
│   │   ├── auth.js               # JWT verification middleware
│   │   ├── roles.js              # Role-based authorization middleware
│   │   └── errorHandler.js       # Centralized error handler
│   ├── routes/                   # Clean Express REST API endpoints
│   ├── scripts/
│   │   └── seed.js               # Realistic Indian demo seeder
│   ├── test-api.js               # Automated 17-point API test suite
│   ├── .env                      # Environment configuration
│   ├── package.json
│   └── server.js                 # Main Express server entry point (Port 5000)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Dynamic role-aware navigation
│   │   │   ├── Topbar.jsx        # Header with live time & alerts
│   │   │   ├── SlotReservationModal.jsx # Visual slot grid & booking
│   │   │   └── PaymentCheckoutModal.jsx # Razorpay & UPI QR checkout
│   │   ├── pages/
│   │   │   ├── Login.jsx         # Role-based auth + 1-click demo login
│   │   │   ├── SearchParking.jsx # Google Maps locator & nearby search
│   │   │   ├── CommuterDashboard.jsx # Active parking & upcoming bookings
│   │   │   ├── OwnerDashboard.jsx    # Occupancy, revenue & peak hours
│   │   │   ├── AdminDashboard.jsx    # User management & platform overview
│   │   │   ├── DigitalParkingPass.jsx# Real-time QR parking pass
│   │   │   ├── ActiveVehicles.jsx    # Live operator occupancy
│   │   │   ├── NewParkingEntry.jsx   # Drive-in operator entry
│   │   │   ├── VehicleExit.jsx       # Vehicle checkout & settlement
│   │   │   └── ParkingHistory.jsx    # Multi-criteria audit history
│   │   ├── services/
│   │   │   └── api.js            # Axios client with JWT interceptor
│   │   ├── App.jsx               # Application root
│   │   └── index.css             # Tailwind & responsive design styles
│   ├── package.json
│   └── vite.config.js            # Vite bundler configuration
│
├── .env.example
├── package.json
├── start-all.js                  # Multi-service launcher script
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** (Local instance or MongoDB Atlas URI, with automated local standalone engine fallback)

### 2. Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 3. Seed Demo Data
Pre-populates sample users, parking complexes in Coimbatore transit hubs, slots, and active passes:
```bash
# From project root
npm run seed-data
```

**Pre-configured Demo Accounts:**
| Role | Email | Password |
|---|---|---|
| **Commuter** | `commuter@parkingspot.com` | `commuter123` |
| **Owner** | `owner@parkingspot.com` | `owner123` |
| **Admin** | `admin@parkingspot.com` | `admin123` |

*(You can also click the 1-Click Demo Role buttons on the Login screen!)*

---

## 🏃 Running the Application

### Option A: 1-Click Launch (Recommended)
From the project root:
```bash
npm start
```
This automatically frees ports 5000 and 5173, starts both the backend and frontend simultaneously, and launches your web browser at `http://localhost:5173`.

### Option B: Run Services Individually
```bash
# Terminal 1 - Backend (Node.js Express REST API)
cd backend
npm start
# Runs on http://localhost:5000

# Terminal 2 - Frontend (React Vite)
cd frontend
npm run dev
# Runs on http://localhost:5173
```

---

## 🧪 Running the Verification Test Suite

Run the automated end-to-end test suite to verify all 17 critical functional criteria (Auth, RBAC, Search, Slot Reservation, Double-Booking Prevention, Payment Verification, Pass Retrieval, Check-in/Check-out, Cancellation, and Dashboards):
```bash
cd backend
node test-api.js
```

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` – Register new commuter, owner, or admin
- `POST /api/auth/login` – Sign in and retrieve JWT token
- `GET  /api/auth/me` – Retrieve authenticated user profile
- `PUT  /api/auth/profile` – Update vehicle & contact details

### Parking Locations & Slots
- `GET    /api/parking` – Search parking lots with city/name/geo-radius filters
- `GET    /api/parking/:id` – Retrieve parking lot details and real-time bay summary
- `POST   /api/parking` – Create parking lot (Owner/Admin) or drive-in session
- `PUT    /api/parking/:id` – Update location details and pricing
- `DELETE /api/parking/:id` – Delete parking location and slots
- `GET    /api/parking/:id/slots` – Retrieve time-aware slot availability
- `POST   /api/parking/:id/slots` – Add bays/slots to location
- `PUT    /api/slots/:id` – Update slot status (e.g. MAINTENANCE)
- `GET    /api/parking/pass/:id` – Public digital parking pass lookup

### Bookings & Reservations
- `POST /api/bookings` – Reserve slot with backend double-booking validation
- `GET  /api/bookings` – Role-aware bookings list
- `GET  /api/bookings/:id` – Get single booking record
- `PUT  /api/bookings/:id/cancel` – Cancel reservation with automated refund
- `POST /api/bookings/:id/checkin` – Vehicle arrival: `RESERVED → OCCUPIED`
- `POST /api/bookings/:id/checkout` – Vehicle departure: `OCCUPIED → AVAILABLE`

### Payments
- `POST /api/payments/create` – Generate Razorpay order intent
- `POST /api/payments/verify` – Cryptographic backend signature verification
- `GET  /api/payments` – Payment history log

### Role-Based Dashboards
- `GET /api/dashboard/commuter` – Commuter upcoming/active reservations and total spend
- `GET /api/dashboard/owner` – Owner bays, occupancy %, today's revenue, 7-day trends, peak hours
- `GET /api/dashboard/admin` – Central platform KPIs, users, lots, total platform gross

---

## 🔒 Security Best Practices

- JWT authentication with secure HTTP Authorization header (`Bearer <token>`).
- Passwords hashed using `bcryptjs` with salt rounds.
- Sensitive environment variables isolated in `.env`.
- Double-booking prevention enforced atomically on the database layer before confirmation.
- Payment signatures validated on backend using HMAC-SHA256.
