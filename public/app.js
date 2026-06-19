// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let selectedLessonId = null;
let selectedPromptFile = null;

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const lessonNav = document.getElementById("lesson-nav");
const exerciseTypes = document.getElementById("exercise-types");
const controls = document.getElementById("controls");
const results = document.getElementById("results");

// ---------------------------------------------------------------------------
// Lesson tabs
// ---------------------------------------------------------------------------

function renderLessonTabs(availableLessons) {
	lessonNav.replaceChildren();

	for (const lesson of availableLessons) {
		const btn = document.createElement("button");
		btn.className = "lesson-tab";
		btn.textContent = `Lesson ${lesson.id}`;
		btn.dataset.lessonId = lesson.id;
		btn.title = lesson.title;
		btn.addEventListener("click", () => selectLesson(lesson.id));
		lessonNav.appendChild(btn);
	}
}

function selectLesson(id) {
	selectedLessonId = id;
	selectedPromptFile = null;
	console.log("Selected lesson:", id);

	// Update visual state
	const tabs = lessonNav.querySelectorAll(".lesson-tab");
	for (const tab of tabs) {
		tab.classList.toggle("active", Number(tab.dataset.lessonId) === id);
	}

	// Load prompt files for this lesson
	loadPrompts(id);

	// Clear results area
	results.replaceChildren();
}

// ---------------------------------------------------------------------------
// Prompt / exercise type discovery
// ---------------------------------------------------------------------------

async function loadPrompts(lessonId) {
	exerciseTypes.replaceChildren();
	controls.replaceChildren();

	try {
		const res = await fetch(`/api/prompts?lessonId=${lessonId}`);
		const prompts = await res.json();

		if (!prompts.length) {
			const msg = document.createElement("p");
			msg.className = "empty-hint";
			msg.textContent = "No exercise types available for this lesson yet.";
			exerciseTypes.appendChild(msg);
			return;
		}

		renderExerciseTypeButtons(prompts);
	} catch (err) {
		console.error("Failed to load prompts:", err);
		const msg = document.createElement("p");
		msg.className = "error";
		msg.textContent = "Failed to load exercise types.";
		exerciseTypes.appendChild(msg);
	}
}

function renderExerciseTypeButtons(prompts) {
	exerciseTypes.replaceChildren();

	const heading = document.createElement("h2");
	heading.textContent = "Exercise Types";
	exerciseTypes.appendChild(heading);

	const btnGroup = document.createElement("div");
	btnGroup.className = "btn-group";

	for (const p of prompts) {
		const btn = document.createElement("button");
		btn.className = "type-btn";
		btn.textContent = p.label;
		btn.dataset.promptFile = p.file;
		btn.addEventListener("click", () => selectPromptFile(p));
		btnGroup.appendChild(btn);
	}

	exerciseTypes.appendChild(btnGroup);
}

function selectPromptFile(prompt) {
	selectedPromptFile = prompt.file;

	// Highlight selected exercise type
	const btns = exerciseTypes.querySelectorAll(".type-btn");
	for (const btn of btns) {
		btn.classList.toggle("active", btn.dataset.promptFile === prompt.file);
	}

	// Show Generate controls
	renderControls(prompt);
}

// ---------------------------------------------------------------------------
// Generate controls
// ---------------------------------------------------------------------------

function renderControls(prompt) {
	controls.replaceChildren();

	const heading = document.createElement("h2");
	heading.textContent = "Generate";
	controls.appendChild(heading);

	const row = document.createElement("div");
	row.className = "controls-row";

	const label = document.createElement("label");
	label.className = "count-label";
	label.textContent = "Count:";

	const countInput = document.createElement("input");
	countInput.type = "number";
	countInput.id = "exercise-count";
	countInput.className = "count-input";
	countInput.min = 1;
	countInput.max = 10;
	countInput.step = 1;
	countInput.value = 5;

	const generateBtn = document.createElement("button");
	generateBtn.id = "generate-btn";
	generateBtn.className = "generate-btn";
	generateBtn.textContent = "Generate";
	generateBtn.addEventListener("click", () => {
		const count = parseInt(countInput.value) || 5;
		doGenerate(prompt.file, count, generateBtn);
	});

	label.appendChild(countInput);
	row.appendChild(label);
	row.appendChild(generateBtn);
	controls.appendChild(row);
}

// ---------------------------------------------------------------------------
// Generate flow
// ---------------------------------------------------------------------------

async function doGenerate(promptFile, count, generateBtn) {
	// Show loading state
	results.replaceChildren();
	showLoading();

	// Disable button to prevent double-clicks
	if (generateBtn) {
		generateBtn.disabled = true;
		generateBtn.textContent = "Generating…";
	}

	try {
		const res = await fetch("/api/generate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				lessonId: selectedLessonId,
				promptFile,
				count,
			}),
		});

		const data = await res.json();

		if (!res.ok) {
			showError(data);
			return;
		}

		if (!Array.isArray(data) || data.length === 0) {
			showEmpty();
			return;
		}

		renderExerciseCards(data);
	} catch (err) {
		console.error("Generate failed:", err);
		showNetworkError(err.message);
	} finally {
		// Re-enable button
		if (generateBtn) {
			generateBtn.disabled = false;
			generateBtn.textContent = "Generate";
		}
	}
}

// ---------------------------------------------------------------------------
// Result rendering
// ---------------------------------------------------------------------------

function showLoading() {
	results.replaceChildren();
	const container = document.createElement("div");
	container.className = "spinner-container";

	const spinner = document.createElement("div");
	spinner.className = "spinner";

	const text = document.createElement("p");
	text.className = "spinner-text";
	text.textContent = "Generating exercises…";

	container.appendChild(spinner);
	container.appendChild(text);
	results.appendChild(container);
}

function showError(data) {
	results.replaceChildren();
	const card = document.createElement("div");
	card.className = "result-card error-card";

	const heading = document.createElement("h3");
	heading.textContent = "Generation Error";
	card.appendChild(heading);

	const msg = document.createElement("p");
	msg.textContent = data.error || "Unknown error";
	card.appendChild(msg);

	if (data.raw) {
		const rawLabel = document.createElement("p");
		rawLabel.className = "raw-label";
		rawLabel.textContent = "Raw LLM response:";
		card.appendChild(rawLabel);

		const pre = document.createElement("pre");
		pre.className = "raw-output";
		pre.textContent = data.raw;
		card.appendChild(pre);
	}

	const hint = document.createElement("p");
	hint.className = "retry-hint";
	hint.textContent =
		"Tip: Inspect the raw response above to debug the prompt, then try again.";
	card.appendChild(hint);

	results.appendChild(card);
}

function showNetworkError(message) {
	results.replaceChildren();
	const card = document.createElement("div");
	card.className = "result-card error-card";

	const h3 = document.createElement("h3");
	h3.textContent = "Network Error";
	card.appendChild(h3);

	const p = document.createElement("p");
	p.textContent =
		"Could not reach the server. Check that the server is running and try again.";
	card.appendChild(p);

	if (message) {
		const details = document.createElement("p");
		details.className = "error-detail";
		details.textContent = message;
		card.appendChild(details);
	}

	const hint = document.createElement("p");
	hint.className = "retry-hint";
	hint.textContent =
		"Retry: Select a lesson and exercise type, then click Generate again.";
	card.appendChild(hint);

	results.appendChild(card);
}

function showEmpty() {
	results.replaceChildren();
	const card = document.createElement("div");
	card.className = "result-card empty-card";

	const h3 = document.createElement("h3");
	h3.textContent = "No exercises generated";
	card.appendChild(h3);

	const p = document.createElement("p");
	p.textContent =
		"The LLM returned an empty result. Try adjusting the count or tweaking the prompt.";
	card.appendChild(p);

	const hint = document.createElement("p");
	hint.className = "retry-hint";
	hint.textContent =
		"Tip: Try generating fewer exercises or selecting a different prompt file.";
	card.appendChild(hint);

	results.appendChild(card);
}

function renderExerciseCards(exercises) {
	results.replaceChildren();

	const heading = document.createElement("h2");
	heading.textContent = `Results (${exercises.length})`;
	results.appendChild(heading);

	for (const ex of exercises) {
		const card = document.createElement("div");
		card.className = "exercise-card";

		// Header: type badge
		const header = document.createElement("div");
		header.className = "ex-header";
		const typeBadge = document.createElement("span");
		typeBadge.className = "type-badge";
		typeBadge.textContent = (ex.type || "exercise").replace(/-/g, " ");
		header.appendChild(typeBadge);
		card.appendChild(header);

		// Prompt
		const promptEl = document.createElement("p");
		promptEl.className = "ex-prompt";
		promptEl.textContent = ex.prompt || "(no prompt)";
		card.appendChild(promptEl);

		// Interactive widget (type-specific)
		const widget = document.createElement("div");
		widget.className = "ex-widget";

		if (
			ex.type === "multiple-choice" &&
			Array.isArray(ex.options) &&
			ex.options.length >= 2
		) {
			renderMultipleChoice(widget, ex);
		} else if (ex.type === "free-response") {
			renderFreeResponse(widget, ex);
		} else {
			// Default: fill-in-the-blank (interactive)
			renderFillInTheBlank(widget, ex);
		}
		card.appendChild(widget);

		// Hint (hidden until revealed)
		if (ex.hint) {
			const hintEl = document.createElement("p");
			hintEl.className = "ex-hint hidden";
			hintEl.textContent = `Hint: ${ex.hint}`;
			card.appendChild(hintEl);
		}

		// Action row: hint + show-answer
		const actions = document.createElement("div");
		actions.className = "ex-actions";

		if (ex.hint) {
			const hintBtn = document.createElement("button");
			hintBtn.className = "action-btn hint-btn";
			hintBtn.textContent = "Show Hint";
			hintBtn.addEventListener("click", () => {
				const hint = card.querySelector(".ex-hint");
				if (hint) {
					hint.classList.toggle("hidden");
					hintBtn.textContent = hint.classList.contains("hidden")
						? "Show Hint"
						: "Hide Hint";
				}
			});
			actions.appendChild(hintBtn);
		}

		const showAnswerBtn = document.createElement("button");
		showAnswerBtn.className = "action-btn show-answer-btn";
		showAnswerBtn.textContent = "Show Answer";
		showAnswerBtn.addEventListener("click", () => {
			revealAnswer(card, ex);
			showAnswerBtn.remove();
		});
		actions.appendChild(showAnswerBtn);
		card.appendChild(actions);

		// Feedback area (initially empty)
		const feedback = document.createElement("div");
		feedback.className = "ex-feedback";
		card.appendChild(feedback);

		// Meta tags
		const meta = document.createElement("div");
		meta.className = "ex-meta";

		if (ex.grammar) {
			const grammarTag = document.createElement("span");
			grammarTag.className = "tag grammar-tag";
			grammarTag.textContent = ex.grammar;
			meta.appendChild(grammarTag);
		}

		if (ex.vocab && ex.vocab.length) {
			for (const v of ex.vocab) {
				const vocabTag = document.createElement("span");
				vocabTag.className = "tag vocab-tag";
				vocabTag.textContent = v;
				meta.appendChild(vocabTag);
			}
		}

		card.appendChild(meta);
		results.appendChild(card);
	}
}

// ---------------------------------------------------------------------------
// Interactive widgets
// ---------------------------------------------------------------------------

/** Check a student answer against the expected answer(s). */
function checkAnswer(exercise, studentAnswer) {
	const clean = (s) => (s || "").trim().replace(/\s+/g, " ");
	const given = clean(studentAnswer);
	const target = clean(exercise.answer);
	if (given === target) return true;
	// Check acceptable alternatives
	if (Array.isArray(exercise.acceptableAnswers)) {
		for (const alt of exercise.acceptableAnswers) {
			if (given === clean(alt)) return true;
		}
	}
	return false;
}

/** Show feedback in the card's feedback area. */
function showFeedback(card, correct, message) {
	const fb = card.querySelector(".ex-feedback");
	if (!fb) return;
	fb.className = `ex-feedback ${correct ? "feedback-correct" : "feedback-incorrect"}`;
	fb.textContent = message;
}

/** Reveal the correct answer (instructor escape hatch). */
function revealAnswer(card, ex) {
	const fb = card.querySelector(".ex-feedback");
	if (!fb) return;
	fb.className = "ex-feedback feedback-reveal";
	fb.textContent = `Answer: ${ex.answer}`;
	// Also show hint if hidden
	const hint = card.querySelector(".ex-hint");
	if (hint) hint.classList.remove("hidden");
}

// ----- Multiple choice -----------------------------------------------------

function renderMultipleChoice(widget, ex) {
	// Shuffle options so correct answer isn't always first
	const options = [...ex.options];
	shuffleArray(options);

	const btnGroup = document.createElement("div");
	btnGroup.className = "mc-options";

	for (const opt of options) {
		const btn = document.createElement("button");
		btn.className = "mc-option-btn";
		btn.textContent = opt;
		btn.addEventListener("click", () => {
			// Ignore if already answered
			if (btnGroup.dataset.answered === "true") return;
			btnGroup.dataset.answered = "true";

			const correct = opt === ex.answer;

			// Highlight all buttons
			for (const b of btnGroup.querySelectorAll(".mc-option-btn")) {
				b.disabled = true;
				if (b.textContent === ex.answer) {
					b.classList.add("correct");
				} else if (b === btn && !correct) {
					b.classList.add("incorrect");
				}
			}

			const card = widget.closest(".exercise-card");
			showFeedback(
				card,
				correct,
				correct ? "✓ Correct!" : `✗ Incorrect — the answer is 「${ex.answer}」`,
			);
		});
		btnGroup.appendChild(btn);
	}

	widget.appendChild(btnGroup);
}

/** Fisher-Yates shuffle (in-place). */
function shuffleArray(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}

// ----- Free response -------------------------------------------------------

function renderFreeResponse(widget, ex) {
	const input = document.createElement("input");
	input.type = "text";
	input.className = "fr-input";
	input.placeholder = "Type your answer…";
	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter") checkFreeResponse(widget, ex, input);
	});
	widget.appendChild(input);

	const checkBtn = document.createElement("button");
	checkBtn.className = "check-btn";
	checkBtn.textContent = "Check";
	checkBtn.addEventListener("click", () =>
		checkFreeResponse(widget, ex, input),
	);
	widget.appendChild(checkBtn);
}

function checkFreeResponse(widget, ex, input) {
	if (widget.dataset.answered === "true") return;
	const studentAnswer = input.value;
	if (!studentAnswer.trim()) return;

	widget.dataset.answered = "true";
	input.disabled = true;
	widget.querySelector(".check-btn").disabled = true;

	const correct = checkAnswer(ex, studentAnswer);
	input.classList.add(correct ? "input-correct" : "input-incorrect");

	const card = widget.closest(".exercise-card");
	showFeedback(
		card,
		correct,
		correct ? "✓ Correct!" : `✗ Incorrect — the answer is 「${ex.answer}」`,
	);
}

// ----- Fill-in-the-blank ---------------------------------------------------

function renderFillInTheBlank(widget, ex) {
	const prompt = ex.prompt || "";
	const blankRegex = /_{2,}/g;

	if (!blankRegex.test(prompt)) {
		// No blank found — treat as free response
		return renderFreeResponse(widget, ex);
	}

	// Rebuild prompt text with an input in place of each blank
	blankRegex.lastIndex = 0;
	const parts = [];
	let lastIdx = 0;
	let match;
	const inputs = [];

	while ((match = blankRegex.exec(prompt)) !== null) {
		// Text before the blank
		if (match.index > lastIdx) {
			parts.push(document.createTextNode(prompt.slice(lastIdx, match.index)));
		}
		// Input for the blank
		const input = document.createElement("input");
		input.type = "text";
		input.className = "fib-input";
		input.placeholder = "…";
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") checkFillInTheBlank(widget, ex, inputs);
		});
		parts.push(input);
		inputs.push(input);
		lastIdx = match.index + match[0].length;
	}

	// Text after last blank
	if (lastIdx < prompt.length) {
		parts.push(document.createTextNode(prompt.slice(lastIdx)));
	}

	const promptRow = document.createElement("div");
	promptRow.className = "fib-prompt";
	for (const p of parts) promptRow.appendChild(p);
	widget.appendChild(promptRow);

	const checkBtn = document.createElement("button");
	checkBtn.className = "check-btn";
	checkBtn.textContent = "Check";
	checkBtn.addEventListener("click", () =>
		checkFillInTheBlank(widget, ex, inputs),
	);
	widget.appendChild(checkBtn);
}

function checkFillInTheBlank(widget, ex, inputs) {
	if (widget.dataset.answered === "true") return;

	// Gather student answers: for single blank just the one value,
	// for multiple blanks join with spaces (simple heuristic)
	const values = inputs.map((inp) => inp.value.trim()).filter(Boolean);
	if (values.length === 0) return;

	const studentAnswer = values.join(" ");

	widget.dataset.answered = "true";
	for (const inp of inputs) inp.disabled = true;
	widget.querySelector(".check-btn").disabled = true;

	const correct = checkAnswer(ex, studentAnswer);

	for (const inp of inputs) {
		inp.classList.add(correct ? "input-correct" : "input-incorrect");
	}

	const card = widget.closest(".exercise-card");
	showFeedback(
		card,
		correct,
		correct ? "✓ Correct!" : `✗ Incorrect — the answer is 「${ex.answer}」`,
	);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function init() {
	try {
		const res = await fetch("/api/lessons");
		const lessons = await res.json();
		renderLessonTabs(lessons);
	} catch (err) {
		console.error("Failed to load lessons:", err);
		const errorMsg = document.createElement("p");
		errorMsg.className = "error";
		errorMsg.textContent = "Failed to load lessons.";
		lessonNav.replaceChildren(errorMsg);
	}
}

init();
