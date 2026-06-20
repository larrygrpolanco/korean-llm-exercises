// Fill in the Country — static exercise, no LLM needed.

const exercises = [
  { flag: "🇺🇸", name: "제임스", answer: "미국" },
  { flag: "🇬🇧", name: "미워드", answer: "영국" },
  { flag: "🇯🇵", name: "에코치", answer: "일본" },
  { flag: "🇨🇳", name: "리밍", answer: "중국" },
  { flag: "🇫🇷", name: "소피", answer: "프랑스" },
  { flag: "🇰🇷", name: "유진", answer: "한국" },
];

const root = document.getElementById("root");

function buildCard(ex, i) {
  const card = document.createElement("div");
  card.className = "card";

  // Flag
  const flag = document.createElement("div");
  flag.className = "card-flag";
  flag.textContent = ex.flag;
  card.appendChild(flag);

  // Content column
  const content = document.createElement("div");
  content.className = "card-content";

  // Prompt: "제임스는 ___ 이에요."
  const prompt = document.createElement("div");
  prompt.className = "card-prompt";
  const nameSpan = document.createElement("span");
  nameSpan.textContent = `${ex.name}는 `;
  prompt.appendChild(nameSpan);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "card-input";
  input.placeholder = "나라";
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleCheck(card, ex, input);
  });
  prompt.appendChild(input);
  prompt.appendChild(document.createTextNode(" 이에요."));
  content.appendChild(prompt);

  // Actions
  const actions = document.createElement("div");
  actions.className = "card-actions";

  const checkBtn = document.createElement("button");
  checkBtn.className = "btn btn-check";
  checkBtn.textContent = "Check";
  checkBtn.addEventListener("click", () => handleCheck(card, ex, input));
  actions.appendChild(checkBtn);

  const revealBtn = document.createElement("button");
  revealBtn.className = "btn btn-reveal";
  revealBtn.textContent = "Show Answer";
  revealBtn.addEventListener("click", () => handleReveal(card, ex, input));
  actions.appendChild(revealBtn);

  content.appendChild(actions);

  // Feedback
  const fb = document.createElement("div");
  fb.className = "card-feedback";
  content.appendChild(fb);

  card.appendChild(content);
  return card;
}

function handleCheck(card, ex, input) {
  if (card.dataset.checked === "true") return;
  const val = input.value.trim();
  if (!val) return;

  card.dataset.checked = "true";
  input.disabled = true;
  for (const b of card.querySelectorAll(".btn")) b.disabled = true;

  const ok = val === ex.answer;
  input.classList.add(ok ? "correct" : "incorrect");
  card.classList.add(ok ? "correct" : "incorrect");

  const fb = card.querySelector(".card-feedback");
  fb.className = `card-feedback ${ok ? "fb-correct" : "fb-incorrect"}`;
  fb.textContent = ok ? "✓ 맞아요!" : `✗ 정답은 「${ex.answer}」이에요.`;
}

function handleReveal(card, ex, input) {
  if (card.dataset.checked === "true") return;

  card.dataset.checked = "true";
  input.value = ex.answer;
  input.disabled = true;
  input.classList.add("correct");
  for (const b of card.querySelectorAll(".btn")) b.disabled = true;

  const fb = card.querySelector(".card-feedback");
  fb.className = "card-feedback fb-reveal";
  fb.textContent = `정답: ${ex.answer}`;
}

// Bootstrap
for (let i = 0; i < exercises.length; i++) {
  root.appendChild(buildCard(exercises[i], i));
}
