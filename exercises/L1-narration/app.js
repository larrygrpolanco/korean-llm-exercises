// Narration Exercise — Lesson 1
// Calls /api/generate/L1-narration and renders story + 3-section fill-blank exercises.

const btn = document.getElementById("generate-btn");
const countInput = document.getElementById("count");
const loading = document.getElementById("loading");
const errorEl = document.getElementById("error");
const results = document.getElementById("results");

btn.addEventListener("click", async () => {
	const count = Math.min(Math.max(Number(countInput.value) || 3, 1), 8);
	loading.classList.remove("hidden");
	results.classList.add("hidden");
	errorEl.classList.add("hidden");
	btn.disabled = true;
	btn.textContent = "Generating…";

	try {
		const res = await fetch("/api/generate/L1-narration", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ count }),
		});
		const data = await res.json();
		if (!res.ok) {
			showError(data);
			return;
		}
		render(data);
	} catch (err) {
		showError({ error: "Network error — check that the server is running." });
	} finally {
		btn.disabled = false;
		btn.textContent = "Regenerate";
		loading.classList.add("hidden");
	}
});

function showError(data) {
	errorEl.classList.remove("hidden");
	errorEl.replaceChildren();
	const card = document.createElement("div");
	card.className = "error-card";
	const eh3 = document.createElement("h3");
	eh3.textContent = "Generation Error";
	card.appendChild(eh3);
	const ep = document.createElement("p");
	ep.textContent = data.error || "Unknown";
	card.appendChild(ep);
	if (data.raw) {
		const pre = document.createElement("pre");
		pre.textContent = data.raw;
		card.appendChild(pre);
	}
	const hint = document.createElement("p");
	hint.style.cssText = "color:#94a3b8;margin-top:0.5rem;font-size:0.82rem";
	hint.textContent = "The LLM sometimes returns malformed JSON — try again.";
	card.appendChild(hint);
	errorEl.appendChild(card);
}

// ---- Render ---------------------------------------------------------------

function render(data) {
	results.classList.remove("hidden");
	results.replaceChildren();

	// Narration story — always visible at the top
	if (data.narration) {
		const box = document.createElement("div");
		box.className = "narration-box";
		const sh2 = document.createElement("h2");
		sh2.textContent = "📖 Story";
		box.appendChild(sh2);
		const p = document.createElement("p");
		renderHighlighted(p, data.narration);
		box.appendChild(p);
		results.appendChild(box);
	}

	if (!Array.isArray(data.sections) || data.sections.length === 0) return;

	// Build tab bar for exercise sections only
	const tabBar = document.createElement("div");
	tabBar.className = "tab-bar";

	const panels = [];

	for (let i = 0; i < data.sections.length; i++) {
		const sec = data.sections[i];
		const tabId = "section-" + i;

		const btn = document.createElement("button");
		btn.className = "tab-btn" + (i === 0 ? " active" : "");
		btn.textContent = sec.title;
		btn.dataset.tab = tabId;
		tabBar.appendChild(btn);

		const panel = document.createElement("div");
		panel.className = "tab-panel" + (i === 0 ? " active" : "");
		panel.dataset.panel = tabId;
		for (const ex of sec.exercises || []) {
			panel.appendChild(buildExercise(ex));
		}
		panels.push({ btn, panel });
	}

	results.appendChild(tabBar);

	// Append all panels
	const panelsContainer = document.createElement("div");
	panelsContainer.className = "tab-panels";
	for (const { panel } of panels) panelsContainer.appendChild(panel);
	results.appendChild(panelsContainer);

	// Tab switching
	tabBar.addEventListener("click", (e) => {
		const btn = e.target.closest(".tab-btn");
		if (!btn) return;
		const tabId = btn.dataset.tab;
		for (const { btn: b, panel: p } of panels) {
			const active = b.dataset.tab === tabId;
			b.classList.toggle("active", active);
			p.classList.toggle("active", active);
		}
	});
}

// ---- Highlight names (text → **Name** → span) ----------------------------

function renderHighlighted(parent, text) {
	const parts = text.split(/(\*\*.+?\*\*)/g);
	for (const part of parts) {
		if (part.startsWith("**") && part.endsWith("**")) {
			const span = document.createElement("span");
			span.className = "name-highlight";
			span.textContent = part.slice(2, -2);
			parent.appendChild(span);
		} else {
			parent.appendChild(document.createTextNode(part));
		}
	}
}

// ---- Exercise card --------------------------------------------------------

function buildExercise(ex) {
	const item = document.createElement("div");
	item.className = "ex-item";

	// Prompt with blank inputs
	const promptEl = document.createElement("div");
	promptEl.className = "ex-prompt";
	const prompt = ex.prompt || "";
	const inputs = [];
	let last = 0;
	const re = /_{2,}/g;
	let m;
	while ((m = re.exec(prompt)) !== null) {
		if (m.index > last)
			promptEl.appendChild(
				document.createTextNode(prompt.slice(last, m.index)),
			);
		const inp = document.createElement("input");
		inp.type = "text";
		inp.className = "ex-input";
		inp.placeholder = "…";
		inp.addEventListener("keydown", (e) => {
			if (e.key === "Enter") check(item, ex, inputs);
		});
		promptEl.appendChild(inp);
		inputs.push(inp);
		last = m.index + m[0].length;
	}
	if (last < prompt.length)
		promptEl.appendChild(document.createTextNode(prompt.slice(last)));
	if (inputs.length === 0) {
		const inp = document.createElement("input");
		inp.type = "text";
		inp.className = "ex-input";
		inp.placeholder = "Type answer…";
		inp.addEventListener("keydown", (e) => {
			if (e.key === "Enter") check(item, ex, [inp]);
		});
		promptEl.appendChild(inp);
		inputs.push(inp);
	}
	item.appendChild(promptEl);

	// Actions
	const actions = document.createElement("div");
	actions.className = "ex-actions";

	const checkBtn = document.createElement("button");
	checkBtn.className = "btn-check";
	checkBtn.textContent = "Check";
	checkBtn.addEventListener("click", () => check(item, ex, inputs));
	actions.appendChild(checkBtn);

	const revealBtn = document.createElement("button");
	revealBtn.className = "btn-reveal";
	revealBtn.textContent = "Show Answer";
	revealBtn.addEventListener("click", () => reveal(item, ex, inputs));
	actions.appendChild(revealBtn);

	item.appendChild(actions);

	const fb = document.createElement("div");
	fb.className = "ex-feedback";
	item.appendChild(fb);

	return item;
}

// ---- Logic ---------------------------------------------------------------

function check(item, ex, inputs) {
	if (item.dataset.checked === "true") return;
	const vals = inputs.map((i) => i.value.trim()).filter(Boolean);
	if (vals.length === 0) return;

	item.dataset.checked = "true";
	for (const i of inputs) i.disabled = true;
	item.querySelector(".btn-check").disabled = true;

	const clean = (s) => (s || "").trim().replace(/\s+/g, " ");
	const ok = clean(vals.join(", ")) === clean(ex.answer);

	for (const i of inputs) i.classList.add(ok ? "correct" : "incorrect");
	item.classList.add(ok ? "correct" : "incorrect");

	const fb = item.querySelector(".ex-feedback");
	fb.className = `ex-feedback ${ok ? "fb-correct" : "fb-incorrect"}`;
	fb.textContent = ok ? "✓ Correct!" : `✗ Incorrect — answer: 「${ex.answer}」`;
}

function reveal(item, ex, inputs) {
	if (item.dataset.checked === "true") return;
	item.dataset.checked = "true";
	for (const i of inputs) i.disabled = true;
	item.querySelector(".btn-check").disabled = true;

	const fb = item.querySelector(".ex-feedback");
	fb.className = "ex-feedback fb-reveal";
	fb.textContent = `Answer: ${ex.answer}`;
}

function esc(s) {
	const d = document.createElement("div");
	d.textContent = s;
	return d.innerHTML;
}
