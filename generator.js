// ---------------------------------------------------------------------------
// generator.js  —  single DeepSeek call
//
// Takes a filled prompt string, calls the API, returns parsed JSON as-is.
// Zero field validation — the prompt defines the output schema.
// ---------------------------------------------------------------------------

const https = require("https");

const BASE = "api.deepseek.com";
const PATH = "/chat/completions";

/**
 * Substitute template variables into a prompt string.
 * @param {string} template     - raw prompt with {placeholders}
 * @param {object} grammar      - { pattern, description, examples }
 * @param {object[]} vocab      - [{ korean, english }]
 * @param {number} count        - how many exercises requested
 * @returns {string}
 */
function fillTemplate(template, grammar, vocab, count) {
	const examples = (grammar.examples || [])
		.map((e) => `- ${e.kor} → ${e.eng}`)
		.join("\n");

	const vocabList = vocab.map((v) => `${v.korean} (${v.english})`).join(", ");

	return template
		.replace(/\{grammarPattern\}/g, grammar.pattern || "")
		.replace(/\{grammarDescription\}/g, grammar.description || "")
		.replace(/\{examples\}/g, examples)
		.replace(/\{vocabList\}/g, vocabList)
		.replace(/\{count\}/g, String(count));
}

/**
 * Call the DeepSeek chat API.
 * @param {string} userPrompt  - the full prompt text
 * @returns {Promise<string>} raw response body
 */
function callDeepSeek(userPrompt) {
	const apiKey = process.env.DEEPSEEK_API_KEY;
	if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");

	const payload = JSON.stringify({
		model: "deepseek-chat",
		messages: [{ role: "user", content: userPrompt }],
		response_format: { type: "json_object" },
		temperature: 0.7,
	});

	const options = {
		hostname: BASE,
		port: 443,
		path: PATH,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
			"Content-Length": Buffer.byteLength(payload),
		},
	};

	console.log("  → Calling DeepSeek API…");
	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			let body = "";
			res.on("data", (c) => (body += c));
			res.on("end", () => {
				if (res.statusCode !== 200) {
					reject(
						new Error(
							`DeepSeek returned ${res.statusCode}: ${body.slice(0, 200)}`,
						),
					);
					return;
				}
				console.log("  ✓ DeepSeek responded (" + body.length + " bytes)");
				resolve(body);
			});
		});
		req.on("error", reject);
		req.setTimeout(30_000, () => {
			req.destroy();
			reject(new Error("DeepSeek request timed out"));
		});
		req.write(payload);
		req.end();
	});
}

/**
 * Parse a DeepSeek JSON response. Handles markdown fences and
 * json_object wrapping (unwrap first array-valued property).
 * @param {string} rawBody
 * @returns {any}
 */
function parseResponse(rawBody) {
	const data = JSON.parse(rawBody);
	let content = data.choices?.[0]?.message?.content;
	if (!content) throw new Error("DeepSeek response missing content");

	content = content.trim();
	if (content.startsWith("```")) {
		content = content
			.replace(/^```(?:json)?\s*\n?/, "")
			.replace(/\n?```\s*$/, "");
	}

	let parsed;
	try {
		parsed = JSON.parse(content);
	} catch {
		const err = new Error("LLM returned invalid JSON");
		err.rawContent = content;
		throw err;
	}

	return parsed;
}

/**
 * Generate exercises from a filled prompt.
 *
 * @param {object} opts
 * @param {string} opts.promptTemplate  - raw prompt .md content
 * @param {object} opts.grammarPoint    - { pattern, description, examples }
 * @param {object[]} opts.vocab         - [{ korean, english }]
 * @param {number} [opts.count=5]
 * @returns {Promise<any>} parsed LLM response
 */
async function generate({ promptTemplate, grammarPoint, vocab, count = 5 }) {
	console.log("  Grammar:", grammarPoint.pattern);
	console.log("  Vocab words:", vocab.length);
	console.log("  Count:", count);
	const fullPrompt = fillTemplate(promptTemplate, grammarPoint, vocab, count);
	const rawResponse = await callDeepSeek(fullPrompt);
	const result = parseResponse(rawResponse);
	console.log(
		"  ✓ Generated",
		typeof result === "object" ? JSON.stringify(result).length : "?",
		"bytes",
	);
	return result;
}

module.exports = { generate };
