# ProShipping
## 🚢 Problem Statement

### The Current State of Shipping Documentation

International shipping depends heavily on accurate documentation, yet trade documentation remains fragmented, resource-intensive, and vulnerable to error.

According to **McKinsey & Company**, documentation for a single shipment can involve **up to 50 sheets of paper exchanged among as many as 30 stakeholders**, while the **Bill of Lading (BL)** alone accounts for approximately **10% to 30% of total trade-documentation costs**.

The documentation process surrounding a BL may also require **six hours or more across stakeholders**, with non-digital processes remaining costly, time-consuming, and susceptible to errors.

> **Shipping documentation is not only complex — it also creates a significant operational and financial burden across the supply chain.**

---

### 💰 The Business Cost of an Inefficient Process

The economic opportunity for improving this process is substantial.

McKinsey estimates that widespread adoption of **electronic Bills of Lading** could generate approximately:

* **US$6.5 billion in annual direct cost savings**
* **US$30–40 billion in additional global trade**

Digitalization can reduce unnecessary administrative work, accelerate information exchange, and improve supply-chain resilience.

However, converting shipping documents from paper to digital form does not by itself guarantee that the **information recorded within them is accurate**.

This means that even within a digital workflow, shipment information must still be properly verified before a Bill of Lading is finalized.

---

### 🔄 From Shipping Instruction to Draft Bill of Lading

This becomes particularly important during the transition from a **Shipping Instruction (SI)** to a **draft Bill of Lading (BL)**.

The **Digital Container Shipping Association (DCSA)** defines a Bill of Lading workflow that includes:

1. Submitting Shipping Instructions
2. Publishing a draft transport document
3. Reviewing or updating the Shipping Instructions when changes are required
4. Approving the draft
5. Issuing the final transport document

A similar process can be seen in Malaysia.

The **Kuantan Port Authority's Operational Framework for Export Logistics** describes a standard practice in which Shipping Instructions are received and validated before information such as the following is extracted:

* Shipper
* Consignee
* Notify Party
* Port of Loading
* Port of Discharge
* Cargo Quantity
* Cargo Weight

This validated SI information is then used to prepare a **draft Bill of Lading**, which is submitted for review and corrected where necessary before final approval and issuance.

The process can therefore be simplified as:

```text
Shipping Instruction
        │
        ▼
Draft Bill of Lading
        │
        ▼
Verification and Review
        │
        ▼
Final Bill of Lading
```

This makes the draft stage an important opportunity to identify discrepancies **before incorrect information progresses further through the shipping process**.

---

### ⚠️ Small Documentation Errors Can Create Larger Problems

Research on shipping-document amendments shows that even relatively minor inaccuracies can result in **costly and time-consuming corrections**.

Common causes include:

* Typographical errors
* Incomplete information
* Miscommunication between stakeholders
* Changes in shipment details

For Bills of Lading specifically, the study identifies **incorrect consignee or notify-party details** and **changes in Shipping Instructions** as common causes of amendments.

These amendments are more than simple administrative corrections.

Documentation mistakes can:

* Disrupt logistics operations
* Delay shipments
* Delay customs clearance
* Generate amendment fees
* Create demurrage costs
* Result in financial penalties
* Require additional manpower
* Create additional rework and coordination effort

The same study found that amendment approvals commonly take approximately **one to three days**, which may contribute to delays in cargo processing and transport rescheduling.

It also identifies additional manpower and coordination work as part of the operational burden created by documentation amendments.

> **An error that is not detected during the draft stage may therefore become more expensive and time-consuming to correct later in the shipping process.**

---

### 🔍 The Verification Challenge

The challenge is therefore to detect discrepancies **before incorrect information progresses beyond the draft Bill of Lading stage**.

For shipping teams handling these checks through a shared operational inbox, the verification process begins even before the documents themselves are compared.

Staff must first:

```text
Identify the correct incoming email
        │
        ▼
Locate the Shipping Instruction and Draft BL
        │
        ▼
Read and extract the required shipment information
        │
        ▼
Compare the SI against the Draft BL
        │
        ▼
Determine whether differences are genuine discrepancies
        │
        ▼
Escalate unclear or uncertain cases when necessary
```

For each relevant case, the Shipping Instruction and draft Bill of Lading must be compared across critical shipment information such as:

**Shipper · Consignee · Notify Party · Port of Loading · Port of Discharge · Container Count · Gross Weight**

This comparison is repetitive and susceptible to human error.

It is also not always a simple text comparison.

For example:

```text
Shipping Instruction:  Port of Loading
Draft Bill of Lading:  Load Port
```

These labels may refer to the **same shipment information** despite being written differently.

At the same time, genuine discrepancies such as:

```text
Shipping Instruction:  Container Count = 3
Draft Bill of Lading:  Container Count = 4
```

must still be detected accurately.

Missing, unclear, or unreadable information introduces further uncertainty and requires **human judgement rather than an automatic assumption**.

---

### 🎯 The Core Problem

The underlying problem is therefore **not simply the lack of digital shipping documents**.

> **Shipping teams need a faster, more reliable, and traceable way to verify that the information transferred from a Shipping Instruction into a draft Bill of Lading is accurate before final approval.**

Earlier and more reliable discrepancy detection can reduce the risk of avoidable amendments and the associated:

* **Processing delays**
* **Additional costs**
* **Manual rework**
* **Operational disruption**

At the same time, any automated verification process must remain trustworthy by providing **supporting evidence** and escalating uncertain cases for **human review**, rather than silently accepting or rejecting information that cannot be verified confidently.

---

## 📚 References

1. **McKinsey & Company**
   *The multi-billion-dollar paper jam: Unlocking trade by digitalizing documentation*
   [Read the article](https://www.mckinsey.com/industries/logistics/our-insights/the-multi-billion-dollar-paper-jam-unlocking-trade-by-digitalizing-documentation)

2. **Digital Container Shipping Association (DCSA)**
   *Bill of Lading Standards and Use Cases*
   [View the DCSA Bill of Lading use cases](https://dcsa.org/standards/bill-of-lading/documentation-bill-of-lading-3/bill-of-lading-3-use-cases)

3. **Kuantan Port Authority**
   *Operational Framework for Export Logistics at Kuantan Port*
   [View the operational framework](https://www.lpktn.gov.my/wp-content/uploads/2025/09/Final-Kuantan-Operational-Framework-for-Export-Logistics-at-Kuantan-Port-Ver-1.1.0-2-556_opt.pdf)

4. **Balaji R. & Kalaiyarasan B. (2025)**
   *A Comprehensive Study on Challenges Faced in Documentation Amendments*
   International Advanced Research Journal in Science, Engineering and Technology, Vol. 12, Issue 5.
   [View the study via DOI](https://doi.org/10.17148/IARJSET.2025.125121)

---

## 💡 Solution

**ProShipping** is an intelligent shipping-document verification system designed to identify discrepancies between a **Shipping Instruction (SI)** and a **draft Bill of Lading (BL)** before incorrect information progresses further through the documentation process.

Rather than treating verification as a simple file-comparison task, ProShipping supports the full operational workflow — from identifying the correct email, extracting shipment information, and comparing critical fields, to presenting supporting evidence and involving a human reviewer when the system cannot make a dependable decision.

ProShipping follows an **evidence-first, human-in-the-loop approach**. Automated results are not presented as unexplained conclusions. Each comparison can include:

- Original extracted values
- Normalized values
- Extraction confidence
- Comparison explanations
- Supporting source evidence

When information is missing, unreadable, uncertain, or requires further judgement, the case remains visible and can be routed into **Human Review** instead of being silently treated as a successful verification.

### 🔄 End-to-End Workflow

```text
Incoming Email
        │
        ▼
Email Classification
        │
        ├── SI Request
        ├── Invoice Query
        ├── General
        ├── Spam
        │
        └── BL Comparison
                │
                ▼
        SI + Draft BL Extraction
                │
                ▼
        Value Normalization
                │
                ▼
        Seven-Field Comparison
                │
          ┌─────┼─────┐
          ▼     ▼     ▼
       Matched Mismatch Needs Review
          │     │       │
          │     │       ▼
          │     └── Human Review
          │              │
          │        Correct / Confirm /
          │        Accept Equivalent /
          │        Retry / Escalate
          │              │
          └──────────────┘
                 │
                 ▼
        Final Verified Result
```

### 🎯 Why ProShipping Fits the Problem

The verification challenge does not begin and end with comparing two documents.

Shipping teams must first identify which incoming messages require verification, locate the correct SI and draft BL, extract the required shipment information, determine whether differently written values are actually equivalent, detect genuine discrepancies, and decide when a result is too uncertain to trust automatically.

ProShipping is designed around this **entire verification workflow**.

It directly addresses the main operational problems:

- **Inbox overload and missed requests** through automatic email classification and direct routing of BL comparison requests.
- **Repetitive manual checking** through automated extraction and comparison of the seven required shipment fields.
- **Formatting and terminology differences** through normalization and comparison logic.
- **Opaque automated decisions** through confidence information, comparison explanations, source references, and supporting evidence.
- **Missing, unreadable, or uncertain information** through a dedicated Human Review workflow.
- **Unresolved operational issues** through correction, retry, supervisor escalation, sender follow-up, and review history.

ProShipping therefore functions as more than a document-comparison tool. It provides a **traceable verification workflow for identifying, explaining, reviewing, and resolving shipping-document discrepancies before the draft Bill of Lading is finalized**.

By combining automation with evidence and human oversight, ProShipping is designed to reduce repetitive manual work while preserving the judgement required for uncertain cases.

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

---

## Limitations

- Processed cases are stored in memory and are lost when the backend restarts.
- The default processing mode extracts fields from TXT attachments only. PDF, DOCX, XLSX, and scanned PDF processing require the optional AI mode.
- AI results can be affected by unclear scans, unusual document layouts, and provider rate limits. Full-dataset AI accuracy has not yet been measured.
- Missing attachments, unreadable documents, uncertain values, and incorrect document types require human review.
- The current backend does not provide an implemented dashboard, manual upload flow, or interface for correcting extracted values.
- The API depends on an external Inbox service to process emails.

---

## Future Improvements

- Build the dashboard and inbox interface so users can inspect cases, comparisons, and source evidence.
- Add a human review workflow for correcting extracted values and rerunning comparisons.
- Support manual SI and draft BL uploads without requiring an email.
- Store emails, cases, corrections, and processing history in a persistent database.
- Improve extraction and OCR accuracy across different document formats and layouts, then evaluate performance against the full dataset.
- Add editable confirmation and correction message drafts for reviewed cases.
- Improve handling of large inboxes with background processing, progress tracking, and retry controls.
