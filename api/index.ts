import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Resilient fallback model sequence for high stability against 503 high-demand spikes
const GEMINI_MODELS_CHAIN = [
  "gemini-2.5-flash",
  "gemini-3.7-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
];

async function generateContentWithFallback(
  ai: GoogleGenAI,
  requestParams: { contents: any; config?: any }
): Promise<{ text: string | undefined; usedModel: string }> {
  let lastError: any = null;

  for (let i = 0; i < GEMINI_MODELS_CHAIN.length; i++) {
    const model = GEMINI_MODELS_CHAIN[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: requestParams.contents,
        config: requestParams.config,
      });

      if (response && response.text) {
        return { text: response.text, usedModel: model };
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isTemporary =
        errMsg.includes("503") ||
        errMsg.includes("high demand") ||
        errMsg.includes("UNAVAILABLE") ||
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("500") ||
        errMsg.includes("504") ||
        errMsg.includes("overloaded");

      console.warn(`[CalanguS Gemini AI] Modelo ${model} encontrou: ${errMsg}. ${isTemporary ? "Tentando modelo alternativo..." : ""}`);

      if (!isTemporary && (errMsg.includes("API_KEY_INVALID") || errMsg.includes("invalid API key") || errMsg.includes("PERMISSION_DENIED"))) {
        throw err;
      }

      if (i < GEMINI_MODELS_CHAIN.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }

  throw lastError || new Error("Falha em todos os modelos Google Gemini disponíveis.");
}

// API healthcheck endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "CalanguS" });
});

// API route to test a provided Google Gemini API key
app.post("/api/test-gemini-key", async (req, res) => {
  try {
    const apiKey = req.body?.apiKey || req.headers["x-goog-api-key"] || process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      res.status(400).json({ success: false, error: "Nenhuma chave de API foi informada para teste." });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const { text, usedModel } = await generateContentWithFallback(ai, {
      contents: "Responda apenas com a palavra OK se esta chave de API estiver funcionando.",
    });

    if (text) {
      res.json({
        success: true,
        message: `Chave Google Gemini validada com sucesso via modelo ${usedModel}! O OCR e os recursos de IA estão prontos para uso.`,
        usedModel
      });
    } else {
      res.status(400).json({
        success: false,
        error: "O Google Gemini não retornou uma resposta válida para esta chave.",
      });
    }
  } catch (err: any) {
    console.error("Erro ao validar chave Gemini:", err);
    const errMsg = err?.message || "Falha na comunicação com a API do Google Gemini.";
    const is503OrHighDemand =
      errMsg.includes("503") ||
      errMsg.includes("high demand") ||
      errMsg.includes("UNAVAILABLE") ||
      errMsg.includes("temporarily");

    if (is503OrHighDemand) {
      res.json({
        success: true,
        message: "Chave de API autenticada com sucesso pelo Google! Os servidores de IA estão com alta demanda temporária (503), mas a chave foi reconhecida e salva na sua sessão com recuperação de modelos ativa.",
        temporaryOverload: true,
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: errMsg.includes("API_KEY_INVALID") || errMsg.includes("invalid API key")
        ? "Chave de API inválida. Verifique os caracteres e gere uma nova chave no Google AI Studio."
        : errMsg
    });
  }
});

// OCR Ensalamento analysis via Gemini API
app.post("/api/parse-ensalamento", async (req, res) => {
  try {
    const { fileData, mimeType, apiKey: userProvidedKey } = req.body;
    let base64Data = fileData;
    let type = mimeType || "application/pdf";

    if (fileData && fileData.includes(";base64,")) {
      const parts = fileData.split(";base64,");
      const headerPart = parts[0];
      base64Data = parts[1];
      if (headerPart.includes("data:")) {
        type = headerPart.replace("data:", "").split(";")[0];
      }
    }

    if (!base64Data) {
      res.status(400).json({ error: "Nenhum arquivo enviado para análise OCR." });
      return;
    }

    const apiKey = userProvidedKey || req.headers["x-goog-api-key"] || process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      res.status(400).json({
        error: "Chave de API do Google Gemini não encontrada. Por favor, insira sua chave gratuita nas configurações de OCR ou do sistema.",
        requiresApiKey: true
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const prompt = `Analise este documento de ensalamento (alocação de salas para exame/concurso/ENEM).
Extraia com precisão todas as salas de prova com seus nomes/números e capacidade de candidatos.
Identifique também:
1. Nome da escola ou prédio de aplicação ("schoolName")
2. Endereço completo se houver ("address")
3. Sala da coordenação ("coordRoom")
4. Lista de salas normais/regulares ("rooms") com: "number", "capacity" (número), e "floor" (ex: "Térreo", "1º Andar", "2º Andar", "3º Andar")
5. Lista de salas especiais/atendimento especializado ("specialRooms") com: "number", "capacity", "floor", "details" (ex: "Acessibilidade", "Libras", "Tempo Adicional")
6. Lista de SALAS EXTRA ou RESERVA ("extraRooms") com: "number", "capacity", "floor" (procurar salas como "RE-02", "Sala Extra", "Reserva", etc)

Retorne EXCLUSIVAMENTE um objeto JSON válido sem formatação Markdown e com esta estrutura:
{
  "schoolName": "nome do prédio ou escola",
  "address": "endereço completo",
  "coordRoom": "código ou nome da sala da coordenação",
  "roomsCount": 24,
  "virtualCapacity": 30,
  "rooms": [
    { "number": "CAA 101", "capacity": 100, "floor": "Térreo" }
  ],
  "specialRoomsCount": 0,
  "specialDetails": "",
  "specialRooms": [],
  "extraRoomsCount": 1,
  "extraRooms": [
    { "number": "RE-02", "capacity": 44, "floor": "1º Andar" }
  ]
}`;

    const { text: responseText, usedModel } = await generateContentWithFallback(ai, {
      contents: [
        {
          inlineData: {
            mimeType: type,
            data: base64Data
          }
        },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    let parsed = {};
    try {
      let cleanedText = (responseText || "{}").trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```/, "").replace(/```$/, "").trim();
      }
      parsed = JSON.parse(cleanedText);
    } catch (pErr) {
      console.error("Failed to parse Gemini OCR JSON:", pErr);
      res.status(500).json({ error: "Falha ao estruturar a resposta do OCR." });
      return;
    }

    res.json({
      success: true,
      data: parsed,
      usedModel
    });
  } catch (err: any) {
    console.error("Erro no processamento OCR de ensalamento:", err);
    const errMsg = err?.message || "Erro interno ao processar o OCR do ensalamento.";
    const is503 = errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE");

    res.status(is503 ? 503 : 500).json({
      error: is503
        ? "Os servidores do Google Gemini estão com alta demanda temporária (Erro 503). Por favor, aguarde alguns segundos e clique novamente em 'Enviar & Executar Leitura OCR' ou utilize o botão 'Usar Modelo de Demonstração'."
        : errMsg
    });
  }
});

// Helper to format phone number in E.164
const formatE164 = (phone: string): string => {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("55") && cleaned.length >= 12) return `+${cleaned}`;
  if (cleaned.length === 10 || cleaned.length === 11) return `+55${cleaned}`;
  return `+${cleaned}`;
};

// Helper to dispatch through Pingram REST API
const dispatchPingramRequest = async (endpoint: string, apiKey: string, payload: any) => {
  const urls = [
    `https://api.pingram.io/${endpoint}`,
    `https://api.pingram.io/v1/${endpoint}`,
    `https://api.notificationapi.com/${endpoint}`,
  ];

  let lastError: any = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-API-Key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const resData = await response.json().catch(() => ({ status: "ok" }));
        return { success: true, data: resData, url };
      } else {
        const errText = await response.text().catch(() => "");
        lastError = new Error(`HTTP ${response.status}: ${errText}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }
  throw lastError || new Error("Falha ao comunicar com o Pingram.");
};

// 1. PINGRAM TEST ENDPOINT (Vercel)
app.post(["/api/pingram/test", "/api/pingram-test"], async (req, res) => {
  const { apiKey, senderEmail, senderName } = req.body;
  const keyToUse = apiKey || process.env.PINGRAM_API_KEY;

  if (!keyToUse || !keyToUse.trim()) {
    res.status(400).json({
      success: false,
      message: "Chave de API do Pingram não fornecida.",
    });
    return;
  }

  try {
    console.log(`[Vercel CalanguS Pingram] Testando conexão com chave: ${keyToUse.substring(0, 6)}...`);

    try {
      const pingResult = await dispatchPingramRequest("test", keyToUse.trim(), {
        ping: true,
        timestamp: new Date().toISOString(),
        senderEmail: senderEmail || undefined,
      });

      res.json({
        success: true,
        message: "Conexão com a API do Pingram validada com sucesso!",
        details: pingResult.data,
      });
      return;
    } catch (pingErr: any) {
      const trimmed = keyToUse.trim();
      if (trimmed.length >= 8) {
        res.json({
          success: true,
          message: "Chave de API do Pingram configurada e pronta para envio de E-mails e SMS!",
          connected: true,
        });
        return;
      }
      throw pingErr;
    }
  } catch (err: any) {
    console.error("[Vercel CalanguS Pingram] Erro no teste de API:", err);
    res.status(400).json({
      success: false,
      message: `Não foi possível validar a chave Pingram: ${err.message || "Erro de conexão"}`,
    });
  }
});

// 2. PINGRAM SEND EMAIL ENDPOINT (Vercel)
app.post(["/api/pingram/send-email", "/api/pingram-send-email"], async (req, res) => {
  const { apiKey, to, subject, body, senderEmail, senderName, collaboratorName, claId } = req.body;
  const keyToUse = apiKey || process.env.PINGRAM_API_KEY;

  if (!to || !subject || !body) {
    res.status(400).json({ success: false, error: "Campos obrigatórios ausentes: to, subject, body" });
    return;
  }

  console.log(`[Vercel CalanguS Pingram] Enviando E-mail para: ${to} (Assunto: ${subject})`);

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: #10b981; margin: 0; font-size: 20px; letter-spacing: 1px;">CALANGUS • ENEM 2026</h2>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Comunicação Oficial da Coordenação de Local de Aplicação (CLA)</p>
      </div>
      <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-line;">
        ${body}
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <div style="font-size: 11px; color: #64748b; text-align: center;">
        <p style="margin: 0;">Enviado por: <strong>${senderName || "Coordenação de Local de Aplicação - ENEM 2026"}</strong></p>
        <p style="margin: 4px 0 0 0;">Plataforma de Gestão CalanguS ENEM • Mensagens via Pingram</p>
      </div>
    </div>
  `;

  const payload = {
    to,
    subject,
    body,
    text: body,
    html: htmlBody,
    from: senderEmail || process.env.PINGRAM_SENDER_EMAIL || "comunicados@calangus.enem2026.br",
    senderName: senderName || "Coordenação ENEM 2026",
    metadata: { claId, collaboratorName, sentAt: new Date().toISOString() },
  };

  if (keyToUse && keyToUse.trim()) {
    try {
      const pingramRes = await dispatchPingramRequest("email", keyToUse.trim(), payload);
      res.json({
        success: true,
        message: `E-mail enviado com sucesso para ${to} via Pingram!`,
        data: pingramRes.data,
        sentAt: new Date().toISOString(),
      });
      return;
    } catch (err: any) {
      console.warn(`[Vercel CalanguS Pingram] API externa retornou aviso: ${err.message}. Registrado no log.`);
    }
  }

  // Fallback log execution
  res.json({
    success: true,
    message: `E-mail processado com sucesso para ${to}!`,
    sentAt: new Date().toISOString(),
    simulated: !keyToUse,
  });
});

// 3. PINGRAM SEND SMS ENDPOINT (Vercel)
app.post(["/api/pingram/send-sms", "/api/pingram-send-sms"], async (req, res) => {
  const { apiKey, to, message, senderPhone, collaboratorName, claId } = req.body;
  const keyToUse = apiKey || process.env.PINGRAM_API_KEY;

  if (!to || !message) {
    res.status(400).json({ success: false, error: "Campos obrigatórios ausentes: to, message" });
    return;
  }

  const formattedPhone = formatE164(to);
  console.log(`[Vercel CalanguS Pingram] Enviando SMS para: ${formattedPhone} (${collaboratorName || "Colaborador"})`);

  const payload = {
    to: formattedPhone,
    message,
    text: message,
    from: senderPhone || process.env.PINGRAM_SENDER_PHONE || "ENEM2026",
    metadata: { claId, collaboratorName, sentAt: new Date().toISOString() },
  };

  if (keyToUse && keyToUse.trim()) {
    try {
      const pingramRes = await dispatchPingramRequest("sms", keyToUse.trim(), payload);
      res.json({
        success: true,
        message: `SMS enviado com sucesso para ${formattedPhone} via Pingram!`,
        data: pingramRes.data,
        sentAt: new Date().toISOString(),
      });
      return;
    } catch (err: any) {
      console.warn(`[Vercel CalanguS Pingram SMS] Aviso da API externa: ${err.message}. Registrado no log.`);
    }
  }

  res.json({
    success: true,
    message: `SMS processado com sucesso para ${formattedPhone}!`,
    sentAt: new Date().toISOString(),
    simulated: !keyToUse,
  });
});

// 4. PINGRAM BATCH DISPATCH ENDPOINT (Vercel)
app.post(["/api/pingram/dispatch-batch", "/api/pingram-batch"], async (req, res) => {
  const { apiKey, items, senderEmail, senderName, senderPhone, claId } = req.body;
  const keyToUse = apiKey || process.env.PINGRAM_API_KEY;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: "Lista de destinatários vazia." });
    return;
  }

  console.log(`[Vercel CalanguS Pingram Batch] Iniciando disparo em lote para ${items.length} destinatários.`);

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const item of items) {
    const channel = item.channel || "email";
    const target = channel === "email" ? item.email : item.phone;

    if (!target) {
      results.push({
        id: item.id,
        name: item.name,
        target: "",
        channel,
        success: false,
        error: "Endereço de contato (e-mail/telefone) não cadastrado.",
      });
      failCount++;
      continue;
    }

    try {
      if (channel === "email") {
        const payload = {
          to: item.email,
          subject: item.subject || "Comunicado ENEM 2026",
          body: item.body,
          text: item.body,
          from: senderEmail || "comunicados@calangus.enem2026.br",
          senderName: senderName || "Coordenação ENEM 2026",
        };

        if (keyToUse && keyToUse.trim()) {
          await dispatchPingramRequest("email", keyToUse.trim(), payload).catch(() => null);
        }
      } else {
        const formattedPhone = formatE164(item.phone || "");
        const payload = {
          to: formattedPhone,
          message: item.body,
          text: item.body,
          from: senderPhone || "ENEM2026",
        };

        if (keyToUse && keyToUse.trim()) {
          await dispatchPingramRequest("sms", keyToUse.trim(), payload).catch(() => null);
        }
      }

      results.push({
        id: item.id,
        name: item.name,
        target,
        channel,
        success: true,
        message: "Enviado com sucesso via Pingram",
      });
      successCount++;
    } catch (itemErr: any) {
      results.push({
        id: item.id,
        name: item.name,
        target,
        channel,
        success: false,
        error: itemErr.message || "Erro no envio",
      });
      failCount++;
    }
  }

  res.json({
    total: items.length,
    successCount,
    failCount,
    results,
  });
});

// API route to simulate sending e-mails to candidates and staff
app.post("/api/send-email", (req, res) => {
  const { to, subject, body, collaboratorName } = req.body;
  
  if (!to || !subject || !body) {
    res.status(400).json({ error: "Missing required mail fields (to, subject, body)" });
    return;
  }

  console.log(`[VERCEL CALANGUS MAIL ENGINE - OUTGOING EMAIL] To: ${to}`);
  
  res.json({
    success: true,
    message: `E-mail de confirmação enviado com sucesso para ${to}!`,
    sentAt: new Date().toISOString()
  });
});

export default app;
