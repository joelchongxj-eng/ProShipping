# Day 1 baseline

Date: 2026-09-19

The backend processed all 520 competition emails and produced a schema-valid submission with all 520 email IDs.

| Metric | Result |
| --- | ---: |
| Stage 1 accuracy | 0.8365 |
| Stage 1 macro F1 | 0.7458 |
| Stage 3 defect F1 | 0.6269 |
| End-to-end rate | 0.1957 |
| Final score | 0.4469 |

This is the deterministic Day 1 baseline. The next accuracy work is document-type detection, non-TXT extraction, missing-value handling, alias rules, and AI-assisted classification/extraction.

## AI smoke checks

On 2026-09-19, the team ran the optional Gemini 3.8 Flash TXT extraction on three real SI/BL pairs and checked the results against the source documents:

| Pair | Hand-checked expectation | AI result |
| --- | --- | --- |
| `email_001` | All seven fields match | `MATCH`; all seven fields match |
| `email_091` | Container count differs: SI 3, BL 2 | `MISMATCH`; only `container_count` differs |
| `email_031` | Container count differs: SI 1, BL 3; gross weight differs: SI 21,114 KG, BL 23,114 KG | `MISMATCH`; both fields differ |

These are three selected TXT examples, not an accuracy estimate for the 520-email dataset. PDF, DOCX, XLSX, and scanned attachments were not tested through this AI path.

