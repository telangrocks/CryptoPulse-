# CryptoPulse

Production-ready cryptocurrency trading & analytics platform for Back4App.

## Setup

1. Clone the repository.
2. Install dependencies (`npm install` in root and `frontend/`).
3. Copy and configure `.env.example` and `frontend/.env.example` with production values.
4. Lint: `npm run lint` (root and frontend).
5. Typecheck: `npm run typecheck` (root and frontend).
6. Test: `npm run test` (root and frontend).
7. Deploy backend and frontend via Back4App [Parse Server & Static Hosting].
8. Monitor via Back4App dashboard.

---

**Use these structures and configs as a baseline. Add your app-specific source files (backend logic, frontend components, cloud code, etc.) into appropriate folders (`backend/`, `frontend/src/`, `cloud/`). All build, lint, typecheck, and test scripts will pass with this configuration if your source code is free of errors.**