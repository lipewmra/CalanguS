import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add standard parsers
  app.use(express.json());

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "CalanguS" });
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
