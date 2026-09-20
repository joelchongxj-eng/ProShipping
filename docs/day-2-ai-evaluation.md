# Day 2 AI evaluation

Evaluate a small, hand-checked set before spending API quota on the full inbox. The organizer's ground truth is unavailable, so these expectations come from inspecting the source documents and the Day 1 smoke checks in `day-1-baseline.md`.

| Email | Format | Expected outcome | Key check |
| --- | --- | --- | --- |
| `001` | TXT | `MATCH` | All seven fields agree. |
| `091` | TXT | `MISMATCH` | Only `container_count` differs (SI 3, BL 2). |
| `031` | TXT | `MISMATCH` | `container_count` and `gross_weight_kg` differ. |
| `059` | Text PDF | `MATCH` | All seven fields agree. |
| `005` | XLSX | `MATCH` | All seven fields agree. |
| `055` | XLSX / DOCX | `MATCH` | All seven fields agree. |
| `512` | Scanned PDF | `MATCH` | Check OCR spelling, party name spacing, and all seven values against the page images. |
| `513` | Scanned PDF | `MATCH` | All seven fields agree in the source page images. |
| `514` | Scanned PDF | `MATCH` | All seven fields agree in the source page images. |
| `511`, `515` | TXT / damaged PDF | `NEEDS_REVIEW` | The BL PDFs are truncated and cannot be read. |
| `518` | TXT | `MISMATCH` with review fields | The SI has `N/A` discharge port and `____MT` gross weight; these are unknown values. |

Run order: start with `001 091 031`, then `059 005 055`, then `512`. For each case, check the category, document types, seven raw values and evidence, normalized values, field comparison, and overall status. Record any wrong value or missing field with its source excerpt before changing a prompt or normalization rule. A `NEEDS_REVIEW` result is not a correct match or mismatch.

Offline baseline on the `data` branch, using `run_batch(..., service=None)` for these seven IDs: 1 `MATCH`, 2 `MISMATCH`, 4 `NEEDS_REVIEW`. This is the rule-only path, **not an AI accuracy measurement**. It correctly identifies the known `001` match and the overall `091`/`031` mismatches, but misses some field-level details: `091` marks three party fields for review, and `031` misses the container-count mismatch. The four non-TXT cases route to `unreadable` in this path. These results identify useful AI test cases, not defects in the optional AI path.

The existing Day 1 live smoke checks already covered `001`, `091`, `031`, `059`, `005`, `055`, and `512` individually. A Day 2 live batch through `app.evaluate_batch` checked `001` and `091` end to end: `001` returned `MATCH` with no mismatches or review fields; `091` returned `MISMATCH` with only `container_count` listed. During this check, Groq returned `400 Failed to generate JSON` and a short-lived `429` token-per-minute limit. The AI service now retries those responses in a bounded way, and the two-case batch passed after that change. This is still a smoke check, not full-dataset accuracy.

The next live batch checked `031` and `059`. `059` returned `MATCH`. The first `031` run correctly found the container-count and gross-weight differences but also reported a false `notify_party` mismatch: the model copied the consignee address into the BL notify-party value, even though the labeled notify-party line contained only the company name. The extractor now anchors notify-party values to their explicit labeled block when present. Both the single-pair and batch retests of `031` returned only the two expected mismatch fields; `059` remained `MATCH`.

The Office batch returned `005` as `MATCH`. Its first `055` run falsely reported five text fields as mismatches, while a single-pair retest, another batch, and three further case-processing runs all returned the expected `MATCH`. The source SI and BL agree, but the BL DOCX presents bilingual labels and values in a two-column table. The reader now preserves each table row as a labeled field. For DOCX/XLSX files, explicit field values override model guesses; a complete seven-field document with a recognized heading bypasses Groq extraction. In the supplied bundle, 7 of 30 Office attachments meet that complete deterministic condition; the other 23 retain their labeled values and use Groq for missing fields. `005` and `055` both compare as `MATCH` without any extraction API calls, and three consecutive live batch reruns returned `MATCH` for both. The scanned-PDF batch for `512` returned `MATCH`.

The original scanned pages for `513` and `514` were inspected directly; each SI/BL pair agrees on all seven fields. An early `513` run misread the loading port in one small cropped image, and concurrent OCR requests later hit Groq's token-per-minute limit. Small page-image crops are now enlarged before OCR, complete seven-field PDF transcripts bypass a second model extraction, and vision calls are serialized per AI service instance. A live two-case batch then returned `MATCH` for both `513` and `514`. This is a selected smoke check, not a guarantee for every scan or a full-dataset accuracy result.

The `511` and `515` BL files are intentionally damaged; live processing returned `NEEDS_REVIEW` with `unreadable` for both. A first live batch of `516`–`520` returned four `MISMATCH` cases and one transient `FAILED` (`518`). A direct `518` pair run succeeded, but exposed model values containing `To the Order of` and `Notify` labels and a placeholder weight treated as a definite mismatch. Extraction now removes those two labels from values while preserving source evidence, and marks obvious placeholders or nonnumeric quantity values as uncertain. A live `518` batch retest returned `MISMATCH` with `port_of_discharge` and `gross_weight_kg` listed for review. The one earlier `FAILED` has not been traced to a specific provider response and is not considered resolved by this retest.

Further five-case runs shifted the `FAILED` status among `517`, `519`, and `520`. A diagnostic run captured Groq HTTP 429 responses from the shared text model's 8,000-token-per-minute limit while SI and BL extraction calls overlapped. Text requests now serialize per AI service instance, including retries. One live five-case retest then completed without `FAILED`: all five returned `MISMATCH`, with unresolved placeholder fields listed for review. This shows the immediate token burst was reduced; it does not prove the provider limit can never recur in larger batches or across separate service instances.

For classification coverage, four hand-inspected emails were sent through `AIService.classify`: `002` -> `INVOICE_QUERY`, `007` -> `SI_REQUEST`, `011` -> `GENERAL`, and `015` -> `SPAM`, all with `uncertain=False`. Together with the BL-comparison cases above, this covers the five output categories in selected samples. It is not a measured macro-F1 score.
