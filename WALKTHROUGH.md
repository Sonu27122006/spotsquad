# Smart Bus Stand Two-Wheeler Parking System - Complete Walkthrough

## Summary of Accomplishments

We have built a full-stack, hardware-integrated college prototype for the **Smart Bus Stand Two-Wheeler Parking System**. The application is designed from the ground up to replace handwritten books and physical tickets with an automated, 100% paperless management system.

---

## Key Features & Architecture

### 1. 100% Paperless Digital Workflow
- **Zero Print/Paper Functionality**: No print receipt or physical ticket buttons exist anywhere in the application.
- **Digital-Only Storage**: All parking records, active bay sessions, and payment proofs are stored electronically in SQLite.
- **Universal 4-Way Customer Recovery**: Operators can recover any customer's record at any time using:
  1. Vehicle Number (e.g. `TN 30 AB 1234`)
  2. Customer Mobile Number (e.g. `9876543210`)
  3. Customer Name (e.g. `Karthik Raja`)
  4. Unique Parking ID (e.g. `PK20260825001`)

### 2. High-Performance Java Backend + Embedded SQLite
- Pure Java REST API server running on port `5000` with embedded SQLite (`smart_parking.db`) in WAL mode.
- Self-contained with zero external server dependencies; starts in milliseconds.
- Seeded with realistic Indian two-wheeler demo data, multi-day records, and role accounts.

### 3. Raspberry Pi Camera & ANPR OCR Client
- Located in `raspberry-pi/camera-integration-example.py`.
- Features modular camera capture (PiCamera / OpenCV / synthetic) and modular OCR plate detection.
- Sends detected registration plates via HTTP POST to `/api/hardware/detection`.
- Built-in in-app **"Simulate Camera Detection"** button directly in the UI for presentations without physical hardware.

### 4. Smart Tariff Engine & Demo Time Simulation
- Automatic 24-hour block fee calculation:
  $$\text{Days} = \max\left(1, \lceil \frac{\text{Duration in Hours}}{24} \rceil\right)$$
  $$\text{Amount} = \text{Days} \times \text{DailyRate}$$
- Default rate: **₹20 / Day** (Day 1 $\rightarrow$ ₹20, Day 2 $\rightarrow$ ₹40, Day 3 $\rightarrow$ ₹60, Day 4 $\rightarrow$ ₹80).
- Interactive **Demo Time Simulation** widget allowing operators to test multi-day parking increments on active vehicles during viva evaluations.

### 5. Modern React Dashboard UI
- **Dashboard**: Real-time stats (Total, Parked, Exited, Today's Entries/Exits/Revenue, Pending Payments) and live activity feed.
- **New Parking Entry**: 3-step automated workflow with live camera viewport, plate auto-population, customer registration, and instant digital ticket modal.
- **Active Vehicles**: Live bay monitoring with real-time fee calculation and time simulator.
- **Search Vehicle**: Instant universal lookup with rich preview cards.
- **Vehicle Exit**: Departure processing with automatic final bill settlement and Final Digital Receipt modal.
- **Parking History**: Electronic audit log with status and text filters.
- **Notifications**: In-app simulated notification feed for entries, long stay alerts, and exits.
- **Settings**: Admin-only tariff configuration (stores rate at entry time to preserve historical fidelity).

---

## Verification & Automated Test Results

The system was verified with a comprehensive 15-test automated test suite (`tests/e2e-test.ps1`):

```text
=================================================================
 Running Automated Integration Tests on http://localhost:5000/api
=================================================================
  [PASS] Operator Authentication
  [PASS] Dashboard Stats Retrieval
  [PASS] Hardware ANPR Webhook Ingestion
  [PASS] Latest Detection Cache Query
  [PASS] Create Digital Parking Entry
  [PASS] Duplicate Active Vehicle Prevention
  [PASS] Demo Time Simulation (+2 Days = 2 Days @ ₹40)
  [PASS] Search by Vehicle Plate (Normalized)
  [PASS] Search by Mobile Number
  [PASS] Search by Customer Name
  [PASS] Search by Parking ID
  [PASS] Vehicle Exit & Payment Settlement
  [PASS] Duplicate Exit Prevention
  [PASS] In-App Notifications Retrieval
  [PASS] Settings Query
=================================================================
 Test Summary: 15 Passed, 0 Failed - ALL TESTS PASSED!
=================================================================
```

Frontend production build test (`npm run build`):
- `1835 modules transformed`
- `0 errors, 0 warnings`
- `Built in 4.05s`

Raspberry Pi Python script test:
- Successfully captured frame and dispatched payload to backend REST API with HTTP 200 response.

---

## How to Run the Project

### One-Click Launch:
```powershell
.\start-all.ps1
```
Or double click `start-all.bat`.

- **Frontend UI**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: [http://localhost:5000](http://localhost:5000)

### Demo Credentials:
- **Operator**: `operator` / `operator123`
- **Admin**: `admin` / `admin123`
