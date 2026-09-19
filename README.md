## Features

### 1. Dashboard

The dashboard provides an overview of all shipping document verification cases and their current statuses.

Each case is categorized into one of the following statuses:

- **Matched** – All required fields have been checked and the SI and draft BL values agree.
- **Mismatch** – One or more differences have been identified between the SI and draft BL.
- **Needs Review** – Missing, unclear, or uncertain information requires human verification.
- **Failed** – Processing could not be completed successfully and may require a retry.

Users can open an individual case to view its comparison results, extracted information, confidence levels, and supporting evidence.

---

### 2. SI and Draft BL Comparison

The system compares the **Shipping Instruction (SI)** and **draft Bill of Lading (BL)** side by side across seven required fields:

- Shipper
- Consignee
- Notify Party
- Port of Loading
- Port of Discharge
- Container Count
- Gross Weight in Kilograms

Matching and mismatching values are clearly indicated.

When a mismatch is identified, the system displays:

- The SI value
- The draft BL value
- Supporting source evidence

This allows users to verify the identified discrepancy.

---

### 3. Confidence and Evidence Display

The system displays an **extraction confidence level** for individual fields together with the relevant source evidence.

The confidence level represents how certain the system is that it has correctly read or extracted a value from the document.

> **Note:** The confidence level does not represent the probability that the SI and draft BL values match.

Where available, the system also displays supporting evidence such as:

- Extracted source text
- Page number

This allows users to verify how each value was obtained from the original document.

---

### 4. AI-Generated Message Drafts

The system can generate editable message drafts based on the final verification result.

For cases where all required fields match, the system can generate a **confirmation message**.

For cases with confirmed mismatches, the system can generate a **correction request** describing the identified differences.

Users must review and may edit the generated message before copying or sending it through an external communication platform.

The system does **not** automatically send messages.

---

### 5. Human Review and Feedback

Cases containing uncertain, missing, or unclear information can be sent for human review.

Users can perform actions such as:

- Confirm an extracted value.
- Correct an incorrectly extracted value.
- Confirm that two differently written values are equivalent.
- Mark a value or document section as unreadable.

Approved corrections and equivalences can be stored to support future document checks.

After a correction is made, the comparison can be rerun so that the case status and results are updated.

> The feedback mechanism does not automatically retrain the AI model.

---

### 6. Manual Document Upload

Users can manually upload:

- One **Shipping Instruction (SI)**
- One corresponding **draft Bill of Lading (BL)**

After the documents are processed, the system displays:

- Overall verification status
- Seven-field SI and draft BL comparison
- Identified mismatches
- Extraction confidence information
- Supporting evidence
- Fields or issues requiring human review

---

## User Workflow

1. Upload a Shipping Instruction and its corresponding draft Bill of Lading.
2. Allow the system to process and compare the documents.
3. View the verification status from the dashboard.
4. Open the case to inspect the seven-field comparison, confidence information, and supporting evidence.
5. Review uncertain values, confirm discrepancies, or correct extracted information where necessary.
6. Rerun the comparison after human review if changes were made.
7. Generate and edit a confirmation or correction-request message when follow-up communication is required.
