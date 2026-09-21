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

The backend also supports TXT, PDF, DOCX, and XLSX source locators, manual
SI/BL upload comparison, attachment preview, and Human Review history.

## Optional scanned-PDF fallback

The normal pipeline remains deterministic for email classification and for
readable TXT, PDF, DOCX, and XLSX documents. Groq is used only when the existing
reader cannot obtain usable text from a PDF. The scanned page is transcribed,
the existing deterministic seven-field extractor runs first, and Groq
structured extraction is used only for fields that remain missing.

Set these environment variables before starting the backend to enable the
fallback:

```powershell
$env:AI_ENABLED = "1"
$env:GROQ_API_KEY = Read-Host "Groq API key" -MaskInput
$env:GROQ_MODEL = "openai/gpt-oss-20b"
$env:GROQ_VISION_MODEL = "qwen/qwen3.8-27b" # optional; used only for scanned PDFs
```

Keep the API key out of Git. `AI_ENABLED=0` is the default and does not require
Groq credentials. Groq never performs the final comparison or chooses the case
status; existing normalization, comparison, review-reason, and submission logic
remain authoritative. If Groq fails, the scanned document remains
`NEEDS_REVIEW` with the `unreadable` reason.

AI-assisted fields retain filename and evidence text. No source coordinates are
invented: scanned-PDF locators remain null until trustworthy OCR coordinates are
available.

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
Copy-Item .env.example .env
# Set SMTP_PASSWORD in .env to your Gmail app password before testing email delivery.
uvicorn app.main:app --reload --port 8001
```

The local `backend/.env` file is ignored by Git. The example config routes
supervisor and sender-follow-up demo messages to the controlled demo recipient
while preserving the original sender address in workflow data. Never commit the
Gmail app password.

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

