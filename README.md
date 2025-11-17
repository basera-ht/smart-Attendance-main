# Smart Attendance System

A full-stack attendance management platform built with a Node/Express backend and a Next.js frontend. It streamlines QR-based attendance tracking, leave management, employee administration, and provides rich analytics for HR/Admin users as well as self-service for employees.

## Features

- **QR & Calendar Attendance**
  - Admin/HR check-in/out controls, monthly calendar editing with leave/holiday overlays.
  - Employee self-service check-in/out plus daily status view.
- **Leave & Task Management**
  - Leave approval workflows, upcoming leave summaries, task creation and tracking.
- **Analytics Dashboard**
  - Weekly attendance trend (present/late/absent), department distribution pie charts, top-level stats.
- **Role-Based Access**
  - Admin/HR vs Employee dashboards, authentication, protected routes.
- **Holiday Management**
  - Fixed/optional holidays with visual cues in the calendar.

## Tech Stack

| Layer      | Tech |
|------------|------|
| Frontend   | Next.js 13, React, Tailwind CSS, Recharts |
| Backend    | Node.js, Express.js, MongoDB (Mongoose) |
| Auth       | JWT with refresh tokens |
| Other      | Redux Toolkit, Axios |

## Prerequisites

- Node.js 18+
- MongoDB instance (local or hosted)
- npm (bundled with Node)

## Setup

1. **Clone & Install Dependencies**
   ```bash
   git clone <repo-url>
   cd smart-Attendance-main
   npm install        # optional root install if you add tooling
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Environment Variables**

   Create `.env` files in both `backend/` and `frontend/`.

   **backend/.env**
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/smart-attendance
   JWT_SECRET=Muahahaha
   REFRESH_TOKEN_SECRET=Muahahaha2
   DEFAULT_TIMEZONE=Asia/Kolkata
   ```

   **frontend/.env.local**
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
   ```

   Adjust keys/URLs for your environment (production domains, hosted DB, etc.).

3. **Run the Backend**
   ```bash
   cd backend
   npm run dev
   ```
   Starts the Express API on `http://localhost:5000`.

4. **Run the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   Starts Next.js on `http://localhost:3000`. The app expects the backend API URL defined in `NEXT_PUBLIC_API_BASE_URL`.

## Project Structure

```
smart-Attendance-main/
├─ backend/    # Express API, models, routes, controllers
└─ frontend/   # Next.js app, pages, components, Redux store
```

Key folders:

- `backend/src/routes` – REST endpoints (attendance, employees, reports, etc.)
- `backend/src/controllers` – Business logic for each route.
- `frontend/src/pages` – Next.js routes (`/dashboard`, `/login`, etc.).
- `frontend/src/components` – Shared UI (calendar, charts, layout).
- `frontend/src/utils/holidays.js` – Fixed/optional holiday data.

## Common Scripts

| Location  | Command             | Description |
|-----------|--------------------|-------------|
| backend   | `npm run dev`       | Start API with Nodemon |
| backend   | `npm run start`     | Production start |
| frontend  | `npm run dev`       | Next.js dev server |
| frontend  | `npm run build`     | Production build |
| frontend  | `npm run start`     | Start built app |

## Testing & Linting

No dedicated test suite is configured yet. Before contributing, add tests (Jest, React Testing Library, etc.) and linting as needed. Tailwind classes are used heavily for styling.

## Deployment Notes

- Set environment variables on your server/hosting provider (Render, Vercel, etc.).
- Ensure `NEXT_PUBLIC_API_BASE_URL` points to the deployed backend.
- For backend, configure MongoDB access and secure secrets.

## Contributing

1. Fork & clone the repo.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit changes with descriptive messages.
4. Open a pull request explaining the changes and testing steps.

## License

MIT License © 2025 Smart Attendance System contributors.

