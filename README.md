# ProShipping

ProShipping verifies Shipping Instructions (SI) against Draft Bills of Lading (BL). The Day 1 backend reads the hackathon inbox, classifies emails, extracts seven fields from text documents, compares normalized values, and exports the required submission JSON.

## Current Day 1 scope

- FastAPI health and case APIs
- Docker Inbox integration (520 emails)
- Five competition email categories
- Seven-field TXT extraction with evidence
- Weight, container count, text, and punctuation normalization
- `MATCH`, `MISMATCH`, and `NEEDS_REVIEW` UI statuses
- Automatic `MATCH` to competition `OK` conversion
- Complete 520-entry submission export
- Test suite and first Docker self-evaluation

Review actions, escalation, and persistence are scheduled for the next milestones.

## Optional Day 1 AI mode

The `data` branch includes an optional Groq path for email classification and
TXT, PDF, DOCX, and XLSX SI/BL field extraction. Image-only PDF pages with one
embedded image are transcribed with Groq vision before the seven-field check;
corrupt or unreadable PDFs go to review. The default deterministic TXT path remains available.
Set these environment variables before starting the backend to enable AI:

```powershell
$env:AI_ENABLED = "1"
$env:GROQ_API_KEY = Read-Host "Groq API key" -MaskInput
$env:GROQ_MODEL = "openai/gpt-oss-20b"
$env:GROQ_VISION_MODEL = "qwen/qwen3.8-27b" # optional; used only for scanned PDFs
```

Keep the API key out of Git. AI mode calls Groq for every email; documents with
complete labeled Office fields are extracted locally, while other documents
may require Groq calls. Processing the full dataset still consumes requests
and tokens. Groq returns HTTP 429 when a rate limit is reached; check your account's
current limits before running the full inbox.
If the key is already stored in `backend/.env`, load it into the current
PowerShell session before starting the backend (the application does not read
`.env` automatically):

```powershell
cd backend
$env:GROQ_API_KEY = ((Get-Content .env | Where-Object { $_ -match '^GROQ_API_KEY=' } | Select-Object -First 1) -replace '^GROQ_API_KEY=', '').Trim()
$env:AI_ENABLED = "1"
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

The command does not print the key. `backend/.env` is ignored by Git.
Groq is asked for a strict JSON schema; if it rejects JSON generation, the request
is retried once without a response format. The AI response is validated against the
backend field schema, and each cited text excerpt is checked against the source.
Missing fields and wrong document
types go to review; AI request failures are marked `FAILED`. The `0.85`
confidence value means the evidence check passed; it is not a measured model
probability. Selected TXT, text-PDF, DOCX, and XLSX pairs passed live smoke checks with Groq
(see `docs/day-1-baseline.md`), but full-dataset AI accuracy has not been measured.
Scanned-PDF image extraction was checked offline on all six supplied scans. A
live `email_512` check with Groq vision found two OCR spelling differences;
cropping large page margins resolved the port difference, and party-name
normalization handles the `FAREAST`/`FAR EAST` spacing variant. Broader scanned
PDF accuracy has not been measured. The automated tests use synthetic model responses.

To check one real TXT, PDF, DOCX, or XLSX pair before processing the whole inbox, run this from
`backend` in the same PowerShell session where `GROQ_API_KEY` is set:

```powershell
& .\.venv\Scripts\python.exe -m app.evaluate_pair "<path-to-SI>" "<path-to-BL>"
```

The command prints the detected document types, seven field comparisons, and
overall status. For scanned PDFs, it first sends embedded page images to Groq vision;
otherwise it sends extracted text. It does not write
the API key or a submission file.

The model extracts the seven named fields as raw values with source evidence:
`shipper`, `consignee`, `notify_party`, `port_of_loading`,
`port_of_discharge`, `container_count`, and `gross_weight_kg`. It also identifies
the document type so the backend can reject an SI supplied in place of a BL.
Python code validates the evidence, normalizes values and units, builds
`ShippingFields`, and decides `MATCH`, `MISMATCH`, or `NEEDS_REVIEW`. The model
does not choose normalized values or case status. The current provider is Groq;
the field contract does not depend on the provider.
For DOCX/XLSX attachments, explicit field labels take precedence over model
guesses. If all seven fields and document type are present, extraction is fully
local; otherwise Groq fills the missing fields. A PDF OCR transcript with a
recognized document heading and all seven labeled fields also uses local
extraction. Vision OCR requests are sent one at a time per AI service instance
to reduce token-rate bursts. Text classification and extraction requests are
also sent one at a time per instance; provider limits can still require a retry.

To evaluate a small selected batch from the local competition bundle, run this
from `backend` after setting `GROQ_API_KEY`:

```powershell
& .\.venv\Scripts\python.exe -m app.evaluate_batch "<path-to-sdoc-hackathon-bundle>" 001 091
```

Only the IDs listed on the command line are sent to Groq. The JSON report
includes each category, status, mismatched fields, and fields needing review.
Start with a few IDs because each comparison makes multiple API calls. Brief
Groq token-per-minute limits are retried; a case still becomes `FAILED` if the
limit persists after the bounded retries.

## Run locally

First start the competition data service on port 8080 from its separate local directory:

```powershell
docker compose up --build -d
```

Then start the backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001
```

Open `http://127.0.0.1:8001/docs` for the API documentation.

## Day 1 API

- `GET /health`
- `POST /api/process-all`
- `GET /api/cases`
- `GET /api/cases/{email_id}`
- `GET /api/submission`

## Tests

```powershell
cd backend
python -m pytest -q
```

The hackathon dataset stays outside this repository and is ignored by Git.

