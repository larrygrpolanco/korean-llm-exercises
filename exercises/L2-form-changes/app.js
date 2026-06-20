// Form Changes Exercise — Lesson 2
// Calls /api/generate/form-changes and renders dict ↔ polite form exercises.

const btn = document.getElementById("generate-btn");
const countInput = document.getElementById("count");
const loading = document.getElementById("loading");
const errorEl = document.getElementById("error");
const results = document.getElementById("results");

btn.addEventListener("click", async () => {
  const count = Math.min(Math.max(Number(countInput.value) || 4, 1), 10);
  loading.classList.remove("hidden");
  results.classList.add("hidden");
  errorEl.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Generating…";

  try {
    const res = await fetch("/api/generate/L2-form-changes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data); return; }
    render(data);
  } catch {
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
  const h3 = document.createElement("h3");
  h3.textContent = "Generation Error";
  card.appendChild(h3);
  const p = document.createElement("p");
  p.textContent = data.error || "Unknown";
  card.appendChild(p);
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

  if (!Array.isArray(data.sections)) return;
  for (const sec of data.sections) {
    const div = document.createElement("div");
    div.className = "ex-section";
    const h3 = document.createElement("h3");
    h3.textContent = sec.title;
    div.appendChild(h3);
    for (const ex of sec.exercises || []) {
      div.appendChild(buildExercise(ex));
    }
    results.appendChild(div);
  }
}

// ---- Exercise card --------------------------------------------------------

function buildExercise(ex) {
  const item = document.createElement("div");
  item.className = "ex-item";

  // Prompt (dictionary or polite form)
  const promptSpan = document.createElement("span");
  promptSpan.className = "form-prompt";
  promptSpan.textContent = ex.prompt || "";
  item.appendChild(promptSpan);

  // Arrow
  const arrow = document.createElement("span");
  arrow.className = "form-arrow";
  arrow.textContent = "→";
  item.appendChild(arrow);

  // Input
  const input = document.createElement("input");
  input.type = "text";
  input.className = "form-input";
  input.placeholder = "…";
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") check(item, ex, input);
  });
  item.appendChild(input);

  // Check button
  const checkBtn = document.createElement("button");
  checkBtn.className = "btn-check";
  checkBtn.textContent = "Check";
  checkBtn.addEventListener("click", () => check(item, ex, input));
  item.appendChild(checkBtn);

  // Reveal button
  const revealBtn = document.createElement("button");
  revealBtn.className = "btn-reveal";
  revealBtn.textContent = "Show Answer";
  revealBtn.addEventListener("click", () => reveal(item, ex, input));
  item.appendChild(revealBtn);

  // Feedback
  const fb = document.createElement("div");
  fb.className = "ex-feedback";
  item.appendChild(fb);

  return item;
}

// ---- Logic ---------------------------------------------------------------

function check(item, ex, input) {
  if (item.dataset.checked === "true") return;
  const val = input.value.trim();
  if (!val) return;

  item.dataset.checked = "true";
  input.disabled = true;
  for (const b of item.querySelectorAll("button")) b.disabled = true;

  const clean = (s) => (s || "").trim().replace(/\s+/g, " ");
  const ok = clean(val) === clean(ex.answer);

  input.classList.add(ok ? "correct" : "incorrect");
  item.classList.add(ok ? "correct" : "incorrect");

  const fb = item.querySelector(".ex-feedback");
  fb.className = `ex-feedback ${ok ? "fb-correct" : "fb-incorrect"}`;
  fb.textContent = ok ? "✓ Correct!" : `✗ Incorrect — answer: 「${ex.answer}」`;
}

function reveal(item, ex, input) {
  if (item.dataset.checked === "true") return;
  item.dataset.checked = "true";
  input.disabled = true;
  for (const b of item.querySelectorAll("button")) b.disabled = true;

  const fb = item.querySelector(".ex-feedback");
  fb.className = "ex-feedback fb-reveal";
  fb.textContent = `Answer: ${ex.answer}`;
}
