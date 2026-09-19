// Mock mode is explicit in the UI and can never be entered after an API failure.
export const isMockMode = process.env.NEXT_PUBLIC_DATA_MODE === "mock";

export function getBackendUrl(): string {
  const value = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!value) throw new Error("Set NEXT_PUBLIC_BACKEND_URL in frontend/.env.local.");
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Backend URL must use HTTP or HTTPS.");
  return value.replace(/\/+$/, "");
}
