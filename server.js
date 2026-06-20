const http = require("http");
const fs = require("fs");
const path = require("path");
const { generate } = require("./generator");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const EXERCISES_DIR = path.join(__dirname, "exercises");
const DATA_DIR = path.join(__dirname, "data");

// ---------------------------------------------------------------------------
// .env (manual — no dependencies)
// ---------------------------------------------------------------------------

(function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
})();

// ---------------------------------------------------------------------------
// MIME types
// ---------------------------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ---------------------------------------------------------------------------
// Static file helper
// ---------------------------------------------------------------------------

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const ct = MIME[ext] || "application/octet-stream";
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500);
      res.end(err.code === "ENOENT" ? "Not Found" : "Server Error");
      return;
    }
    res.writeHead(200, { "Content-Type": ct });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function json(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Exercise discovery
// ---------------------------------------------------------------------------

function readExerciseConfig(slug) {
  const cfgPath = path.join(EXERCISES_DIR, slug, "exercise.json");
  if (!fs.existsSync(cfgPath)) return null;
  return JSON.parse(fs.readFileSync(cfgPath, "utf8"));
}

function listExercises() {
  if (!fs.existsSync(EXERCISES_DIR)) return [];
  return fs
    .readdirSync(EXERCISES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => {
      const cfg = readExerciseConfig(d.name);
      return {
        slug: d.name,
        name: cfg?.name || d.name,
        description: cfg?.description || "",
        lessonId: cfg?.lessonId || null,
      };
    });
}

// ---------------------------------------------------------------------------
// Cumulative vocabulary builder
// ---------------------------------------------------------------------------

function buildVocab(lessonId) {
  const map = new Map();
  for (let id = 1; id <= lessonId; id++) {
    const fp = path.join(DATA_DIR, `lesson-${id}.json`);
    if (!fs.existsSync(fp)) continue;
    const data = JSON.parse(fs.readFileSync(fp, "utf8"));
    for (const w of data.vocab || []) {
      if (!map.has(w.korean)) map.set(w.korean, w);
    }
  }
  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// API: GET /api/exercises
// ---------------------------------------------------------------------------

function handleListExercises(res) {
  json(res, 200, listExercises());
}

// ---------------------------------------------------------------------------
// API: POST /api/generate/:slug
// ---------------------------------------------------------------------------

async function handleGenerate(res, slug, req) {
  // 1. Load exercise config
  const cfg = readExerciseConfig(slug);
  if (!cfg) return json(res, 404, { error: `Exercise "${slug}" not found` });

  if (!cfg.promptFile || !cfg.lessonId) {
    return json(res, 400, {
      error: "Exercise does not support LLM generation (no promptFile or lessonId)",
    });
  }

  // 2. Parse request body (count)
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return json(res, 400, { error: "Invalid JSON body" });
  }
  const count = Math.min(Math.max(Number(body.count) || 5, 1), 10);

  // 3. Load lesson data
  const lessonPath = path.join(DATA_DIR, `lesson-${cfg.lessonId}.json`);
  if (!fs.existsSync(lessonPath)) {
    return json(res, 404, { error: `Lesson ${cfg.lessonId} not found` });
  }
  const lesson = JSON.parse(fs.readFileSync(lessonPath, "utf8"));

  // 4. Pick grammar point
  const idx = cfg.grammarIndex ?? 0;
  const grammarPoint = lesson.grammar?.[idx];
  if (!grammarPoint) {
    return json(res, 400, { error: `Grammar index ${idx} not found in lesson ${cfg.lessonId}` });
  }

  // 5. Build cumulative vocabulary
  const vocab = buildVocab(cfg.lessonId);

  // 6. Read prompt template
  const promptPath = path.join(EXERCISES_DIR, slug, cfg.promptFile);
  if (!fs.existsSync(promptPath)) {
    return json(res, 404, { error: `Prompt file not found: ${cfg.promptFile}` });
  }
  const promptTemplate = fs.readFileSync(promptPath, "utf8");

  // 7. Generate via LLM
  try {
    const result = await generate({ promptTemplate, grammarPoint, vocab, count });
    json(res, 200, result);
  } catch (err) {
    console.error("Generate error:", err.message);
    const isLLMError = err.message === "LLM returned invalid JSON";
    const status = isLLMError ? 422 : 500;
    const body = isLLMError
      ? { error: "LLM returned invalid JSON", raw: err.rawContent }
      : { error: err.message };
    json(res, status, body);
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  // API
  if (p === "/api/exercises" && req.method === "GET") return handleListExercises(res);
  const genMatch = p.match(/^\/api\/generate\/([^/]+)$/);
  if (genMatch && req.method === "POST") return handleGenerate(res, genMatch[1], req);

  // Main page
  if (p === "/" || p === "") return serveStatic(res, path.join(PUBLIC_DIR, "index.html"));

  // Exercise pages: /exercises/:slug/ -> exercises/:slug/index.html
  const exMatch = p.match(/^\/exercises\/([^/]+)\/?$/);
  if (exMatch)
    return serveStatic(res, path.join(EXERCISES_DIR, exMatch[1], "index.html"));

  // Exercise assets: /exercises/:slug/file.ext
  const exAsset = p.match(/^\/exercises\/([^/]+)\/(.+)$/);
  if (exAsset) {
    return serveStatic(res, path.join(EXERCISES_DIR, exAsset[1], exAsset[2]));
  }

  // Public static files
  const safe = path.normalize(p).replace(/^\/+/, "");
  const fp = path.join(PUBLIC_DIR, safe);
  if (!fp.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  serveStatic(res, fp);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const server = http.createServer(route);
server.listen(PORT, () => {
  console.log(`\n  Korean LLM Exercise Playground`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? "✓ loaded" : "✗ not set"}`);
  const n = listExercises().length;
  console.log(`  Exercises: ${n}\n`);
});
