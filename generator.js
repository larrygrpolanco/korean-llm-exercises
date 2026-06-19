// ---------------------------------------------------------------------------
// generator.js  –  pure exercise-generation module
//
// Zero HTTP-server awareness.  Uses Node.js built-in `https` to call the
// DeepSeek API.  Takes structured inputs and returns Exercise[].
// ---------------------------------------------------------------------------

const https = require("https");

// ---------------------------------------------------------------------------
// Types (documentation only — no runtime enforcement)
// ---------------------------------------------------------------------------

/**
 * @typedef {{ korean: string, english: string, pos: string }} VocabWord
 * @typedef {{ kor: string, eng: string }} GrammarExample
 * @typedef {{ id: string, pattern: string, description: string, examples: GrammarExample[] }} GrammarPoint
 * @typedef {{ id: number, title: string, vocab: VocabWord[], grammar: GrammarPoint[] }} LessonData
 * @typedef {{ id: string, type: string, prompt: string, answer: string, hint: string, grammar: string, vocab: string[] }} Exercise
 */

// ---------------------------------------------------------------------------
// DeepSeek API call
// ---------------------------------------------------------------------------

const DEEPSEEK_BASE = "api.deepseek.com";
const DEEPSEEK_PATH = "/chat/completions";

/**
 * Post a prompt to the DeepSeek chat API and return the raw response body.
 * @param {string} userPrompt  – the full prompt (system + user instructions)
 * @returns {Promise<string>}  – raw response body
 */
function callDeepSeek(userPrompt) {
	const apiKey = process.env.DEEPSEEK_API_KEY;
	if (!apiKey) {
		throw new Error("DEEPSEEK_API_KEY is not set");
	}

	const payload = JSON.stringify({
		model: "deepseek-chat",
		messages: [{ role: "user", content: userPrompt }],
		response_format: { type: "json_object" },
		temperature: 0.7,
	});

	const options = {
		hostname: DEEPSEEK_BASE,
		port: 443,
		path: DEEPSEEK_PATH,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
			"Content-Length": Buffer.byteLength(payload),
		},
	};

	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			let body = "";
			res.on("data", (chunk) => (body += chunk));
			res.on("end", () => {
				if (res.statusCode !== 200) {
					reject(
						new Error(
							`DeepSeek API returned ${res.statusCode}: ${body.slice(0, 200)}`,
						),
					);
					return;
				}
				resolve(body);
			});
		});

		req.on("error", reject);
		req.setTimeout(30_000, () => {
			req.destroy();
			reject(new Error("DeepSeek API request timed out"));
		});
		req.write(payload);
		req.end();
	});
}

// ---------------------------------------------------------------------------
// Template substitution
// ---------------------------------------------------------------------------

/**
 * Replace template variables in the prompt template with live data.
 * @param {string} template      – raw prompt file content
 * @param {GrammarPoint} grammar  – the grammar point to target
 * @param {VocabWord[]} vocab     – cumulative vocabulary
 * @param {number} count          – number of exercises to request
 * @returns {string}
 */
function substituteTemplate(template, grammar, vocab, count) {
	const examples = grammar.examples
		.map((e) => `- ${e.kor} → ${e.eng}`)
		.join("\n");

	const vocabList = vocab.map((v) => `${v.korean} (${v.english})`).join(", ");

	return template
		.replace(/\{grammarPattern\}/g, grammar.pattern)
		.replace(/\{grammarDescription\}/g, grammar.description)
		.replace(/\{examples\}/g, examples)
		.replace(/\{vocabList\}/g, vocabList)
		.replace(/\{count\}/g, String(count));
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

/**
 * Parse the DeepSeek API response into Exercise objects.
 * Handles the `json_object` response_format wrapper and removes markdown fences.
 * @param {string} rawBody  – raw HTTP response body from DeepSeek
 * @returns {Exercise[]}
 */
function parseResponse(rawBody) {
	const data = JSON.parse(rawBody);
	let content = data.choices?.[0]?.message?.content;

	if (!content) {
		throw new Error("DeepSeek response missing content");
	}

	// Strip markdown code fences if present
	content = content.trim();
	if (content.startsWith("```")) {
		content = content
			.replace(/^```(?:json)?\s*\n?/, "")
			.replace(/\n?```\s*$/, "");
	}

	// `response_format: json_object` wraps the array in an object.
	// If the content is an object, unwrap the first array value.
	let parsed;
	try {
		parsed = JSON.parse(content);
	} catch {
		const err = new Error(`LLM returned invalid JSON: ${content}`);
		err.rawBody = rawBody;
		err.rawContent = content;
		throw err;
	}

	if (Array.isArray(parsed)) return parsed;

	// Unwrap the JSON object wrapper — find the first array property
	for (const value of Object.values(parsed)) {
		if (Array.isArray(value)) return value;
	}

	// If it's an object but no array property, treat it as a single exercise
	if (typeof parsed === "object" && parsed !== null) {
		return [parsed];
	}

	const err = new Error(
		`LLM response is not an array: ${JSON.stringify(parsed)}`,
	);
	err.rawBody = rawBody;
	err.rawContent = JSON.stringify(parsed);
	throw err;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate exercises by calling the DeepSeek LLM with a filled prompt template.
 *
 * @param {object} opts
 * @param {LessonData} opts.lesson         – the selected lesson data
 * @param {GrammarPoint} opts.grammarPoint  – the grammar point to target
 * @param {VocabWord[]} opts.vocab          – cumulative vocabulary (all lessons ≤ selected)
 * @param {string} opts.promptTemplate      – raw prompt file content
 * @param {number} [opts.count=5]           – number of exercises to request
 * @returns {Promise<Exercise[]>}
 */
async function generateExercises({
	lesson,
	grammarPoint,
	vocab,
	promptTemplate,
	count = 5,
}) {
	// 1. Substitute template variables into the prompt
	const fullPrompt = substituteTemplate(
		promptTemplate,
		grammarPoint,
		vocab,
		count,
	);

	// 2. Call DeepSeek
	const rawResponse = await callDeepSeek(fullPrompt);

	// 3. Parse the response into Exercise objects
	const exercises = parseResponse(rawResponse);

	// 4. Validate and clean: ensure each exercise has required fields
	const required = [
		"id",
		"type",
		"prompt",
		"answer",
		"hint",
		"grammar",
		"vocab",
	];
	for (const ex of exercises) {
		for (const field of required) {
			if (!(field in ex)) {
				ex[field] = field === "vocab" ? [] : "";
			}
		}
		// Ensure options and acceptableAnswers are arrays if present
		if ("options" in ex && !Array.isArray(ex.options)) ex.options = [];
		if ("acceptableAnswers" in ex && !Array.isArray(ex.acceptableAnswers))
			ex.acceptableAnswers = [];
	}

	return exercises;
}

module.exports = { generateExercises };
