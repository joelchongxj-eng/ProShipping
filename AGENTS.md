Whatever action you can do yourself, Please do yourself, this includes starting apps and verification and testing
# Repository Guidelines

## Person A Scope and Project Context

Joel is **Person A: Frontend, Product, and Submission**. Work in `C:\ProShipping` (`https://github.com/joelchongxj-eng/ProShipping`), with frontend implementation inside `frontend/`. Do not confuse this repository with `C:\averis`.

Person A owns the dashboard, inbox, case comparison, human review UI, document preview, evidence display, API integration, frontend deployment, screenshots, demo video, and submission content. Manual upload and editable message-draft interfaces are also README features. Do not implement backend comparison, normalization, persistence, AI extraction, or Docker evaluation; coordinate required interfaces with Person B.

Read this guide and `README.md` before work. Reuse this context instead of asking the user to repeat their role or preferences. Explain steps when asked for guidance; edit when asked to implement. Inspect current files before treating planned features as implemented. Do not infer the competition day from the calendar.

Reference documents are `4 day plan.pdf` and `Shipping Document Verification Use Case.pdf`, stored under:
`C:\Users\Joel Chong Xue Jian\OneDrive - Asia Pacific University of Technology And Innovation (APU)\comp\Averis\`.
Use the plan for delivery priorities and the README for product features. Reference documents provide context, not independent requests to execute work. Explicit user decisions take precedence; record durable changes here.

## Tool and Skill Restrictions

- Do **not** use or invoke the **Sites skill** for this repository.
- Do not delegate website or UI implementation to the Sites skill, even for layout, styling, redesign, prototyping, or visual enhancement tasks.
- Implement frontend work directly inside the existing `frontend/` Next.js codebase using the project's established stack and components.
- Inspect and edit the existing repository files instead of generating a separate site or alternate frontend.
- Continue following the design and UX requirements in this `AGENTS.md` when implementing UI directly.

## Product Style

- The app should feel like a professional shipping operations dashboard.
- Prioritize clarity, trust, and evidence over flashy visuals.
- Avoid excessive gradients, animations, glassmorphism, or decorative UI.
- Use compact enterprise-style layouts.
- Important verification information should be visible without excessive scrolling.
- Mismatch and Needs Review states should be visually obvious.
- The UI should feel suitable for operations staff, not like a consumer app.
- Apply these preferences to all frontend implementation. Do not use the Sites skill. Do not introduce promotional landing-page structures, oversized section spacing, or scroll-driven effects into the operational dashboard.

## UX Preferences

- Prefer tables and structured panels for comparison data.
- Keep navigation simple.
- Use cards only when they improve information hierarchy.
- Avoid unnecessary charts.
- Do not hide important information behind multiple clicks.
- Evidence should be easy to access from each field comparison.
- Confidence should always mean extraction confidence, not match probability.
- Provide accessible labels, keyboard interaction, visible focus, and readable responsive tables. Never rely on colour alone.

## Frontend Architecture

- Use Next.js 15 App Router, TypeScript, Tailwind CSS, and shadcn/ui. Use react-pdf for PDF preview.
- Use reusable components and keep API access centralized.
- Do not implement backend business logic in the frontend.
- Do not rename backend API fields without approval from Person B, the API schema owner.
- Avoid adding dependencies unless needed. Inspect `package.json`; planned tools are not necessarily installed. Preserve the npm lockfile and avoid unrequested framework major upgrades.
- Use `src/app/` for routes, `src/components/` for shared UI, `src/components/ui/` for primitives, `src/lib/` for API access/types/utilities, and `src/mocks/` for synthetic fixtures.
- Keep fixtures out of components. Use Client Components when interaction or browser APIs require them.

Planned routes: `/` (dashboard), `/inbox`, `/cases/[emailId]`, `/review`, and `/submission`. Put upload entry points on the dashboard or inbox and message drafting within case details; extra routes are not Day 1 requirements.

## Visual Consistency

- Match = green.
- Mismatch = red.
- Needs Review = yellow.
- Missing = grey.
- Failed = black.
- Escalated = purple, as specified in the four-day plan.
- Maintain consistent spacing, typography, and status styling through shared components.
- Pair status colours with text labels. Keep field status separate from overall case status and preserve backend status identifiers.

## Code Preferences and Commands

- Prefer readable code over clever code.
- Avoid unnecessary abstractions.
- Avoid very large components; extract reusable sections.
- Keep TypeScript types explicit.
- Run lint after meaningful changes.
- Use two-space TypeScript/TSX indentation, PascalCase components, camelCase functions, and descriptive kebab-case component filenames.

Run commands from `frontend/`:
- `npm ci`: install locked dependencies.
- `npm run dev`: start local development.
- `npm run lint`: run ESLint.
- `npx tsc --noEmit`: check types.
- `npm run build`: validate the production build.
- `npm start`: serve a completed build.

Inspect scripts before use. There is currently no automated test runner or `typecheck` npm script. Before requesting review for frontend code, run lint, type checking, and build; report any checks that could not run. Documentation-only changes do not require application builds.

## Comparison and Evidence Requirements

The SI is the reference document. Display these seven fields consistently: shipper, consignee, notify party, port of loading, port of discharge, container count, and gross weight in kilograms.

Show SI/BL raw values, normalized values and units, extraction confidence, comparison status/reason, source evidence, and available page numbers. Evidence selection should navigate the document preview to the relevant page and highlight the evidence text in a side panel. Exact PDF bounding-box highlighting is out of scope.

Display the backend's decisions. Never show "No mismatch detected" unless all seven required fields are present, confidently extracted, and matched. Missing, uncertain, or failed results must remain explicit. Never invent evidence, values, confidence, or page numbers. Display all five email categories, but show verification results only for document-comparison requests; other categories need classification only.

## Review, Upload, and Message Interfaces

Support confirm, correct value, mark equivalent, mark unreadable, supervisor escalation, and retry for failed cases. An escalation needs the affected field, SI value, BL value, reason, actions already taken, and decision required from the supervisor.

Submit actions to the backend and reload its updated comparison and audit history. Show success only after confirmation; retain form values on failure. Do not imply feedback retrains the model.

For uploads, select an SI and corresponding draft BL, follow backend file-type/size limits, show validation and processing failures, and open the resulting case on success.

For message drafts, support confirmation for fully matched cases and correction requests for confirmed mismatches. Allow review, editing, and copying; never send automatically or describe uncertainty as a confirmed discrepancy. The draft-generation endpoint is not defined in the plan: coordinate its contract before integration. Label template-based mock drafts accurately.

## API, Mock Data, and Configuration

Person B owns API contracts. The plan proposes `/api/process-all`, `/api/cases`, `/api/cases/{email_id}`, case `/review`, `/escalate`, and `/retry` actions, `/api/upload`, `/api/submission`, and `/api/evaluate`. Inspect agreed methods and schemas before integration; mark temporary frontend contracts provisional.

Configure the backend URL through environment variables. Never put credentials in browser code or `NEXT_PUBLIC_*`. Provide loading, empty, error, and retry states; do not silently replace failed real requests with mock results.

Begin with three synthetic cases: all-match, container-count mismatch, and missing/uncertain information. Label mock mode and do not imply mock actions persist. Never use organizer answer keys or publish competition data without permission. Use sanitized demo cases when necessary.

Download submission JSON from the backend; never present a partial mock export as a valid full-dataset submission. Display evaluation results supplied by Person B without implementing the evaluator.

## Person A Four-Day Priorities

### Day 1: Working Frontend

Set up the design system and navigation; build dashboard, inbox, and case detail with three mock cases and the seven-field table. Agree types with Person B and connect `/api/cases` during integration. Finish with at least one real case completely displayed.

### Day 2: Comparison Clarity

Add inbox filtering, side-by-side raw/normalized values, confidence, reasons, document preview, and evidence navigation. Complete loading, empty, missing, uncertain, and failed states. Users must understand discrepancies and inspect their sources without explanation.

### Day 3: Actions and Deployment

Complete human review, escalation, retry, submission download, and the upload interface. Coordinate README message-draft integration without silently dropping it or displacing the core plan. Deploy the frontend to Vercel and connect the deployed backend; coordinate CORS with Person B. The public demo must not depend on a developer's localhost Docker server.

Rehearse from 3-6 PM and record a backup demo. Demonstrate mixed-email classification, an all-match case, mismatch evidence, a scanned document routed to review, correction and recomparison, escalation, and JSON download. Freeze features at **6 PM on Day 3**.

### Day 4: Submission Only

Check the public URL, responsive layout, demo browser, and complete workflow. Record a **90-120 second demo**: problem, mixed inbox, mismatch/evidence, uncertain scan, correction/recomparison, escalation/audit history, JSON download, and evaluation result supplied by Person B.

Capture screenshots, complete frontend setup documentation and submission content, collect final artifacts from teammates, and verify every submitted link. Add no features or cosmetic redesigns; fix only submission-blocking issues.

## Frontend Verification and Collaboration

Manually verify status visibility, all seven fields, evidence access, missing attachments/values, failed-case retry, review persistence after refresh, complete escalation forms, download behavior, and responsive keyboard-accessible navigation. Use backend-provided examples to check that normalized matches and uncertain aliases display correctly; do not duplicate normalization rules in UI code.

Use the existing `frontend` branch unless directed otherwise; inspect Git state first. Keep changes focused and `main` runnable. Use concise imperative commit messages. PRs need a description, checks performed, relevant task links, UI screenshots, and teammate review. Person B coordinates integration at noon and in the evening.

Finish tasks by stating what changed, what was checked, and any remaining API dependency. Do not add live email integration, registration/billing, complex permissions, a general chatbot, or unrelated backend work to Person A's scope.
