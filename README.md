# SED Tobacco Curing — Installation Management System

A production-ready React + Firebase web application for managing Tobacco Curing Automation Device installations, payments, follow-ups, and analytics.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Material UI, React Router, TanStack Query, React Hook Form, Yup, Recharts, XLSX
- **Backend:** Firebase Authentication, Cloud Firestore, Firebase Hosting (no custom server)

## Features

- Admin authentication with protected routes
- Installation CRUD with MUI DataGrid
- Payment ledger with receipt ID management (manual + auto-generation)
- Follow-up management for outstanding balances
- Dashboard with summary cards and charts
- Statistics & regional/depo/representative reports
- Excel import with validation and batch writes
- Excel/CSV export (respects active filters)
- Responsive admin layout with sidebar navigation

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Email/Password** authentication
3. Create a **Firestore** database
4. Copy `.env.example` to `.env` and fill in your Firebase config values
5. Create an admin user in Firebase Authentication

### 3. Deploy Firestore rules & indexes

```bash
firebase deploy --only firestore
```

### 4. Run locally

```bash
npm run dev
```

### 5. Build & deploy

```bash
npm run build
firebase deploy --only hosting
```

## Project Structure

```
src/
├── app/           # App providers
├── layouts/       # Admin layout
├── routes/        # Routing & guards
├── pages/         # Page components
├── features/      # Feature modules
├── components/    # Shared UI
├── firebase/      # Firebase config
├── hooks/         # React Query hooks
├── services/      # Firestore service layer
├── constants/     # Regions, depos, config
├── utils/         # Helpers
├── types/         # TypeScript types
├── contexts/      # Auth context
└── theme/         # MUI theme
```

## Firestore Collections

- `installations/{id}` — Installation records
- `installations/{id}/payments/{id}` — Payment ledger entries
- `counters/receiptCounter` — Sequential receipt ID counters

## Receipt ID Format

- Hygrometer: `SED-YYYY-00001`
- Tradomation: `TRD-YYYY-00001`

Receipt IDs are globally unique and searchable.

## Regions & Depos

Configured in `src/constants/index.ts`:

- **Mardan:** Shergarh, Jamal Garhi, Azeemabad
- **Swabi:** Roshanpura, Faujoon, Yar Hussain
- **Pindi Gheb:** (no depos)

## License

Private — Internal use only.
