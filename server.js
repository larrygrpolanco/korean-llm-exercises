const http = require("http");
const fs = require("fs");
const path = require("path");
const { generateExercises } = require("./generator");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");

// ---------------------------------------------------------------------------
// .env parser  (no dotenv dependency — manual line-by-line parse)
// ---------------------------------------------------------------------------

function loadEnv(filePath) {
	if (!fs.existsSync(filePath)) return;
	const lines = fs.readFileSync(filePath, "utf8").split("\n");
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		const value = trimmed.slice(eq + 1).trim();
		// Strip surrounding quotes if present
		const clean =
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
				? value.slice(1, -1)
				: value;
		if (!process.env[key]) process.env[key] = clean;
	}
}

loadEnv(path.join(__dirname, ".env"));

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
// Static file serving
// ---------------------------------------------------------------------------

function serveStatic(res, filePath) {
	const ext = path.extname(filePath).toLowerCase();
	const contentType = MIME[ext] || "application/octet-stream";

	fs.readFile(filePath, (err, data) => {
		if (err) {
			if (err.code === "ENOENT") {
				res.writeHead(404);
				res.end("Not Found");
			} else {
				res.writeHead(500);
				res.end("Internal Server Error");
			}
			return;
		}
		res.writeHead(200, { "Content-Type": contentType });
		res.end(data);
	});
}

// --------------------------------------------------------------------------
// Cumulative vocabulary
// --------------------------------------------------------------------------

function buildCumulativeVocab(lessonId) {
	const vocabMap = new Map();
	for (let id = 1; id <= lessonId; id++) {
		const filePath = path.join(DATA_DIR, `lesson-${id}.json`);
		if (!fs.existsSync(filePath)) continue;
		const raw = fs.readFileSync(filePath, "utf8");
		const data = JSON.parse(raw);
		for (const word of data.vocab || []) {
			// Deduplicate by Korean string
			if (!vocabMap.has(word.korean)) {
				vocabMap.set(word.korean, word);
			}
		}
	}
	return Array.from(vocabMap.values());
}

// --------------------------------------------------------------------------
// Prompt file discovery
// --------------------------------------------------------------------------

const PROMPTS_DIR = path.join(__dirname, "prompts");

function listPrompts(lessonId) {
	const dir = path.join(PROMPTS_DIR, `lesson-${lessonId}`);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(".md"))
		.map((f) => ({
			file: f,
			label: f.replace(/\.md$/, "").replace(/-/g, " "),
		}));
}

function readPromptFile(lessonId, promptFile) {
	// Sanitise: prevent directory traversal
	const safeFile = path.basename(promptFile);
	const filePath = path.join(PROMPTS_DIR, `lesson-${lessonId}`, safeFile);
	if (!filePath.startsWith(PROMPTS_DIR)) return null;
	if (!fs.existsSync(filePath)) return null;
	return fs.readFileSync(filePath, "utf8");
}

// --------------------------------------------------------------------------
// API handlers
// --------------------------------------------------------------------------

function listLessons(res) {
	const files = fs
		.readdirSync(DATA_DIR)
		.filter((f) => f.match(/^lesson-\d+\.json$/))
		.sort((a, b) => {
			const na = parseInt(a.match(/lesson-(\d+)/)[1]);
			const nb = parseInt(b.match(/lesson-(\d+)/)[1]);
			return na - nb;
		});

	const lessons = files.map((f) => {
		const raw = fs.readFileSync(path.join(DATA_DIR, f), "utf8");
		const data = JSON.parse(raw);
		return { id: data.id, title: data.title };
	});

	res.writeHead(200, { "Content-Type": "application/json" });
	res.end(JSON.stringify(lessons));
}

async function handleGenerate(req, res) {
	try {
		const body = await readRequestBody(req);
		const { lessonId, promptFile, count } = JSON.parse(body);

		if (!lessonId || !promptFile) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Missing lessonId or promptFile" }));
			return;
		}

		// Load lesson data
		const lessonPath = path.join(DATA_DIR, `lesson-${lessonId}.json`);
		if (!fs.existsSync(lessonPath)) {
			res.writeHead(404, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: `Lesson ${lessonId} not found` }));
			return;
		}
		const lesson = JSON.parse(fs.readFileSync(lessonPath, "utf8"));

		// Load prompt template
		const template = readPromptFile(lessonId, promptFile);
		if (template === null) {
			res.writeHead(404, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: `Prompt file ${promptFile} not found` }));
			return;
		}

		// Build cumulative vocabulary
		const vocab = buildCumulativeVocab(lessonId);

		// Use first grammar point (prompt file naming maps 1:1 by convention)
		const grammarPoint = lesson.grammar[0];
		if (!grammarPoint) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "No grammar point in lesson data" }));
			return;
		}

		// Validate count
		const exerciseCount = count != null ? Number(count) : 5;
		if (
			!Number.isInteger(exerciseCount) ||
			exerciseCount < 1 ||
			exerciseCount > 10
		) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({ error: "count must be an integer between 1 and 10" }),
			);
			return;
		}

		const exercises = await generateExercises({
			lesson,
			grammarPoint,
			vocab,
			promptTemplate: template,
			count: exerciseCount,
		});

		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify(exercises));
	} catch (err) {
		console.error("Generate error:", err.message);
		const isLLMError = err.message.startsWith("LLM returned");
		const status = isLLMError ? 422 : 500;

		// Use the rawContent from the error object if available (full untruncated),
		// otherwise fall back to extracting from the error message.
		const rawText =
			err.rawContent ||
			err.rawBody ||
			err.message.replace(/^LLM returned invalid JSON: /, "");

		const body = isLLMError
			? {
					error: "LLM returned invalid JSON",
					raw: rawText,
				}
			: { error: err.message };
		res.writeHead(status, { "Content-Type": "application/json" });
		res.end(JSON.stringify(body));
	}
}

function readRequestBody(req) {
	return new Promise((resolve, reject) => {
		let body = "";
		req.on("data", (chunk) => (body += chunk));
		req.on("end", () => resolve(body));
		req.on("error", reject);
	});
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
	const url = new URL(req.url, `http://${req.headers.host}`);

	// API routes
	if (url.pathname === "/api/lessons" && req.method === "GET") {
		return listLessons(res);
	}

	if (url.pathname === "/api/prompts" && req.method === "GET") {
		const lessonId = parseInt(url.searchParams.get("lessonId"));
		if (!lessonId) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Missing lessonId parameter" }));
			return;
		}
		const prompts = listPrompts(lessonId);
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify(prompts));
		return;
	}

	if (url.pathname === "/api/generate" && req.method === "POST") {
		return handleGenerate(req, res);
	}

	// Static files
	if (url.pathname === "/" || url.pathname === "") {
		return serveStatic(res, path.join(PUBLIC_DIR, "index.html"));
	}

	const safePath = path.normalize(url.pathname).replace(/^\/+/, "");
	const filePath = path.join(PUBLIC_DIR, safePath);

	// Prevent directory traversal
	if (!filePath.startsWith(PUBLIC_DIR)) {
		res.writeHead(403);
		res.end("Forbidden");
		return;
	}

	serveStatic(res, filePath);
});

server.listen(PORT, () => {
	console.log(`\n  Korean LLM Exercise Playground`);
	console.log(`  Server running at http://localhost:${PORT}\n`);
	console.log(
		`  DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? "✓ loaded" : "✗ not set"}`,
	);
	console.log(
		`  Lessons loaded: ${fs.readdirSync(DATA_DIR).filter((f) => f.match(/^lesson-\d+\.json$/)).length}\n`,
	);
});
