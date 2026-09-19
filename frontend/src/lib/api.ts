import type { VerificationCase } from "@/types/verification";
import { getBackendUrl } from "./config";
import { isVerificationCase } from "./api-validation";

export class ApiError extends Error {
  constructor(message: string, public readonly kind: "configuration" | "unavailable" | "http" | "invalid", public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request(path: string): Promise<unknown> {
  let baseUrl: string;
  try { baseUrl = getBackendUrl(); } catch {
    throw new ApiError("Backend configuration is missing or invalid. Set NEXT_PUBLIC_BACKEND_URL.", "configuration");
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  } catch {
    throw new ApiError("Backend unavailable. Check that the backend is running and try again.", "unavailable");
  }
  if (!response.ok) throw new ApiError(response.status === 404 ? "Case not found." : `Backend request failed (HTTP ${response.status}).`, "http", response.status);
  try { return await response.json(); } catch {
    throw new ApiError("The backend returned invalid JSON.", "invalid");
  }
}

export async function getHealth(): Promise<{ status: string; service: string }> {
  const data = await request("/health");
  if (typeof data !== "object" || data === null || !("status" in data) || !("service" in data) || typeof data.status !== "string" || typeof data.service !== "string") {
    throw new ApiError("The backend returned an invalid health response.", "invalid");
  }
  return { status: data.status, service: data.service };
}

export async function getCases(): Promise<VerificationCase[]> {
  const data = await request("/api/cases");
  if (!Array.isArray(data) || !data.every(isVerificationCase)) throw new ApiError("The backend returned an invalid case list.", "invalid");
  return data;
}

export async function getCase(emailId: string): Promise<VerificationCase> {
  const data = await request(`/api/cases/${encodeURIComponent(emailId)}`);
  if (!isVerificationCase(data) || data.email.email_id !== emailId) throw new ApiError("The backend returned an invalid case response.", "invalid");
  return data;
}
