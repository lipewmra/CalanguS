import { PingramConfig } from "../types";

const PINGRAM_STORAGE_PREFIX = "calangus_pingram_config_";

export function getPingramConfigKey(claId?: string): string {
  return `${PINGRAM_STORAGE_PREFIX}${claId || "default"}`;
}

export function getPingramConfig(claId?: string): PingramConfig {
  try {
    const key = getPingramConfigKey(claId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    // Check fallback default
    const def = localStorage.getItem(`${PINGRAM_STORAGE_PREFIX}default`);
    if (def) {
      return JSON.parse(def);
    }
  } catch (e) {
    console.error("Error reading pingram config from storage:", e);
  }

  return {
    apiKey: "",
    senderEmail: "",
    senderName: "Coordenação ENEM 2026",
    senderPhone: "",
    enabled: true,
  };
}

export function savePingramConfig(config: PingramConfig, claId?: string): void {
  try {
    const key = getPingramConfigKey(claId);
    const sanitized: PingramConfig = {
      ...config,
      apiKey: config.apiKey?.trim() || "",
      senderEmail: config.senderEmail?.trim() || "",
      senderName: config.senderName?.trim() || "Coordenação ENEM 2026",
      senderPhone: config.senderPhone?.trim() || "",
    };
    localStorage.setItem(key, JSON.stringify(sanitized));
    
    // Also save default if not specified
    if (!claId || claId === "default") {
      localStorage.setItem(`${PINGRAM_STORAGE_PREFIX}default`, JSON.stringify(sanitized));
    }

    // Trigger cross-component reactive update
    window.dispatchEvent(
      new CustomEvent("calangus_pingram_config_changed", {
        detail: { claId, config: sanitized },
      })
    );
  } catch (e) {
    console.error("Error saving pingram config to storage:", e);
  }
}

export function clearPingramConfig(claId?: string): void {
  try {
    const key = getPingramConfigKey(claId);
    localStorage.removeItem(key);
    window.dispatchEvent(
      new CustomEvent("calangus_pingram_config_changed", {
        detail: { claId, config: null },
      })
    );
  } catch (e) {
    console.error("Error clearing pingram config:", e);
  }
}

export function hasPingramConfig(claId?: string): boolean {
  const cfg = getPingramConfig(claId);
  return Boolean(cfg && cfg.apiKey && cfg.apiKey.trim().length > 0);
}

export function maskPingramApiKey(key: string): string {
  if (!key) return "Não configurada";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "••••••••";
  const start = trimmed.substring(0, 4);
  const end = trimmed.substring(trimmed.length - 4);
  return `${start}••••••••${end}`;
}

export const maskApiKey = maskPingramApiKey;

export function formatBrazilianPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function normalizePhoneNumberE164(phone: string): string {
  if (!phone) return "";
  // Keep only digits and leading +
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // Brazilian standard cleaning
  if (cleaned.startsWith("55") && cleaned.length >= 12) {
    return `+${cleaned}`;
  }

  // If local DDD (e.g. 61987654321, 11 digits or 10 digits)
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `+55${cleaned}`;
  }

  return `+${cleaned}`;
}

// Test Pingram Connection API
export async function testPingramApiConnection(
  config: PingramConfig
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const res = await fetch("/api/pingram/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: config.apiKey,
        senderEmail: config.senderEmail,
        senderName: config.senderName,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: `Erro na requisição local/servidor: ${err?.message || "Sem resposta"}`,
    };
  }
}

// Send Single Email via Pingram
export async function sendEmailViaPingram(
  paramsOrConfig:
    | {
        apiKey?: string;
        to: string;
        subject: string;
        body: string;
        senderEmail?: string;
        senderName?: string;
        collaboratorName?: string;
        claId?: string;
      }
    | PingramConfig,
  toParam?: string,
  subjectParam?: string,
  bodyParam?: string,
  collaboratorNameParam?: string
): Promise<{ success: boolean; message: string; error?: string; details?: any }> {
  try {
    let key = "";
    let to = "";
    let subject = "";
    let body = "";
    let senderEmail = "";
    let senderName = "Coordenação ENEM 2026";
    let collaboratorName = "";
    let claId = "";

    if (toParam !== undefined) {
      // Positional signature: (config, to, subject, body, collaboratorName)
      const config = paramsOrConfig as PingramConfig;
      key = config.apiKey;
      to = toParam;
      subject = subjectParam || "Comunicado ENEM";
      body = bodyParam || "";
      senderEmail = config.senderEmail;
      senderName = config.senderName || "Coordenação ENEM 2026";
      collaboratorName = collaboratorNameParam || "";
    } else {
      // Object signature
      const params = paramsOrConfig as {
        apiKey?: string;
        to: string;
        subject: string;
        body: string;
        senderEmail?: string;
        senderName?: string;
        collaboratorName?: string;
        claId?: string;
      };
      const config = getPingramConfig(params.claId);
      key = params.apiKey || config.apiKey;
      to = params.to;
      subject = params.subject;
      body = params.body;
      senderEmail = params.senderEmail || config.senderEmail;
      senderName = params.senderName || config.senderName || "Coordenação ENEM 2026";
      collaboratorName = params.collaboratorName || "";
      claId = params.claId || "";
    }

    const res = await fetch("/api/pingram/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: key,
        to,
        subject,
        body,
        senderEmail,
        senderName,
        collaboratorName,
        claId,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: "Falha ao disparar e-mail via Pingram",
      error: err?.message || "Erro de rede ao conectar à API",
    };
  }
}

// Send Single SMS via Pingram
export async function sendSmsViaPingram(
  paramsOrConfig:
    | {
        apiKey?: string;
        to: string;
        message: string;
        senderPhone?: string;
        collaboratorName?: string;
        claId?: string;
      }
    | PingramConfig,
  toParam?: string,
  messageParam?: string,
  collaboratorNameParam?: string
): Promise<{ success: boolean; message: string; error?: string; details?: any }> {
  try {
    let key = "";
    let to = "";
    let message = "";
    let senderPhone = "";
    let collaboratorName = "";
    let claId = "";

    if (toParam !== undefined) {
      // Positional signature: (config, to, message, collaboratorName)
      const config = paramsOrConfig as PingramConfig;
      key = config.apiKey;
      to = toParam;
      message = messageParam || "";
      senderPhone = config.senderPhone;
      collaboratorName = collaboratorNameParam || "";
    } else {
      // Object signature
      const params = paramsOrConfig as {
        apiKey?: string;
        to: string;
        message: string;
        senderPhone?: string;
        collaboratorName?: string;
        claId?: string;
      };
      const config = getPingramConfig(params.claId);
      key = params.apiKey || config.apiKey;
      to = params.to;
      message = params.message;
      senderPhone = params.senderPhone || config.senderPhone;
      collaboratorName = params.collaboratorName || "";
      claId = params.claId || "";
    }

    const res = await fetch("/api/pingram/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: key,
        to,
        message,
        senderPhone,
        collaboratorName,
        claId,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: "Falha ao disparar SMS via Pingram",
      error: err?.message || "Erro de rede ao conectar à API",
    };
  }
}

// Batch Dispatch via Pingram
export interface PingramBatchItem {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  body: string;
  channel: "email" | "sms";
}

export interface PingramBatchResult {
  total: number;
  successCount: number;
  failCount: number;
  results: Array<{
    id: string;
    name: string;
    target: string;
    channel: "email" | "sms";
    success: boolean;
    error?: string;
    message?: string;
  }>;
}

export async function sendBatchViaPingram(
  paramsOrConfig:
    | {
        apiKey?: string;
        items: PingramBatchItem[];
        senderEmail?: string;
        senderName?: string;
        senderPhone?: string;
        claId?: string;
      }
    | PingramConfig,
  itemsParam?: PingramBatchItem[]
): Promise<PingramBatchResult> {
  try {
    let key = "";
    let items: PingramBatchItem[] = [];
    let senderEmail = "";
    let senderName = "";
    let senderPhone = "";
    let claId = "";

    if (itemsParam !== undefined) {
      // Positional signature: (config, items)
      const config = paramsOrConfig as PingramConfig;
      key = config.apiKey;
      items = itemsParam;
      senderEmail = config.senderEmail;
      senderName = config.senderName;
      senderPhone = config.senderPhone;
    } else {
      // Object signature
      const params = paramsOrConfig as {
        apiKey?: string;
        items: PingramBatchItem[];
        senderEmail?: string;
        senderName?: string;
        senderPhone?: string;
        claId?: string;
      };
      const config = getPingramConfig(params.claId);
      key = params.apiKey || config.apiKey;
      items = params.items;
      senderEmail = params.senderEmail || config.senderEmail;
      senderName = params.senderName || config.senderName;
      senderPhone = params.senderPhone || config.senderPhone;
      claId = params.claId || "";
    }

    const res = await fetch("/api/pingram/dispatch-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: key,
        items,
        senderEmail,
        senderName,
        senderPhone,
        claId,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    const rawItems = itemsParam || (paramsOrConfig as any)?.items || [];
    return {
      total: rawItems.length,
      successCount: 0,
      failCount: rawItems.length,
      results: rawItems.map((it: any) => ({
        id: it.id,
        name: it.name,
        target: it.channel === "email" ? it.email || "" : it.phone || "",
        channel: it.channel,
        success: false,
        error: err?.message || "Erro ao conectar com o serviço Pingram",
      })),
    };
  }
}

export const dispatchPingramBatch = sendBatchViaPingram;
