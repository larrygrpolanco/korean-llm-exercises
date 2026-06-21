// Simple Location Markers — static exercise, no LLM.
// Data structure designed to be LLM-generatable in the future:
//   { a: { korean, english }, b: { korean, english }, prompt, answer, layout }

const MARKERS = ["위", "아래", "옆", "앞", "뒤", "안"];

const exercises = [
	{
		a: { korean: "책", english: "book" },
		b: { korean: "책상", english: "desk" },
		prompt: "책은 책상 ___에 있어요.",
		answer: "위",
		layout: "above",
	},
	{
		a: { korean: "고양이", english: "cat" },
		b: { korean: "탁자", english: "table" },
		prompt: "고양이는 탁자 ___에 있어요.",
		answer: "아래",
		layout: "below",
	},
	{
		a: { korean: "개", english: "dog" },
		b: { korean: "집", english: "house" },
		prompt: "개는 집 ___에 있어요.",
		answer: "옆",
		layout: "beside",
	},
	{
		a: { korean: "차", english: "car" },
		b: { korean: "집", english: "house" },
		prompt: "차는 집 ___에 있어요.",
		answer: "앞",
		layout: "front",
	},
	{
		a: { korean: "나무", english: "tree" },
		b: { korean: "집", english: "house" },
		prompt: "나무는 집 ___에 있어요.",
		answer: "뒤",
		layout: "behind",
	},
	{
		a: { korean: "사과", english: "apple" },
		b: { korean: "상자", english: "box" },
		prompt: "사과는 상자 ___에 있어요.",
		answer: "안",
		layout: "inside",
	},
	{
		a: { korean: "컵", english: "cup" },
		b: { korean: "탁자", english: "table" },
		prompt: "컵은 탁자 ___에 있어요.",
		answer: "위",
		layout: "above",
	},
	{
		a: { korean: "공", english: "ball" },
		b: { korean: "의자", english: "chair" },
		prompt: "공은 의자 ___에 있어요.",
		answer: "아래",
		layout: "below",
	},
];

const root = document.getElementById("root");

// ---- Build DOM ----

function buildCard(ex, i) {
	const card = document.createElement("div");
	card.className = "card";

	// Visual: shapes showing spatial relationship
	const viz = buildViz(ex);
	card.appendChild(viz);

	// Content column
	const content = document.createElement("div");
	content.className = "card-content";

	// Prompt line: "책은 책상 [select]에 있어요."
	const promptLine = document.createElement("div");
	promptLine.className = "card-prompt";

	const parts = ex.prompt.split("___");
	promptLine.appendChild(document.createTextNode(parts[0]));

	const select = document.createElement("select");
	select.className = "card-select";
	const placeholder = document.createElement("option");
	placeholder.value = "";
	placeholder.disabled = true;
	placeholder.selected = true;
	placeholder.textContent = "?";
	select.appendChild(placeholder);
	for (const m of MARKERS) {
		const opt = document.createElement("option");
		opt.value = m;
		opt.textContent = m;
		select.appendChild(opt);
	}
	promptLine.appendChild(select);

	promptLine.appendChild(document.createTextNode(parts[1]));
	content.appendChild(promptLine);

	// Object labels (English tooltips)
	const labels = document.createElement("div");
	labels.className = "card-labels";
	labels.textContent = `${ex.a.korean} (${ex.a.english})  —  ${ex.b.korean} (${ex.b.english})`;
	content.appendChild(labels);

	// Actions
	const actions = document.createElement("div");
	actions.className = "card-actions";

	const checkBtn = document.createElement("button");
	checkBtn.className = "btn btn-check";
	checkBtn.textContent = "Check";
	checkBtn.addEventListener("click", () => handleCheck(card, ex, select));
	actions.appendChild(checkBtn);

	const revealBtn = document.createElement("button");
	revealBtn.className = "btn btn-reveal";
	revealBtn.textContent = "Show Answer";
	revealBtn.addEventListener("click", () => handleReveal(card, ex, select));
	actions.appendChild(revealBtn);

	content.appendChild(actions);

	// Feedback
	const fb = document.createElement("div");
	fb.className = "card-feedback";
	content.appendChild(fb);

	card.appendChild(content);
	return card;
}

function buildViz(ex) {
	const container = document.createElement("div");
	container.className = `viz viz-${ex.layout}`;

	const elA = document.createElement("div");
	elA.className = "viz-object viz-a";
	elA.textContent = ex.a.korean; // Korean name as label

	const elB = document.createElement("div");
	elB.className = "viz-object viz-b";
	elB.textContent = ex.b.korean;

	// Layout determines DOM order and CSS behavior
	switch (ex.layout) {
		case "above":
			// A above B: column, A first then B
			container.appendChild(elA);
			container.appendChild(elB);
			break;
		case "below":
			// A below B: column, B first then A
			container.appendChild(elB);
			container.appendChild(elA);
			break;
		case "beside":
			// A beside B: row, A left B right
			container.appendChild(elA);
			container.appendChild(elB);
			break;
		case "front":
			// A in front of B: both stacked, A on top
			container.appendChild(elB);
			container.appendChild(elA);
			break;
		case "behind":
			// A behind B: both stacked, B on top (hiding A partially)
			container.appendChild(elA);
			container.appendChild(elB);
			break;
		case "inside":
			// A inside B: A is a child of B
			elB.appendChild(elA);
			container.appendChild(elB);
			break;
	}

	return container;
}

// ---- Interactions ----

function handleCheck(card, ex, select) {
	if (card.dataset.checked === "true") return;
	const val = select.value;
	if (!val) return;

	card.dataset.checked = "true";
	select.disabled = true;
	for (const b of card.querySelectorAll(".btn")) b.disabled = true;

	const ok = val === ex.answer;
	select.classList.add(ok ? "correct" : "incorrect");
	card.classList.add(ok ? "correct" : "incorrect");

	const fb = card.querySelector(".card-feedback");
	fb.className = `card-feedback ${ok ? "fb-correct" : "fb-incorrect"}`;
	fb.textContent = ok ? "✓ 맞아요!" : `✗ 정답은 「${ex.answer}」이에요.`;
}

function handleReveal(card, ex, select) {
	if (card.dataset.checked === "true") return;

	card.dataset.checked = "true";
	select.value = ex.answer;
	select.disabled = true;
	select.classList.add("correct");
	for (const b of card.querySelectorAll(".btn")) b.disabled = true;

	const fb = card.querySelector(".card-feedback");
	fb.className = "card-feedback fb-reveal";
	fb.textContent = `정답: ${ex.answer}`;
}

// ---- Bootstrap ----

for (let i = 0; i < exercises.length; i++) {
	root.appendChild(buildCard(exercises[i], i));
}
