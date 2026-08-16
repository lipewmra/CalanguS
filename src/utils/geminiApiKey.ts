// Utility to manage user session Gemini API Key

const STORAGE_KEY = "calangus_gemini_api_key";
const SESSION_KEY = "calangus_gemini_api_key_session";

export function getGeminiApiKey(): string {
  try {
    const sessionKey = sessionStorage.getItem(SESSION_KEY);
    if (sessionKey && sessionKey.trim().length > 0) {
      return sessionKey.trim();
    }
    const localKey = localStorage.getItem(STORAGE_KEY);
    if (localKey && localKey.trim().length > 0) {
      return localKey.trim();
    }
  } catch (err) {
    console.warn("Storage access error:", err);
  }
  return "";
}

export function saveGeminiApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
      sessionStorage.setItem(SESSION_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }
    window.dispatchEvent(new CustomEvent("calangus_api_key_changed", { detail: { apiKey: trimmed } }));
  } catch (err) {
    console.warn("Storage save error:", err);
  }
}

export function clearGeminiApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent("calangus_api_key_changed", { detail: { apiKey: "" } }));
  } catch (err) {
    console.warn("Storage remove error:", err);
  }
}

export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0;
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 10) return "••••••••••";
  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`;
}

export async function testGeminiApiKey(keyToTest: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/test-gemini-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey: keyToTest.trim() }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error || data.message || "Falha ao validar a chave da API com o Google Gemini.",
      };
    }

    return {
      success: true,
      message: data.message || "Chave Google Gemini validada com sucesso!",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Erro de conexão ao testar a chave de API.",
    };
  }
}
