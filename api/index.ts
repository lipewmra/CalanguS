import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

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

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: "Responda apenas com a palavra OK se esta chave de API estiver funcionando.",
    });

    if (response && response.text) {
      res.json({
        success: true,
        message: "Chave Google Gemini validada com sucesso! O OCR e os recursos de IA estão prontos para uso.",
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

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
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
      parsed = JSON.parse(response.text || "{}");
    } catch (pErr) {
      console.error("Failed to parse Gemini OCR JSON:", pErr);
      res.status(500).json({ error: "Falha ao estruturar a resposta do OCR." });
      return;
    }

    res.json({
      success: true,
      data: parsed
    });
  } catch (err: any) {
    console.error("Erro no processamento OCR de ensalamento:", err);
    res.status(500).json({ error: err.message || "Erro interno ao processar o OCR do ensalamento." });
  }
});

// API route to simulate sending e-mails to candidates and staff
app.post("/api/send-email", (req, res) => {
  const { to, subject, body, collaboratorName } = req.body;
  
  if (!to || !subject || !body) {
    res.status(400).json({ error: "Missing required mail fields (to, subject, body)" });
    return;
  }

  console.log(`=============================================`);
  console.log(`[VERCEL CALANGUS MAIL ENGINE - OUTGOING EMAIL]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Recipient Name: ${collaboratorName || "N/A"}`);
  console.log(`---------------------------------------------`);
  console.log(body);
  console.log(`=============================================`);
  
  res.json({
    success: true,
    message: `E-mail de confirmação enviado com sucesso para ${to}!`,
    sentAt: new Date().toISOString()
  });
});

export default app;
