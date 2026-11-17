import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createInitialSeedState } from './src/data/seedData.ts';
import {
  AiServiceError,
  runAiDispatchPlan,
  runAiFaultTriage,
  runAiMessBriefing,
  runAiVerifyRepair,
  runAiWardenBriefing,
} from './serverAi.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'hostelcare-db.json');

function ensureDbDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readDbState() {
  ensureDbDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialSeedState();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    const fallback = createInitialSeedState();
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function writeDbState(nextState: unknown) {
  ensureDbDir();
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(nextState, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '12mb' }));

  // Basic security headers for production readiness
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'HostelCare API',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/state', (_req, res) => {
    try {
      const state = readDbState();
      res.json(state);
    } catch (err) {
      console.error('Failed to read HostelCare DB:', err);
      res.status(500).json({ error: 'Unable to load persisted HostelCare state.' });
    }
  });

  app.put('/api/state', (req, res) => {
    try {
      const body = req.body;
      if (!body || !Array.isArray(body.complaints) || !Array.isArray(body.technicians)) {
        res.status(400).json({ error: 'Invalid HostelCare state payload.' });
        return;
      }
      writeDbState(body);
      res.json({ ok: true, savedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Failed to write HostelCare DB:', err);
      res.status(500).json({ error: 'Unable to persist HostelCare state.' });
    }
  });

  app.post('/api/reset', (_req, res) => {
    try {
      const fresh = createInitialSeedState();
      writeDbState(fresh);
      res.json(fresh);
    } catch (err) {
      console.error('Failed to reset HostelCare DB:', err);
      res.status(500).json({ error: 'Unable to reset HostelCare state.' });
    }
  });

  const handleAiError = (res: express.Response, err: unknown) => {
    if (err instanceof AiServiceError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unexpected AI service error.';
    console.error('AI endpoint error:', err);
    res.status(500).json({ error: message });
  };

  app.post('/api/ai/triage', async (req, res) => {
    try {
      const result = await runAiFaultTriage(req.body ?? {});
      res.json(result);
    } catch (err) {
      handleAiError(res, err);
    }
  });

  app.post('/api/ai/dispatch-plan', async (req, res) => {
    try {
      const result = await runAiDispatchPlan(req.body ?? {});
      res.json(result);
    } catch (err) {
      handleAiError(res, err);
    }
  });

  app.post('/api/ai/verify-repair', async (req, res) => {
    try {
      const result = await runAiVerifyRepair(req.body ?? {});
      res.json(result);
    } catch (err) {
      handleAiError(res, err);
    }
  });

  app.post('/api/ai/warden-briefing', async (req, res) => {
    try {
      const result = await runAiWardenBriefing(req.body ?? {});
      res.json(result);
    } catch (err) {
      handleAiError(res, err);
    }
  });

  app.post('/api/ai/mess-briefing', async (req, res) => {
    try {
      const result = await runAiMessBriefing(req.body ?? {});
      res.json(result);
    } catch (err) {
      handleAiError(res, err);
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { maxAge: '1d' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HostelCare server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
