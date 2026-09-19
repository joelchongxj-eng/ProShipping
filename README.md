# ProShipping
# Features
Planned Features
1. Dashboard
View document verification cases and their current status:
- Matched: All required fields were checked and agree.
- Mismatch: One or more differences were identified.
- Needs Review: Missing or uncertain information requires human verification.
- Failed: Processing could not be completed and may require a retry.
Users can open each case to inspect its results and supporting evidence.
2. SI and BL Comparison
Compare the documents side by side across seven fields:
- Shipper
- Consignee
- Notify party
- Port of loading
- Port of discharge
- Container count
- Gross weight in kilograms
Highlight mismatched values in the comparison table and show supporting source text to help users verify each discrepancy.
3. Confidence and Evidence
Display extraction confidence for individual fields alongside the source evidence.
This helps users identify values that need closer inspection. Confidence indicates certainty in reading a value, rather than whether the SI and BL match.
4. AI-Generated Message Drafts
Generate message drafts based on verification results:
- A confirmation message when all required fields match.
- A correction request describing confirmed differences between the SI and draft BL.
Users can review, edit, and copy the draft before sending it to the appropriate contact. Messages are not sent automatically.
5. Human Review and Feedback
Allow users to review uncertain results, correct extracted values, and confirm when differently written values mean the same thing.
Save corrections and approved equivalences to support future checks, then rerun the comparison to update the result. This feedback does not automatically retrain the AI model.
6. Manual Document Upload
Allow users to upload an SI and a draft BL for verification.
After processing, display the comparison result, mismatched fields, confidence information, and any issues requiring review.
User Workflow
1. Upload an SI and its corresponding draft BL.
2. View the verification status on the dashboard.
3. Open the case to inspect field comparisons and evidence.
4. Review uncertain values or confirm discrepancies.
5. Generate and edit a message draft if follow-up is needed.
