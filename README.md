# HostelCare — Smart Hostel Maintenance & Complaint Tracking System

> **Report. Track. Resolve. With Transparency.**

HostelCare is a working, interactive web application prototype built to address a core campus operations challenge:

> *"How might we give hostellers visible, trustworthy progress on their maintenance complaints while respecting how technicians actually schedule work?"*

---

## 1. Setup & Production Instructions

```bash
# Development (Express API + Vite HMR/middleware on port 3000)
npm install
npm run dev

# Production Build & Server
npm run build
NODE_ENV=production npm run start
```

Open `http://localhost:3000` in your browser. State persists automatically on disk via Express (`data/hostelcare-db.json`) and mirrors into browser `localStorage` (`hostelcare_prototype_state_v1`) with cross-tab synchronization.

---

## 2. Demo Credentials & Prototype Testing Mode

| Role | Email | Password | Persona |
| :--- | :--- | :--- | :--- |
| **Student / Hosteller** | `student@demo.com` | `demo123` | Aarav Sharma (North Hall · Block A · Room 204) |
| **Technician** | `technician@demo.com` | `demo123` | Rajesh Kumar (Plumbing & Water Supply) |
| **Warden / Admin** | `warden@demo.com` | `demo123` | Dr. Meera Deshmukh (Chief Hostel Warden) |

You can also register a new student account on the Login screen or use the built-in **Demo Walkthrough** panel inside the workspace to switch roles without losing shared data and advance simulated time (`+6h`) to trigger overdue escalations.

---

## 3. Application Architecture

- **Frontend Stack**: React 19, TypeScript, Tailwind CSS v4, Three.js (`three`) for the interactive 3D Campus Twin, Lucide Icons (`lucide-react`), and Chart.js (`chart.js`).
- **Full-Stack Express Server (`server.ts`)**:
  - Serves REST API endpoints (`/api/health`, `/api/state`, `/api/reset`) backed by atomic file-system persistence (`data/hostelcare-db.json`).
  - Serves Vite middlewares in development and optimized static `dist/` assets in production.
- **3D Campus Twin (`src/components/shared/HostelCampus3D.tsx`)**:
  - Interactive WebGL Three.js scene modeling North Hall and South Hall (Block A & B, 3 separable floors) with procedural PBR materials, studio `RoomEnvironment` reflections, raycasted room fault beacons color-coded by status/severity, and an **Exploded Floors** inspection toggle.
- **State Synchronization (`src/store/hostelCareStore.ts`)**:
  - Centralizes all complaints, users, technicians, notifications, timeline audit events, and MVP usability feedback in `localStorage`.
  - Uses an in-app `EventTarget` bus plus `window` `storage` event listeners so changes in Student, Technician, or Warden views synchronize immediately (even across open browser tabs).
- **Rule-Based Escalation Engine (`evaluateEscalations`)**:
  - Automatically flags open complaints exceeding `expectedResolutionAt` as **Overdue**.
  - Elevates `Critical` complaints and complaints reopened `2+` times (`reopenCount >= 2`) in the Warden Escalation Queue and generates notification alerts.
- **Modular Screens**:
  - `src/components/auth/` — Landing Page & Login / Role Selection
  - `src/components/student/` — Student Dashboard, Submit Complaint, Complaint Details, Tracking Timeline
  - `src/components/technician/` — Technician Dashboard, Job Details & Completion Proof, Daily Work Schedule
  - `src/components/warden/` — Warden Dashboard, Complaint Management & Assignment, Reports & Analytics
  - `src/components/shared/` — Chronological Timeline, Before/After Photo Gallery, Message Thread, Chart.js Wrapper, Guided Demo Panel, MVP Feedback Capture

---

## 4. Complete 13-Step Complaint Lifecycle

1. **Student submits a complaint** (category, room details, priority, availability window, optional before photos).
2. **System generates a unique Complaint ID** (e.g., `HC-2026-011`) and records initial timeline entry.
3. **Complaint appears in the Warden Dashboard** pending assignment queue with notification.
4. **Warden assigns the complaint** to an available technician based on specialty and active workload.
5. **Technician receives the assigned job** in their New Assigned queue.
6. **Technician accepts the job** (or declines with a mandatory reason) and **schedules a realistic visit** & completion estimate.
7. **Student sees technician acceptance and scheduled visit window** on their dashboard, detail view, and timeline.
8. **Technician updates work status** (`On the Way` → `Work in Progress` → `Waiting for Materials` if parts are needed).
9. **Technician uploads completion (after) photographs and work notes** (enforced before marking `Completed`).
10. **Student receives a completion notification** prompting resolution verification.
11. **Student confirms whether the problem is resolved**:
    - **Step 12 (Yes)**: Complaint closes (`Closed`) with optional 1–5 rating and feedback; Warden can perform final verification audit.
    - **Step 13 (No)**: Complaint reopens (`Reopened`), increments reopen counter, escalates priority attention, and notifies Warden & Technician.

---

## 5. User Journey Map & Role Workflows

### User Journey Map (End-to-End Resolution)
`Fault Discovered` → `Student Submits Photo + Availability` → `Warden Routes by Load` → `Technician Accepts & Proposes Slot` → `Transparent Timeline Updates` → `Repair + After-Photo Proof` → `Student Verifies Fix` → `Closed & Audited`

### Student-Side Workflow
1. Sign in as Student (`student@demo.com`) → View KPI summary and active tickets.
2. Click **Report Issue**, select category/priority/availability, attach photo, and submit.
3. Open **Track Timeline** or **Complaint Details** to watch assignment, scheduled arrival time, and technician messages.
4. Once status reaches **Completed**, inspect the Before/After photographs and choose **Yes, my problem is resolved** (rate & close) or **No, the problem still exists** (reopen & escalate).

### Technician-Side Workflow
1. Sign in as Technician (`technician@demo.com`) → Set Availability (`Available` / `On Field` / `Off Shift`) and check daily workload.
2. Inspect **New Assigned** jobs → **Accept** (or **Decline** with reason).
3. Set realistic **Estimated Arrival** and **Estimated Completion** times in Job Details or **Daily Schedule**.
4. Progress status (`On the Way` → `Work in Progress`), request materials if needed, upload at least one **After-Repair Photo**, and mark **Completed**.

### Warden / Admin-Side Workflow
1. Sign in as Warden (`warden@demo.com`) → Monitor 8 operational KPIs, Overdue/Critical Escalation Queue, and Technician Load.
2. Open **Manage Complaints** → Filter by status, category, block, or overdue state → Assign technician or adjust priority.
3. Inspect Before/After verification photos → Click **Verify & Close** (or **Reopen** / **Escalate**).
4. Open **Reports & Analytics** to inspect Chart.js trends and export a CSV maintenance report.

---

## 6. MVP Definition & Features Implemented

- **Risky Assumption Tested**: *"Can students trust and understand the progress of their maintenance complaints while technicians retain flexibility to schedule and complete their work?"*
- **Core Differentiating Features**:
  - Chronological Transparent Complaint Timeline (Timestamp, Previous → Updated Status, Actor, Description)
  - Technician-Controlled Scheduling with Student Availability Visibility & Workload Indicators
  - Mandatory After-Photo Verification & Side-by-Side Before/After Gallery
  - Rule-Based Automatic Escalation (`+6h` time simulation controls included)
  - Student Resolution Confirmation Gate (`Yes` closes / `No` reopens)
  - In-App **MVP Feedback Capture** screen storing real tester evaluations to the 6 validation questions
- **Sample Data Disclosure**: The 10 initial complaints (`HC-2026-001` through `HC-2026-010`) and 4 technician profiles are demonstration records only, not real usability study findings.

---

## 7. Known Prototype Limitations

- Data is stored per-browser in `localStorage` rather than a centralized university server database.
- Notifications are in-app (no SMS, email, or push delivery gateways).
- Uploaded images are stored as Base64 Data URLs in `localStorage`, which has browser storage quota limits (~5 MB) for large uncompressed images.
- Authentication uses demo accounts without cryptographic hashing or campus SSO integration.

---

## 8. 10-Step Guided Testing Checklist

1. [ ] Log in as **Student** (`student@demo.com` / `demo123`) and submit a water leakage complaint (or click **Fill Sample Water Leakage**).
2. [ ] Switch to **Warden** (`warden@demo.com`) and assign the new complaint to **Rajesh Kumar**.
3. [ ] Switch to **Technician** (`technician@demo.com`) and **Accept** the assigned job.
4. [ ] Set an **Estimated Arrival** and **Estimated Completion** time and save the visit schedule.
5. [ ] Switch to **Student** and open the complaint to verify the scheduled visit time and timeline entry.
6. [ ] Switch to **Technician** and mark the job **Work in Progress**.
7. [ ] Attempt to mark **Completed** without an after-photo (verify validation blocks it), then upload/attach an **After-Repair Photo**.
8. [ ] Mark the complaint **Completed**.
9. [ ] Switch to **Student**, inspect the Before & After photos, and click **Yes, my problem is resolved** with a rating.
10. [ ] Switch to **Warden** → **Manage Complaints**, inspect the closed ticket, and click **Verify & Close**.
