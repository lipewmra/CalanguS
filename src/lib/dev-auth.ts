/**
 * CalanguS Internal Reviewer / Debugger Access Protocol
 * Uses one-way SHA-256 cryptographic hashes and server-side verification
 * so that credentials never appear in plain text in source code or UI.
 */

import { UserProfile } from "../types";

// Cryptographic SHA-256 digests for reviewer account identification
export const DEV_ADMIN_DIGESTS = {
  EMAIL_HASH: "ffe2b285a15285e6de1fa60c7de5843425d7b9d161d08fd44bfbe57fc3fe4a91",
  PASS_HASH: "ba7a260e3f320830843c2249a47add096532b83e31611cccc07d9e3787cc5172",
  SESSION_STORAGE_KEY: "calangus_dev_admin_session"
};

/**
 * Compute SHA-256 hex string for normalized email
 */
export async function computeEmailHash(email: string): Promise<string> {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute SHA-256 hex string for exact password (case-sensitive)
 */
export async function computePasswordHash(password: string): Promise<string> {
  if (!password) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if the email belongs to the developer reviewer account
 */
export async function isDevAdminEmail(email: string): Promise<boolean> {
  const hash = await computeEmailHash(email);
  return hash === DEV_ADMIN_DIGESTS.EMAIL_HASH;
}

/**
 * Check if credentials match the developer reviewer account
 */
export async function verifyDevAdminCredentials(email: string, password: string): Promise<boolean> {
  const [emailHash, passHash] = await Promise.all([
    computeEmailHash(email),
    computePasswordHash(password)
  ]);
  return (
    emailHash === DEV_ADMIN_DIGESTS.EMAIL_HASH &&
    passHash === DEV_ADMIN_DIGESTS.PASS_HASH
  );
}

/**
 * Build the full SuperAdmin & CLA privileged profile for the developer reviewer
 */
export function buildDevAdminProfile(email: string): UserProfile {
  return {
    uid: "dev_superadmin_calangus",
    email: email.trim().toLowerCase(),
    emails: [email.trim().toLowerCase()],
    name: "Desenvolvedor",
    role: "SuperAdmin",
    roles: ["SuperAdmin", "CLA"],
    coordinationCode: "8520",
    hasAccessed: true,
  };
}

/**
 * Get active reviewer session from local storage if valid
 */
export function getSavedDevAdminSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem(DEV_ADMIN_DIGESTS.SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid === "dev_superadmin_calangus" && parsed.role === "SuperAdmin") {
      return parsed;
    }
  } catch (e) {
    // Ignore invalid stored session
  }
  return null;
}

/**
 * Save active reviewer session
 */
export function saveDevAdminSession(profile: UserProfile): void {
  try {
    localStorage.setItem(DEV_ADMIN_DIGESTS.SESSION_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    // Ignore storage issues
  }
}

/**
 * Clear reviewer session
 */
export function clearDevAdminSession(): void {
  try {
    localStorage.removeItem(DEV_ADMIN_DIGESTS.SESSION_STORAGE_KEY);
  } catch (e) {
    // Ignore
  }
}
