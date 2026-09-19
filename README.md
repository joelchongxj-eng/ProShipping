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

