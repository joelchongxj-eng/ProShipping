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

PDF, DOCX, XLSX, scanned-document AI extraction, review actions, escalation, and persistence are scheduled for the next milestones.

## Optional Day 1 AI mode

The `data` branch includes an optional Gemini path for email classification and
TXT SI/BL field extraction. The default deterministic path remains available.
Set these environment variables before starting the backend to enable AI:

```powershell
$env:AI_ENABLED = "1"
$env:GEMINI_API_KEY = Read-Host "Gemini API key" -MaskInput
$env:GEMINI_MODEL = "gemini-3.8-flash"
```

Keep the API key out of Git. AI mode calls Gemini for every email and each TXT
comparison attachment, so processing the full dataset can incur API usage.
The AI response is validated against the backend field schema and each cited
text excerpt is checked against the source. Missing fields and wrong document
types go to review; AI request failures are marked `FAILED`. The `0.85`
confidence value means the evidence check passed; it is not a measured model
probability. Three hand-checked TXT pairs passed live Gemini smoke checks (see
`docs/day-1-baseline.md`), but full-dataset AI accuracy has not been measured.
The automated tests use synthetic model responses.

To check one real TXT pair before processing the whole inbox, run this from
`backend` in the same PowerShell session where `GEMINI_API_KEY` is set:

```powershell
& .\.venv\Scripts\python.exe -m app.evaluate_pair "<path-to-SI.txt>" "<path-to-BL.txt>"
```

The command prints the detected document types, seven field comparisons, and
overall status. It sends the two document texts to Gemini; it does not write
the API key or a submission file.

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

