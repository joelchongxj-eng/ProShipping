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

Run order: start with `001 091 031`, then `059 005 055`, then `512`. For each case, check the category, document types, seven raw values and evidence, normalized values, field comparison, and overall status. Record any wrong value or missing field with its source excerpt before changing a prompt or normalization rule. A `NEEDS_REVIEW` result is not a correct match or mismatch.

Offline baseline on the `data` branch, using `run_batch(..., service=None)` for these seven IDs: 1 `MATCH`, 2 `MISMATCH`, 4 `NEEDS_REVIEW`. This is the rule-only path, **not an AI accuracy measurement**. It correctly identifies the known `001` match and the overall `091`/`031` mismatches, but misses some field-level details: `091` marks three party fields for review, and `031` misses the container-count mismatch. The four non-TXT cases route to `unreadable` in this path. These results identify useful AI test cases, not defects in the optional AI path.

The existing Day 1 live smoke checks already covered `001`, `091`, `031`, `059`, `005`, `055`, and `512` individually. A Day 2 live batch through `app.evaluate_batch` checked `001` and `091` end to end: `001` returned `MATCH` with no mismatches or review fields; `091` returned `MISMATCH` with only `container_count` listed. During this check, Groq returned `400 Failed to generate JSON` and a short-lived `429` token-per-minute limit. The AI service now retries those responses in a bounded way, and the two-case batch passed after that change. This is still a smoke check, not full-dataset accuracy.
