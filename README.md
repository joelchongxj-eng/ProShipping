# ProShipping
## Planned Features

### 1. Inbox and Email Classification

Provide an inbox view for incoming shipping-related emails and automatically classify each email into categories such as:

- **Document Comparison Request**
- **New Shipping Instruction Request**
- **Invoice Query**
- **General Message**
- **Spam**

Only emails classified as **Document Comparison Requests** continue into the SI and draft BL verification workflow.

The inbox allows users to:

- View the email sender, subject, category, and processing status.
- Filter emails by category or status.
- Open an email to view its contents and attachments.
- See whether the email has already been processed into a verification case.
- Identify emails that require manual attention because of missing or unclear attachments.

---

### 2. Dashboard

View document verification cases and their current statuses:

- **Matched** – All required fields were checked and agree.
- **Mismatch** – One or more differences were identified.
- **Needs Review** – Missing or uncertain information requires human verification.
- **Failed** – Processing could not be completed and may require a retry.

Users can open each case to inspect its comparison results and supporting evidence.

---

### 3. SI and BL Comparison

Compare the Shipping Instruction (SI) and draft Bill of Lading (BL) side by side across seven required fields:

- Shipper
- Consignee
- Notify Party
- Port of Loading
- Port of Discharge
- Container Count
- Gross Weight in Kilograms

Mismatched values are highlighted in the comparison table.

Supporting source text is also displayed to help users verify each identified discrepancy.

---

### 4. Confidence and Evidence

Display extraction confidence for individual fields together with the relevant source evidence.

The confidence level indicates how certain the system is that a value has been correctly read or extracted from the document.

> **Note:** Extraction confidence does not represent whether the SI and draft BL values match.

This helps users identify fields that may require closer inspection or human review.

---

### 5. AI-Generated Message Drafts

Generate editable message drafts based on the final verification result.

The system can generate:

- A **confirmation message** when all required fields match.
- A **correction request** describing confirmed differences between the SI and draft BL.

Users can review, edit, and copy the generated draft before sending it through the appropriate communication platform.

The system does **not** automatically send messages.

---

### 6. Human Review and Feedback

Allow users to review uncertain results and provide corrections when necessary.

Users can:

- Confirm an extracted value.
- Correct an incorrectly extracted value.
- Confirm that differently written values represent the same information.
- Review values that are missing, unclear, or uncertain.

Approved corrections and equivalences can be saved to support future document checks.

After corrections are made, the comparison can be rerun so that the verification result and case status are updated.

> The feedback mechanism does not automatically retrain the AI model.

---

### 7. Manual Document Upload

Allow users to manually upload an SI and a corresponding draft BL for verification without requiring an email.

After processing, the system displays:

- Overall verification status
- SI and draft BL comparison results
- Mismatched fields
- Extraction confidence information
- Supporting evidence
- Issues requiring human review

---

## User Workflow

### Email Workflow

1. Receive and classify incoming emails in the inbox.
2. Open or filter emails based on their category or processing status.
3. For a **Document Comparison Request**, retrieve the attached SI and draft BL.
4. Process the documents and create a verification case.
5. View the verification status on the dashboard.
6. Open the case to inspect field comparisons, confidence information, and supporting evidence.
7. Review uncertain values, confirm discrepancies, or correct extracted information where necessary.
8. Rerun the comparison if corrections were made.
9. Generate and edit a message draft if follow-up communication is required.

---

### Manual Upload Workflow

1. Upload an SI and its corresponding draft BL.
2. Process the documents and create a verification case.
3. View the verification status on the dashboard.
4. Open the case to inspect field comparisons, confidence information, and supporting evidence.
5. Review uncertain values, confirm discrepancies, or correct extracted information where necessary.
6. Rerun the comparison if corrections were made.
7. Generate and edit a message draft if follow-up communication is required.

---

## Tech Stack

- **Backend:** Python 3.11+, FastAPI, Uvicorn, and Pydantic
- **HTTP requests:** httpx
- **Document processing:** pypdf and Pillow
- **Optional AI:** Groq API for email classification and document extraction
- **Testing:** pytest and pytest-asyncio

---

## System Architecture

ProShipping uses a FastAPI backend connected to an external Inbox service. The backend retrieves emails and attachments, classifies each email, and processes requests to compare a Shipping Instruction (SI) with a draft Bill of Lading (BL).

For each document pair, the backend extracts seven shipping fields, normalizes their values, and compares them. Optional AI processing supports TXT, PDF, DOCX, and XLSX documents. The backend determines the final case status and stores processed cases in memory while the API is running.

---

## Setup and Run Instructions

**Prerequisites:** Python 3.11+ and access to the external Inbox service.

1. Start the Inbox service on port `8080`, or set `INBOX_BASE_URL` to its URL.
2. From the project root, run:

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -e ".[dev]"
   python -m uvicorn app.main:app --reload --port 8001
   ```

3. Open `http://127.0.0.1:8001/docs` for the interactive API documentation.
4. Call `POST /api/process-all` to process emails. Use `GET /api/cases` to view cases and `GET /api/submission` to retrieve submission results.

To run the tests, execute `python -m pytest -q` from the `backend` directory.

---

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `INBOX_BASE_URL` | URL of the external Inbox service | `http://localhost:8080` |
| `CORS_ORIGINS` | Comma-separated allowed browser origins | `http://localhost:3000` |
| `AI_ENABLED` | Set to `1` to enable AI processing | Disabled |
| `GROQ_API_KEY` | Groq API key; required when AI is enabled | None |
| `GROQ_MODEL` | Model for classification and field extraction | `openai/gpt-oss-20b` |
| `GROQ_VISION_MODEL` | Model for scanned PDF transcription | `qwen/qwen3.8-27b` |

Set environment variables before starting the backend. The application does not load `.env` files automatically.

---

## Main Workflow

1. Retrieve emails from the external Inbox service.
2. Classify each email as a BL comparison, SI request, invoice query, general message, or spam.
3. For BL comparison requests, retrieve the SI and draft BL attachments.
4. Extract and compare the shipper, consignee, notify party, port of loading, port of discharge, container count, and gross weight.
5. Assign a `MATCH`, `MISMATCH`, `NEEDS_REVIEW`, or `FAILED` status.
6. View field-level results through the case API or export results through the submission endpoint.
