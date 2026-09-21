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

### 🌍 Who Is Affected?

The impact of shipping-document errors does not stop with the documentation team.

**Exporters and shippers** may face amendment charges, additional administrative work, and delays in cargo processing, while **importers and consignees** may experience delayed cargo availability and downstream delivery disruption.

**Freight forwarders, shipping operations teams, carriers, customs-related parties, and port operators** may also need to spend additional time coordinating corrections, validating updated information, and rescheduling affected activities.

These effects can continue further down the supply chain. Businesses waiting for inventory may receive goods later, while end customers may ultimately experience delayed product availability or deliveries.

The ripple effect can be illustrated as:

```text
Shipping Document Error
          │
          ▼
BL Amendment / Correction
          │
          ├──────────────► Additional Cost
          │
          ├──────────────► Extra Rework
          │
          └──────────────► Processing / Customs Delay
                                   │
                                   ▼
                     Logistics & Shipping Operations
                                   │
                                   ▼
                        Importers / Consignees
                                   │
                                   ▼
                     Businesses Waiting for Goods
                                   │
                                   ▼
                        End Customers / Consumers
```

> **A documentation error that begins as a small discrepancy can therefore create operational consequences across multiple stakeholders before eventually becoming visible as a delayed shipment or product delivery.**

Because shipment information moves across multiple organizations, an error introduced or overlooked at one stage can create consequences well beyond the original document.

This makes early and accurate verification especially important before the draft Bill of Lading progresses further through the shipping process.

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

**ProShipping** is an intelligent shipping-document verification system designed to help **shipping operations and documentation teams** identify discrepancies between a **Shipping Instruction (SI)** and a **draft Bill of Lading (BL)** before incorrect information progresses further through the documentation process.

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

By addressing discrepancies at the draft stage, ProShipping targets the problem at an early control point before incorrect information can create additional work further down the shipping process.

The immediate benefit is for **shipping operations teams, freight forwarders, exporters, importers, and other logistics stakeholders** who may otherwise need to spend additional time correcting documents, coordinating amendments, or resolving delayed cargo processing.

The potential impact can extend further down the supply chain. By reducing the risk of avoidable documentation errors progressing into later stages, ProShipping can help reduce one source of disruption that may ultimately affect businesses waiting for goods and end customers waiting for deliveries.

It directly addresses the main operational problems:

- **Inbox overload and missed requests** through automatic email classification and direct routing of BL comparison requests.
- **Repetitive manual checking** through automated extraction and comparison of the seven required shipment fields.
- **Formatting and terminology differences** through normalization and comparison logic.
- **Opaque automated decisions** through confidence information, comparison explanations, source references, and supporting evidence.
- **Missing, unreadable, or uncertain information** through a dedicated Human Review workflow.
- **Unresolved operational issues** through correction, retry, supervisor escalation, sender follow-up, and review history.

ProShipping therefore functions as more than a document-comparison tool. It provides a **traceable verification workflow for identifying, explaining, reviewing, and resolving shipping-document discrepancies before the draft Bill of Lading is finalized**.

By combining automation with evidence and human oversight, ProShipping is designed to reduce repetitive manual verification while preserving the judgement required for uncertain cases. Detecting genuine discrepancies earlier can also reduce the risk of avoidable amendments, rework, additional operational costs, and documentation-related processing delays affecting stakeholders further along the supply chain.

---

## ✨ Key Features

### 📥 1. Intelligent Inbox Processing

ProShipping begins where the operational workflow begins: the inbox.

Incoming emails are automatically classified into:

- **BL Comparison**
- **SI Request**
- **Invoice Query**
- **General**
- **Spam**

Users can:

- Filter emails by category.
- Inspect the sender, subject, message body, attachments, and classification.
- Open BL comparison requests directly as verification cases.

This reduces the manual effort required to identify document-checking requests among unrelated operational emails.

---

### 📊 2. Operational Dashboard

The Dashboard provides a centralized overview of verification cases and separates them into:

- **Matched**
- **Mismatch**
- **Needs Review**

Each case preview shows important information such as:

- Case ID
- Subject
- Sender
- Verification status
- Reported field issues

Cases requiring attention can also be grouped by their **review reason**, helping users identify missing, unreadable, or uncertain information more quickly.

Users can also begin a manual SI and draft BL verification directly from the Dashboard.

---

### 🔍 3. Seven-Field SI–BL Verification

ProShipping compares the Shipping Instruction and draft Bill of Lading across seven critical shipment fields:

1. **Shipper**
2. **Consignee**
3. **Notify Party**
4. **Port of Loading**
5. **Port of Discharge**
6. **Container Count**
7. **Gross Weight**

Each field clearly displays whether it is:

- **Matched**
- **Mismatched**
- **Missing**
- **Requires Review**

The SI and draft BL values are displayed side by side to make discrepancies easy to identify.

---

### 🔄 4. Raw Values, Normalization & Comparison Explanations

Document verification is not always a direct text comparison.

The same shipment information may be written differently across documents. For example:

```text
Port of Loading
Load Port
```

These may refer to the same field despite the different wording.

ProShipping therefore preserves both the **original extracted value** and its **normalized form**.

Users can also see:

- The comparison method used.
- The reason for the field result.
- Explanations for values accepted as equivalent.

This makes it easier to distinguish genuine discrepancies from harmless differences in wording or formatting.

---

### 🎯 5. Extraction Confidence

Each extracted value can display its available **extraction confidence**.

Confidence represents how certain the system is that a value was correctly read from the source document. It does **not** indicate whether the SI and draft BL match.

This allows users to distinguish between:

```text
High-confidence Match
```

and:

```text
Low-confidence Match
```

where the values appear identical but one extraction may still require human inspection.

---

### 📄 6. Evidence-Backed Source Comparison

Users can inspect the evidence behind a comparison through the dedicated **Source Comparison** view.

Selecting a field shows the corresponding SI and draft BL evidence side by side.

Depending on document type, ProShipping can provide:

- Highlighted text evidence
- Surrounding document context
- PDF page navigation
- Highlighted PDF evidence regions
- Word paragraph or table references
- Spreadsheet sheet or cell references
- Original attachment access

Different document formats can also be viewed together, such as a text Shipping Instruction alongside a PDF draft BL.

When exact highlighting cannot be determined reliably, ProShipping displays the available source evidence and reference instead of inventing a location.

> **The goal is not simply to produce a result, but to make that result verifiable.**

---

### 👤 7. Human Review

Cases requiring judgement are routed into a dedicated **Human Review workflow**.

Reviewers can:

- Confirm eligible automated results.
- Correct incorrectly extracted SI or BL values.
- Accept differently written values as equivalent.
- Mark information as unreadable.
- Add review notes.
- Retry processing.
- Escalate unresolved issues to a supervisor.
- Request additional information from the sender.

ProShipping preserves the distinction between:

```text
Automated Value
      ↓
Reviewed Value
      ↓
Effective Value
```

This allows human corrections without removing the original automated result.

---

### 🧾 8. Review Audit Trail

Human decisions remain traceable throughout the verification process.

ProShipping records:

- Affected fields
- Document side
- Original automated values
- Corrected values
- Reviewer decisions
- Notes
- Escalation reasons
- Information requests
- Retry outcomes
- Timestamps

Separate histories preserve retry and escalation activity.

This provides a clear record of how a verification result changed after human intervention.

---

### 🔁 9. Failure Handling & Retry

Missing, unreadable, incomplete, and failed results remain clearly visible instead of being incorrectly presented as successful matches.

Eligible cases can be reprocessed, while the new outcome is stored separately from the original automated result.

This allows the workflow to recover from processing failures without losing the history of what occurred previously.

---

### 🚨 10. Supervisor Escalation & Sender Follow-Up

Some discrepancies cannot be resolved through document comparison alone.

ProShipping therefore supports two follow-up workflows.

#### Supervisor Escalation

Reviewers can escalate an unresolved issue together with:

- Affected field
- SI and BL values
- Review reason
- Actions already taken
- Escalation reason
- Requested supervisor decision

These cases are placed into a dedicated supervisor queue.

#### Sender Follow-Up

When additional information is required, reviewers can record what clarification is needed from the sender.

These cases are placed into a dedicated sender follow-up queue.

Both workflows support:

- Active queues
- Sent history
- Delivery status
- Failed delivery states
- Resend actions

This extends ProShipping beyond simply finding discrepancies into helping users resolve them.

---

### 📤 11. Manual Document Verification

ProShipping also supports verification outside the inbox workflow.

Users can upload:

- One **Shipping Instruction**
- One corresponding **draft Bill of Lading**

Supported formats include:

- **PDF**
- **TXT**
- **DOCX**
- **XLSX**

The uploaded case then uses the same verification workflow, including:

- Seven-field comparison
- Overall verification status
- Review reason
- Confidence information
- Supporting evidence
- Original source access

This allows ProShipping to support both inbox-driven processing and ad-hoc document verification.

---

### 📦 12. Competition Results Export

ProShipping can generate the complete competition submission output separately from its operational workflows.

This keeps competition evaluation data independent from:

- Human Review
- Supervisor escalation
- Sender follow-up

The exported result can then be used with the challenge's provided self-evaluation mechanism.

---

### ✅ What ProShipping Delivers

Together, these features form a complete verification workflow:

```text
Identify
   ↓
Extract
   ↓
Normalize
   ↓
Compare
   ↓
Explain
   ↓
Verify Evidence
   ↓
Human Review when needed
   ↓
Resolve / Escalate / Retry
   ↓
Final Verified Result
```

ProShipping is built around three core principles:

**⚡ Efficiency**  
Reduce repetitive email triage and manual field-by-field document checking.

**🔎 Traceability**  
Show the values, evidence, confidence, comparison reasoning, and review history behind verification results.

**👤 Human Oversight**  
Automate routine cases while preserving human judgement for missing, uncertain, unreadable, or disputed information.

---

## 🛠 Tech Stack

ProShipping is built as a full-stack web application consisting of a **Next.js frontend** and a **FastAPI backend**.

### Frontend

* **Next.js 15** – frontend framework and routing
* **React 19** – component-based user interface
* **TypeScript** – type-safe frontend development
* **Tailwind CSS 4** – interface styling
* **React PDF / PDF.js** – PDF document rendering and source-document inspection

### Backend

* **Python 3.11+**
* **FastAPI** – REST API framework
* **Uvicorn** – ASGI development server
* **Pydantic** – request, response, and data validation
* **httpx** – asynchronous HTTP communication with external services

### Document Processing

* **PyMuPDF**
* **pypdf**
* **python-docx**
* **openpyxl**
* **Pillow**

These libraries allow ProShipping to process shipping documents in formats including **PDF, TXT, DOCX, and XLSX**.

### AI Processing

* **Groq API** – optional AI-assisted email classification, document extraction, scanned-document transcription, and semantic comparison

### Testing

* **pytest**
* **pytest-asyncio**

---

## 🏗 System Architecture

ProShipping follows a client-server architecture consisting of a **Next.js frontend**, a **FastAPI backend**, an external **Inbox service**, and optional external AI and email-delivery services.

```text
                    ┌─────────────────────┐
                    │    Next.js Client   │
                    │   User Interface    │
                    └──────────┬──────────┘
                               │
                         REST API / HTTP
                               │
                               ▼
                    ┌─────────────────────┐
                    │   FastAPI Backend   │
                    │                     │
                    │ • Email Processing  │
                    │ • Document Parsing  │
                    │ • Normalization     │
                    │ • Comparison        │
                    │ • Human Review      │
                    │ • Submission Export │
                    └──────┬───────┬──────┘
                           │       │
              ┌────────────┘       └─────────────┐
              ▼                                  ▼
    ┌──────────────────┐                ┌─────────────────┐
    │ External Inbox   │                │    Groq API     │
    │ Service          │                │   (Optional)    │
    │                  │                │                 │
    │ Emails +         │                │ Classification  │
    │ Attachments      │                │ Extraction      │
    └──────────────────┘                │ Vision/OCR      │
                                        │ Semantic Check  │
                                        └─────────────────┘
```

The frontend communicates with the backend through REST API endpoints. The backend is responsible for retrieving inbox data, accepting manually uploaded document pairs, extracting shipping information, normalizing values, comparing the Shipping Instruction against the draft Bill of Lading, and determining the final verification status.

For inbox-based processing, the backend connects to an external Inbox service to retrieve emails and their attachments. AI processing can optionally be enabled through Groq to support more complex document extraction, scanned documents, email classification, and semantic equivalence checking.

Processed cases, uploaded comparison sessions, human-review records, retry records, escalation records, and submission workflow data are currently managed by backend services during application execution.

---

## 🚀 Setup and Run Instructions

### Prerequisites

Make sure the following are installed before running ProShipping:

* **Python 3.11 or later**
* **Node.js and npm**
* Access to the project's external **Inbox service**
* A **Groq API key** if AI processing is enabled

### 1. Clone the Repository

```bash
git clone https://github.com/joelchongxj-eng/ProShipping.git
cd ProShipping
git checkout final-integration
```

### 2. Start the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

#### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

#### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install the backend dependencies:

```bash
python -m pip install -e ".[dev]"
```

Configure the required environment variables in a `.env` file or through your operating system environment.

Start the FastAPI server:

```bash
python -m uvicorn app.main:app --reload --port 8001
```

The backend API will be available at:

```text
http://localhost:8001
```

Interactive Swagger API documentation can be opened at:

```text
http://localhost:8001/docs
```

### 3. Start the Frontend

Open another terminal and navigate to:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Configure the frontend environment variables in `.env.local`, for example:

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

in your browser.

### 4. Run Backend Tests

From the `backend` directory:

```bash
python -m pytest -q
```

### 5. Production Frontend Build

To create and run a production build:

```bash
npm run build
npm start
```

---

## 🔐 Environment Variables

ProShipping uses environment variables to configure its backend services, optional AI features, frontend API connection, upload handling, and email-delivery functions.

The FastAPI backend loads environment variables from a local `.env` file using `python-dotenv`.

### Core Backend Configuration

| Variable             | Description                                                            | Default                 |
| -------------------- | ---------------------------------------------------------------------- | ----------------------- |
| `INBOX_BASE_URL`     | Base URL of the external Inbox service                                 | `http://localhost:8080` |
| `CORS_ORIGINS`       | Comma-separated list of frontend origins allowed to access the backend | `http://localhost:3000` |
| `APP_ENV`            | Application environment such as `development` or `production`          | `development`           |
| `UPLOAD_TTL_SECONDS` | Amount of time uploaded comparison sessions remain available           | `3600`                  |
| `MAX_UPLOAD_BYTES`   | Maximum permitted size of an uploaded document                         | `10485760` (10 MB)      |

### AI Configuration

| Variable              | Description                                                        | Default              |
| --------------------- | ------------------------------------------------------------------ | -------------------- |
| `AI_ENABLED`          | Set to `1` to enable AI-assisted document processing               | `0`                  |
| `SEMANTIC_AI_ENABLED` | Set to `1` to enable AI-assisted semantic equivalence checking     | `0`                  |
| `GROQ_API_KEY`        | Groq API key required when AI functionality is enabled             | None                 |
| `GROQ_MODEL`          | Groq model used for classification and structured field extraction | `openai/gpt-oss-20b` |
| `GROQ_VISION_MODEL`   | Vision model used for scanned-document transcription               | `qwen/qwen3.8-27b`   |

Example:

```dotenv
INBOX_BASE_URL=http://localhost:8080
CORS_ORIGINS=http://localhost:3000

AI_ENABLED=1
SEMANTIC_AI_ENABLED=1

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
GROQ_VISION_MODEL=qwen/qwen3.8-27b
```

### Email Delivery Configuration

ProShipping supports **SMTP** or **HTTPS API-based email delivery** for follow-up and escalation workflows.

Common configuration:

| Variable                         | Description                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `EMAIL_PROVIDER`                 | Email provider mode: `smtp` or `https`                                   |
| `EMAIL_FROM_ADDRESS`             | Address used to send outgoing messages                                   |
| `EMAIL_DELIVERY_TIMEOUT_SECONDS` | Timeout for outgoing email delivery                                      |
| `SUPERVISOR_EMAIL`               | Supervisor destination used by escalation workflows                      |
| `OUTBOUND_EMAIL_AUTH_TOKEN`      | Authentication token required for outbound email functions in production |

For SMTP:

```dotenv
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_FROM_EMAIL=example@example.com
SMTP_USERNAME=your_username
SMTP_PASSWORD=your_password
SMTP_USE_TLS=1
```

For HTTPS-based email delivery:

```dotenv
EMAIL_PROVIDER=https
EMAIL_API_KEY=your_api_key
EMAIL_FROM_ADDRESS=example@example.com
EMAIL_API_BASE_URL=https://api.resend.com
```

Do **not** commit real API keys, passwords, or authentication tokens to GitHub.

### Frontend Configuration

Create `frontend/.env.local` and configure the backend URL:

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
```

---

## 🔄 Main Workflow

ProShipping supports two main entry points: **inbox-based processing** and **manual document verification**.

### Inbox-Based Verification

```text
Incoming Email
      │
      ▼
Retrieve Email from Inbox Service
      │
      ▼
Email Classification
      │
      ├── BL Comparison
      ├── SI Request
      ├── Invoice Query
      ├── General
      └── Spam
              │
              ▼
     BL Comparison Request
              │
              ▼
Identify SI + Draft BL Attachments
              │
              ▼
Extract Seven Shipping Fields
              │
              ▼
Normalize Extracted Values
              │
              ▼
Compare SI Against Draft BL
              │
       ┌──────┼───────┐
       ▼      ▼       ▼
    MATCH  MISMATCH  NEEDS_REVIEW
                       │
                       ▼
                 Human Review
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
           Correct   Retry   Escalate
                       │
                       ▼
              Final Verified Result
```

The system compares seven critical shipment fields:

1. **Shipper**
2. **Consignee**
3. **Notify Party**
4. **Port of Loading**
5. **Port of Discharge**
6. **Container Count**
7. **Gross Weight**

Each processed case receives an overall status such as:

* `MATCH`
* `MISMATCH`
* `NEEDS_REVIEW`
* `FAILED`

### Manual Verification

Users can also upload one Shipping Instruction and one draft Bill of Lading directly through the application.

```text
Upload SI + Draft BL
        │
        ▼
Document Validation
        │
        ▼
Text / Document Extraction
        │
        ▼
Seven-Field Extraction
        │
        ▼
Normalization
        │
        ▼
Field Comparison
        │
        ▼
Verification Result
        │
        ├── MATCH
        ├── MISMATCH
        └── NEEDS_REVIEW
```

Both processing methods ultimately use the same comparison logic and generate field-level results that can be inspected through the frontend or API.

---

## Challenges Faced

### 1. Establishing a Reliable Verification Baseline

One of the earliest challenges was converting a large inbox of approximately 520 emails into structured verification cases. Since the inbox contained different types of messages, the system first needed to distinguish genuine Shipping Instruction (SI) and Bill of Lading (BL) comparison requests from unrelated emails before processing their attachments.

The shipping documents themselves also used inconsistent field labels, layouts, abbreviations, and formatting. Important information such as shipper names, consignee details, port names, container counts, and gross weights could appear in different locations or formats. To address this, the backend introduced deterministic extraction and normalization logic before performing field-level comparisons.

Another difficulty was maintaining accurate results without producing false matches, fabricated values, or allowing AI-generated values to overwrite more reliable deterministic extraction. Comparison rules and validation were therefore designed so that uncertain cases could be identified instead of being automatically accepted.

### 2. Supporting Different Document Formats

Supporting plain-text files alone was not sufficient because SI and BL documents appeared in multiple formats, including:

* TXT
* PDF
* DOCX
* XLSX
* Scanned or image-only PDF documents

Each format required different extraction methods. Tables, multiline addresses, bilingual labels, different field positions, and image-based documents frequently caused missing or incorrect extraction results.

The system therefore added format-specific document readers together with document-type validation and source evidence tracking. Scanned and image-only PDFs required an AI Vision fallback when normal text extraction was unavailable.

Some attachments were also damaged, missing, incorrectly labelled, or inconsistent with their filenames. Instead of forcing a comparison result, these cases could be routed to `NEEDS_REVIEW` for manual inspection.

### 3. Managing AI Reliability

AI-assisted extraction introduced additional challenges. Selected tests produced issues such as OCR spelling errors, values extracted from the wrong document section, malformed JSON responses, and Groq API rate limits.

To reduce these problems, the backend introduced stronger field anchoring, structured response validation, bounded retries, and controls to reduce bursts of AI requests.

AI was also treated as a supporting mechanism rather than the sole source of truth. Deterministic extraction remained important, and uncertain AI results were prevented from silently replacing verified values.

The AI-related tests were performed on selected cases and therefore do not represent complete accuracy testing across the entire 520-email dataset.

### 4. Integrating the Frontend and Backend

As development progressed, the backend API continued to gain new fields, statuses, review actions, source locations, retry states, escalation information, and submission workflows. The frontend therefore had to continuously remain compatible with the latest API contracts while avoiding regressions in existing functionality.

Another challenge involved backend connectivity. Different frontend features initially constructed backend URLs in different ways, which could cause some pages to report that the backend was unavailable even while other features were still working. Backend URL handling was later centralized so that direct requests and proxy routes followed a consistent strategy.

The integration also required the frontend and backend to use consistent:

* Case IDs
* Verification statuses
* Review states
* Field evidence
* API response structures
* Submission workflow states

Maintaining these contracts was important because the backend remained the primary source of truth for system state.

### 5. Building Accurate Source Evidence and Document Viewing

The system needed to show users where extracted information originated instead of displaying only the final comparison result.

This became difficult because different file formats expose source locations differently. TXT files can reference text positions, PDFs use page-based locations, while DOCX and XLSX files require different evidence representations.

Attachment paths also sometimes included directory prefixes while the backend expected only filenames. The frontend therefore needed to normalize these paths before retrieving documents.

The source viewer was designed to highlight exact evidence whenever sufficient location information was available, while using clear fallbacks when precise highlighting could not be provided.

### 6. Presenting Complex Comparison Results Clearly

Each of the seven shipping fields can contain multiple pieces of information, including:

* Raw extracted value
* Normalized value
* Match status
* Confidence information
* Comparison reason
* Comparison method
* Semantic equivalence explanation
* Source evidence

Displaying all of this information without overwhelming the user was a major frontend challenge.

The interface therefore needed to balance technical transparency with readability, allowing users to inspect detailed evidence while still understanding the overall SI–BL comparison quickly.

### 7. Implementing the Human Review Workflow

The Human Review process involved several different actions, including:

* Confirm
* Correct
* Mark as Equivalent
* Mark as Unreadable
* Add Note
* Retry
* Escalate
* Request Information

Each action required different fields, validation rules, scopes, forms, and refresh behaviour.

A further challenge was keeping automated results separate from human decisions. Automated verification status, reviewer corrections, retry outcomes, escalation state, and communication status represent different stages of the workflow and could not be merged into a single result without creating misleading information.

The system therefore preserves these states separately so that the original automated output and later human decisions remain traceable.

### 8. Implementing the Submission and Email Workflow

The Submission workspace introduced another layer of workflow complexity. Supervisor Escalations and Sender Follow-Up required separate queues, statuses, dispatch actions, update behaviour, deletion, failure handling, and resend functionality.

The frontend needed to use the workflow state returned by the backend rather than recreating or duplicating submission state locally.

Email delivery also required secure configuration and error handling. The backend needed to support both SMTP and HTTPS-based email delivery while protecting credentials and preserving submission history, resend behaviour, and update operations.

One integration issue involved successful responses that contained no response body. For example, removing a submission could succeed in the backend, but the frontend proxy initially attempted to attach content to a `No Content` response, causing an error even though the operation itself had completed successfully.

### 9. Removing Mock and Outdated Behaviour

Early versions of the frontend included development placeholders such as mock dates, confidence values, classification details, review messages, and locally simulated submission behaviour.

Removing these elements required careful checking because they had to be replaced with real backend data without breaking existing UI behaviour.

This process also required removing outdated assumptions whenever backend contracts changed, while ensuring that the interface accurately represented real system state and error conditions.

### 10. Testing the Complete Integrated Workflow

Testing the complete application was challenging because the system contained many interconnected features.

Testing needed to cover not only the main SI–BL verification process, but also:

* The complete 520-email workflow
* Manual uploads
* Human Review
* Retry processing
* Escalations
* Source document viewing
* CSV export
* Submission JSON
* Email delivery
* Browser integration

Changes made to one component could affect another part of the workflow. Integration testing was therefore necessary to ensure that improvements did not introduce regressions elsewhere.

### Current Limitations

The prototype now covers the main document verification, review, escalation, and submission workflow. However, several areas remain suitable for future improvement.

Current limitations include:

* Workflow records are primarily stored in application memory.
* Persistent database storage has not yet been implemented.
* Full user authentication and authorization are not yet available.
* AI accuracy has not been comprehensively evaluated across all 520 records.
* Broader regression and production-scale testing are still required.
