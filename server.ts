/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer as createViteServer } from "vite";
import path from "path";
import { v4 as uuidv4 } from "uuid";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // Webhook normalization layer
  app.post("/api/webhook/:channel", async (req, res) => {
    const { channel } = req.params;
    const body = req.body;
    
    // Normalize message format
    const normalizedMessage = {
      id: uuidv4(),
      channel,
      userId: body.user_id || body.from || "unknown",
      content: body.message || body.text || "",
      type: body.type || "text",
      timestamp: new Date().toISOString(),
      businessId: body.business_id || "default", // Multi-tenant logic
    };

    console.log(`Received ${channel} message:`, normalizedMessage);

    // TODO: Deduplication
    // TODO: Store raw message
    // TODO: Push to queue (Redis/Celery or simple async)
    // TODO: AI processing

    res.json({ status: "received", id: normalizedMessage.id });
  });

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
