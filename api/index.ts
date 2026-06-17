import express from "express";

const app = express();

app.use(express.json());

// API healthcheck endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "CalanguS" });
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
