// Demo-only display metadata, deliberately outside the backend response schema.
export const mock_case_metadata: Record<string, { display_id: string }> = Object.fromEntries(
  Array.from({ length: 14 }, (_, index) => {
    const number = String(index + 1).padStart(3, "0");
    return [`email_demo_${number}`, { display_id: `PS-DEMO-${number}` }];
  }),
);
