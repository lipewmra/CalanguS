import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add standard parsers with higher body size limit for PDF uploads
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "CalanguS" });
  });

  // OCR Ensalamento analysis via Gemini API
  app.post("/api/parse-ensalamento", async (req, res) => {
    try {
      const { fileData, mimeType } = req.body;
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

      // If no file data provided, fall back to reading local Model/Ensalamento.pdf
      if (!base64Data) {
        const pdfPath = path.join(process.cwd(), "Model", "Ensalamento.pdf");
        if (fs.existsSync(pdfPath)) {
          base64Data = fs.readFileSync(pdfPath).toString("base64");
          type = "application/pdf";
        } else {
          res.status(400).json({ error: "Nenhum arquivo enviado e modelo padrão não localizado." });
          return;
        }
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "Chave GEMINI_API_KEY não configurada no servidor." });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
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
        model: "gemini-3.6-flash",
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
    
    // Validate inputs
    if (!to || !subject || !body) {
      res.status(400).json({ error: "Missing required mail fields (to, subject, body)" });
      return;
    }

    console.log(`=============================================`);
    console.log(`[CALANGUS MAIL ENGINE - OUTGOING EMAIL]`);
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

  // Serve static files and route SPA correctly
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CalanguS backend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start CalanguS backend server:", err);
});
