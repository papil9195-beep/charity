# EmpowerAid (React + Vite)

A professional multi-page educational website about ethical support, consent, and safety for vulnerable people.

## Run locally (frontend only)

1. Install Node.js (LTS recommended)
2. In this folder:

```bash
npm install
npm run dev
```

## Run with MongoDB intake API

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to your MongoDB connection string.
3. Optional hardening settings:
   - `CORS_ORIGIN` (comma-separated allowlist)
   - `TRUST_PROXY` (`false`, `true`, or proxy hop count)
   - `ENROLLMENT_RATE_LIMIT_MAX`
   - `MAX_UPLOAD_FILE_MB`
   - `MONGODB_UPLOAD_BUCKET` (GridFS bucket name)
4. Configure email delivery (required for submission):
   - `NOTIFICATION_RECIPIENTS` (defaults to `williambeebejunior@gmail.com,papil9195@gmail.com`)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
   - `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
5. Start both servers together:

```bash
npm run dev:all
```

Or start them separately.

6. Start the API server:

```bash
npm run api
```

7. In a second terminal, start the React app:

```bash
npm run dev
```

The frontend sends enrollment submissions to `POST /api/enrollments`. In local development it falls back to `http://localhost:5000` only when the site is running on your own machine.

Uploaded documents are stored in MongoDB GridFS collections:
- `<MONGODB_UPLOAD_BUCKET>.files`
- `<MONGODB_UPLOAD_BUCKET>.chunks`

Enrollment documents store upload metadata in `uploadedFiles` inside the `enrollments` collection.

With the default bucket, check:
- `enrollmentUploads.files`
- `enrollmentUploads.chunks`

## Deploy online

For a public deployment, keep the frontend and the `api/` serverless functions on the same host. This repo is already set up for that flow on Vercel.

1. Import the GitHub repo into Vercel.
2. Add these production environment variables in the Vercel dashboard:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_SECURE`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`
   - `NOTIFICATION_RECIPIENTS`
   - `MAX_UPLOAD_FILE_MB` (optional)
3. Leave `VITE_API_BASE_URL` empty in production so the website posts to `/api/enrollments` on the live domain instead of `localhost`.
4. Redeploy after saving the environment variables.

If GitHub is connected to Vercel, every push to `main` will trigger a new deployment automatically.

## View uploaded images/files in browser

1. Get an enrollment id from `enrollments` collection.
2. List its file links:

```bash
GET /api/enrollments/:id/files
```

3. Open any returned `viewUrl`:

```bash
GET /api/uploads/:fileId
```

## Build

```bash
npm run build
npm run preview
```

## Pages
- Home
- How Support Works
- Rights & Consent
- Red Flags
- FAQ
- Contact
