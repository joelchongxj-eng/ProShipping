This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Comparison API configuration

Copy `.env.example` to `.env.local` if needed. The local demo remains available with:

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_DATA_MODE=mock
```

Set `NEXT_PUBLIC_DATA_MODE=api` and restart Next.js to use the backend. Only the exact value `mock` enables fixtures; otherwise real API requests are used. Public variables must never contain credentials. API errors never fall back to mock data.

Dashboard, case lists, and `/cases/[emailId]` use the same data mode. Case lookup always uses `case.email.email_id`. The Inbox remains explicitly labelled synthetic triage data until its separate integration; its sample case links work in mock mode and do not imply those sample IDs exist on the backend.

`src/lib/api.ts` centralizes `GET /health`, `GET /api/cases`, and `GET /api/cases/{email_id}`. Requests validate HTTP status, JSON shape, and the returned email ID, with a 15-second timeout. A missing case can mean the backend has not processed the inbox yet; this frontend does not invoke `POST /api/process-all` automatically.

### Inspected backend contract

Types mirror `origin/backend:backend/app/models.py` at `8733db5`; the locally available `origin/stage2-extraction-v2` model has the same structure. Person B owns future changes.

- `CaseRecord.category` is top-level, not `email.category`. Only `BL_COMPARISON` renders verification results.
- `email.from` is FastAPI's serialized alias for the Python `sender` field.
- Overall status: `MATCH`, `MISMATCH`, `NEEDS_REVIEW`, `FAILED`.
- Field status: `match`, `mismatch`, `needs_review`, `missing`.
- `comparison[]` contains `field`, `status`, nullable `si`/`bl`, and `reason`.
- Each extracted side has string `raw_value` and `normalized_value`, extraction `confidence`, evidence text, optional `page`, and optional `unit`.
- The frontend renders these records without normalizing values, comparing values, inferring missing rows, or calculating a case result. Dashboard counts and default row selection only inspect supplied statuses.
- The backend does not supply a display case ID or received timestamp. Demo-only metadata is kept separately; real cases show their email ID and mark the timestamp unavailable.
- Attachment paths are supplied, but no document-download endpoint is defined in the inspected routes. Real-case source buttons remain unavailable; demo PDFs are only enabled in mock mode. Person B must confirm a document URL/download contract before real previews can be connected.

The locally running backend was unavailable during implementation, so compatibility is based on the inspected Git contract and controlled response tests, not a live backend run.
