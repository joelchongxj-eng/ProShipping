# Real Retry Execution Implementation Plan

> **For agentic workers:** Execute inline with test-driven development. Do not commit or push.

**Goal:** Execute Human Review RETRY actions through the existing automation pipeline while preserving every original automated result and submission entry.

**Architecture:** Add an in-memory append-only retry store and an async retry executor beside the existing Human Review store. The review router first appends the unchanged RETRY review record, then invokes the executor; retry results are immutable snapshots available only through new history endpoints.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, pytest, existing CaseProcessor and document-pair pipeline.

**Spec:** User-approved design in the current task.

## Global Constraints

- Never write retry results back to `main.cases`, upload sessions, Human Review summaries, or submission data.
- Reuse the existing document reading, AI fallback, extraction, normalization, comparison, and canonical result hashing.
- Keep execution status independent from automated case status.
- Preserve append-only review and retry history semantics.
- Do not modify frontend files, commit, or push.

---

### Task 1: Retry models and append-only store

**Files:**
- Create: `backend/app/reviews/retry.py`
- Test: `backend/tests/test_retry_execution.py`

**Interfaces:**
- Produces `RetryExecutionStatus`, `RetryAttempt`, `RetryAttemptHistory`, and `RetryExecutionStore`.
- Store operations create an attempt with a per-target attempt number and replace only the stored execution-state snapshot for that retry ID; prior returned Pydantic values remain immutable copies.

- [ ] Write tests for initial attempt numbering, ordered history, immutable returned copies, and status transitions.
- [ ] Run the focused tests and verify they fail because the retry module is absent.
- [ ] Implement the minimum models and locked in-memory store.
- [ ] Run the focused tests and verify they pass.

### Task 2: Shared canonical hashing and retry executor

**Files:**
- Create: `backend/app/reviews/hashing.py`
- Create: `backend/app/reviews/retry_service.py`
- Modify: `backend/app/reviews/service.py`
- Test: `backend/tests/test_retry_execution.py`

**Interfaces:**
- `automated_result_hash(result: BaseModel) -> str` preserves the existing canonical JSON SHA-256 algorithm.
- `RetryExecutionService.execute(review: HumanReviewRecord) -> RetryAttempt` reruns either `CaseProcessor.process_email()` or `compare_document_pair_with_ai_fallback()` and stores a separate immutable snapshot.

- [ ] Write failing tests proving competition retry success, original result immutability, hash compatibility, incremental attempts, AI-disabled scan failure, mocked-AI success, upload success, and expired-upload failure.
- [ ] Run the focused tests and verify expected failures.
- [ ] Extract the canonical hash without changing its output.
- [ ] Implement the executor using existing production pipeline functions.
- [ ] Run the focused tests and verify they pass.

### Task 3: Router integration and read APIs

**Files:**
- Modify: `backend/app/reviews/router.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/services/upload_store.py`
- Test: `backend/tests/test_retry_execution.py`
- Test: `backend/tests/test_human_review.py`

**Interfaces:**
- RETRY POST appends its HumanReviewRecord before awaiting execution.
- `GET /api/cases/{email_id}/retry-attempts` and `GET /api/upload-comparisons/{comparison_id}/retry-attempts` return ordered history.
- Upload retry validation may use an immutable original response snapshot after bytes expire; other expired-upload review actions remain 404.

- [ ] Write failing endpoint tests for the review record, retry record, history endpoints, expired uploads, invalid MATCH retry, and unchanged submission.
- [ ] Run the focused tests and verify expected failures.
- [ ] Wire the executor into RETRY only and add the two GET endpoints.
- [ ] Run Human Review and retry tests and verify they pass.

### Task 4: Full regression verification

**Files:** No additional source changes.

- [ ] Run `python -m pytest` and confirm zero failures.
- [ ] With `AI_ENABLED=0`, process 520 emails and confirm `390 MATCH`, `51 MISMATCH`, `79 NEEDS_REVIEW`.
- [ ] Generate and officially evaluate the unchanged submission; confirm final score `92.37%` and the established canonical submission hash.
- [ ] Run `git diff --check` and `git status`.

