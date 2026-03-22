# Volunteer Connect — local start

Use **two terminals**: one for the API, one for the web app.

**Prerequisites:** Node.js 20+ and, for full API features, MySQL with credentials configured in `backend/.env`.

---

## Backend (API)

From the project root (`public_html`):

```bash
cd backend
npm install
npm start
```

- API base: `http://localhost:3000/api`
- Health check: `http://localhost:3000/api/health`

**PowerShell (Windows):**

```powershell
cd backend; npm install; npm start
```

---

## Frontend (React)

From the project root:

```bash
cd frontend
npm install
npm start
```

The dev server is set to **port 3001** in `frontend/.env.development` so it does not clash with the backend on port 3000. Open **http://localhost:3001** in your browser.

**PowerShell (Windows):**

```powershell
cd frontend; npm install; npm start
```

---

## Optional: backend with auto-reload

```bash
cd backend
npm run dev
```

(requires `nodemon`)
