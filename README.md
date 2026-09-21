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

## Tech Stack
- Backend: Python 3.11+, FastAPI, Uvicorn, and Pydantic
- HTTP integration: httpx for the external Inbox service and optional Groq API calls
- Document processing: pypdf and Pillow, with support for TXT, PDF, DOCX, and XLSX attachments in AI mode
- Testing: pytest and pytest-asyncio


## System Architecture
ProShipping’s FastAPI backend connects to an external Inbox service to retrieve emails and attachments. A case processor classifies each email and sends document comparison requests through the SI and draft BL verification pipeline. The pipeline extracts seven shipping fields, normalizes their values, compares them, and returns a case status with field-level evidence.
By default, processing uses deterministic rules for TXT documents. Optional AI mode uses Groq for email classification and document extraction, including vision transcription for supported scanned PDFs. Python code validates the extracted evidence and decides the final comparison status. Cases are held in memory by the running API process.
