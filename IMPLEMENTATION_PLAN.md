# Smart Bus Stand Two-Wheeler Parking System - Implementation & Architectural Plan

## 1. Project Goal & Overview
A complete full-stack, hardware-integrated college prototype for managing **two-wheeler parking at a bus stand**. The system eliminates:
- Manual registers & paper logbooks
- Handwritten parking tokens
- Physical slips & paper tickets
- Manual tariff calculations

with a 100% digital, automated ANPR camera-ready web management system.

---

## 2. Strict Core Rule: Zero Paper / 100% Digital
- **NO physical tickets, NO printed receipts, NO paper tokens**.
- All records exist electronically in SQLite.
- Multi-field customer record recovery by:
  1. Vehicle Number (`TN 30 AB 1234`)
  2. Customer Mobile (`9876543210`)
  3. Customer Name (`Karthik Raja`)
  4. Unique Parking ID (`PK20260825001`)

---

## 3. Technology Stack & Components
- **Frontend**: React 19, Vite, Lucide Icons, Clean Responsive CSS (`frontend/`)
- **Backend**: Java REST Server on port `5000` with embedded SQLite JDBC (`backend/`)
- **Database**: SQLite embedded with WAL mode (`smart_parking.db`)
- **Hardware Integration**: Raspberry Pi Camera ANPR script (`raspberry-pi/camera-integration-example.py`) + UI Camera Simulator
- **Testing**: Automated integration test suite (`tests/e2e-test.ps1`)

---

## 4. Tariff Calculation Engine
- Standard 24-hour block model with ceiling rounding:
  $$\text{Days} = \max\left(1, \lceil \frac{\text{Duration in Hours}}{24} \rceil\right)$$
  $$\text{Total Bill} = \text{Days} \times \text{DailyRate}$$
- Default Daily Rate: **₹20 / Day**
- 0–24 Hours = 1 Day = **₹20**
- 24–48 Hours = 2 Days = **₹40**
- 48–72 Hours = 3 Days = **₹60**
- 72–96 Hours = 4 Days = **₹80**

---

## 5. Demonstration & Viva Walkthrough Workflow
1. **Camera Detection**: Scan or simulate plate (`TN 30 AB 1234`) with 94% OCR confidence.
2. **Auto-Fill & Register**: Transfer plate to form $\rightarrow$ Enter Rider Name & Mobile $\rightarrow$ Generate digital ticket.
3. **Digital Ticket**: Displayed in modal with Unique Parking ID (`PK20260825###`), rate, entry timestamp, and digital verification seal.
4. **Active Bays & Demo Time Simulation**: Monitor parked bikes and advance simulation by `+1 Day` or `+2 Days` to demonstrate automatic price re-calculation.
5. **Universal Search**: Lookup session by Mobile, Plate, Name, or Parking ID.
6. **Vehicle Exit**: Departure processing with automatic duration and fee settlement $\rightarrow$ Status changes to `EXITED` and `PAID` $\rightarrow$ Display **Final Digital Parking Receipt**.
7. **History Register**: Audit all sessions permanently in SQLite database.

---

## 6. How to Run from VS Code
- Open the built-in VS Code Terminal (`Ctrl + ~`)
- To run Backend:
  ```powershell
  cd backend
  .\run.ps1
  ```
- To run Frontend:
  ```powershell
  cd frontend
  npm run dev
  ```
- Or run the 1-click startup script:
  ```powershell
  .\start-all.ps1
  ```
