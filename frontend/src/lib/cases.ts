import { getCase, getCases, ApiError } from "./api";
import { isMockMode } from "./config";
import type { VerificationCase } from "@/types/verification";

export async function loadCases(): Promise<VerificationCase[]> {
  if (!isMockMode) return getCases();
  const { mock_verification_cases } = await import("@/data/mock-verification-cases");
  return mock_verification_cases;
}

export async function loadCase(emailId: string): Promise<VerificationCase> {
  if (!isMockMode) return getCase(emailId);
  const item = (await loadCases()).find((candidate) => candidate.email.email_id === emailId);
  if (!item) throw new ApiError("Case not found.", "http", 404);
  return item;
}
