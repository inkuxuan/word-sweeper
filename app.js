const LAYOUTS = {
  qwerty: ["QWERTYUIOP", "ASDFGHJKL ", " ZXCVBNM  "],
  alphabet: [" ABCDEF", "GHIJKLM", "NOPQRST", "UVWXYZ "],
};
const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

const elements = {
  board: document.querySelector("#board"),
  boardFrame: document.querySelector("#board-frame"),
  boardModeLabel: document.querySelector("#board-mode-label"),
  category: document.querySelector("#category"),
  difficulty: document.querySelector("#difficulty"),
  length: document.querySelector("#length"),
  mode: document.querySelector("#mode"),
  modeLabel: document.querySelector("#mode-label"),
  opened: document.querySelector("#opened-count"),
  flagCount: document.querySelector("#flag-count"),
  guesses: document.querySelector("#guess-count"),
  form: document.querySelector("#guess-form"),
  input: document.querySelector("#guess-input"),
  submit: document.querySelector("#guess-button"),
  giveUp: document.querySelector("#give-up-button"),
  setup: document.querySelector("#setup"),
  setupMessage: document.querySelector("#setup-message"),
  round: document.querySelector("#round"),
  start: document.querySelector("#start-button"),
  change: document.querySelector("#change-button"),
  next: document.querySelector("#next-button"),
  message: document.querySelector("#message"),
};

let entries = [];
let current = null;
let grid = [];
let positions = new Map();
let keyByLetter = new Map();
let opened = new Set();
let flags = new Set();
let guessCount = 0;
let solved = false;

// Supports quoted fields, escaped quotes, commas, and line breaks in CSV cells.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function readEntries(csv) {
  const [header, ...data] = parseCsv(csv);
  if (!header || header[0]?.trim().toLowerCase() !== "word" || header[1]?.trim().toLowerCase() !== "category" || header[2]?.trim().toLowerCase() !== "level") {
    throw new Error("The CSV must start with word,category,level.");
  }
  const valid = data.map(([word = "", category = "", level = ""]) => ({
    word: word.trim().toUpperCase(),
    category: category.trim(),
    level: level.trim().toUpperCase(),
  })).filter(entry => /^[A-Z]+$/.test(entry.word) && entry.category && LEVELS.has(entry.level));
  if (!valid.length) throw new Error("The CSV has no valid words.");
  return valid;
}

function nearbyCount(letter, word) {
  const origin = positions.get(letter);
  if (!origin) return 0;
  let count = 0;
  for (const character of word) {
    const target = positions.get(character);
    if (target && Math.abs(target.row - origin.row) <= 1 && Math.abs(target.column - origin.column) <= 1 && character !== letter) {
      count += 1;
    }
  }
  return count;
}

function setMessage(text, kind = "") {
  elements.message.textContent = text;
  elements.message.className = `message ${kind}`.trim();
}

function chooseEntry() {
  const eligible = entries.filter(entry => !elements.difficulty.value || entry.level === elements.difficulty.value);
  const choices = eligible.filter(entry => entry !== current);
  const pool = choices.length ? choices : eligible;
  current = pool[Math.floor(Math.random() * pool.length)];
}

function setLayout() {
  const mode = elements.mode.value;
  grid = LAYOUTS[mode].map(row => [...row]);
  positions = new Map();
  grid.forEach((row, rowIndex) => row.forEach((letter, columnIndex) => {
    if (letter !== " ") positions.set(letter, { row: rowIndex, column: columnIndex });
  }));
  elements.boardFrame.dataset.mode = mode;
  elements.board.dataset.mode = mode;
  elements.modeLabel.textContent = mode === "qwerty" ? "QWERTY" : "7 × 4";
  elements.boardModeLabel.textContent = mode === "qwerty" ? "QWERTY FIELD" : "ALPHABET FIELD";
}

function createBoard() {
  elements.board.replaceChildren();
  keyByLetter = new Map();
  grid.forEach((row, rowIndex) => row.forEach((letter, columnIndex) => {
    if (letter === " ") return;
    const key = document.createElement("button");
    key.type = "button";
    key.className = "key";
    key.style.gridRow = String(rowIndex + 1);
    key.style.gridColumn = String(columnIndex + 1);
    key.dataset.letter = letter;
    key.setAttribute("aria-label", `Open ${letter}`);
    const label = document.createElement("span");
    label.className = "letter";
    label.textContent = letter;
    const result = document.createElement("span");
    result.className = "result";
    result.setAttribute("aria-hidden", "true");
    key.append(label, result);
    key.addEventListener("click", () => openLetter(letter, key));
    key.addEventListener("contextmenu", event => {
      event.preventDefault();
      toggleFlag(letter, key);
    });
    key.addEventListener("keydown", event => {
      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFlag(letter, key);
      }
    });
    keyByLetter.set(letter, key);
    elements.board.append(key);
  }));
}

function startRound() {
  setLayout();
  chooseEntry();
  opened = new Set();
  flags = new Set();
  guessCount = 0;
  solved = false;
  elements.category.textContent = current.category;
  elements.length.textContent = `${current.word.length} letters`;
  elements.opened.textContent = "0 / 26 opened";
  elements.flagCount.textContent = "0 flags";
  elements.guesses.textContent = "0 guesses";
  elements.input.value = "";
  elements.input.disabled = false;
  elements.submit.disabled = false;
  elements.giveUp.disabled = false;
  elements.next.textContent = "Skip puzzle ↗";
  setMessage("A number counts all nearby letters in the answer, including repeats.");
  createBoard();
}

function showSetup() {
  elements.round.hidden = true;
  elements.setup.hidden = false;
}

function showRound() {
  elements.setup.hidden = true;
  elements.round.hidden = false;
  startRound();
}

function updateProgress() {
  elements.opened.textContent = `${opened.size} / 26 opened`;
  elements.flagCount.textContent = `${flags.size} ${flags.size === 1 ? "flag" : "flags"}`;
}

function removeFlag(letter, key) {
  flags.delete(letter);
  key.classList.remove("flagged");
  key.querySelector(".result").textContent = "";
  key.setAttribute("aria-label", `Open ${letter}`);
  key.removeAttribute("aria-pressed");
  updateProgress();
}

function toggleFlag(letter, key) {
  if (!current || solved || opened.has(letter)) return;
  if (flags.has(letter)) {
    removeFlag(letter, key);
  } else {
    flags.add(letter);
    key.classList.add("flagged");
    key.querySelector(".result").textContent = "⚑";
    key.setAttribute("aria-label", `${letter}: flagged; right-click or press F to remove`);
    key.setAttribute("aria-pressed", "true");
    updateProgress();
  }
}

function revealMine(letter, key, amount) {
  if (flags.has(letter)) removeFlag(letter, key);
  opened.add(letter);
  const result = key.querySelector(".result");
  key.classList.add("revealed-mine");
  result.textContent = "✳";
  if (amount > 1) {
    const count = document.createElement("span");
    count.className = "multiplicity";
    count.textContent = `×${amount}`;
    result.append(count);
  }
  key.setAttribute("aria-label", `${letter}: in the answer ${amount} ${amount === 1 ? "time" : "times"}`);
  key.disabled = true;
}

function revealSafe(letter, key, count) {
  opened.add(letter);
  key.classList.add(count ? "revealed-safe" : "revealed-zero", `count-${Math.min(count, 9)}`);
  key.querySelector(".result").textContent = count ? String(count) : "";
  key.setAttribute("aria-label", `${letter}: ${count} nearby answer ${count === 1 ? "letter" : "letters"}`);
  key.disabled = true;
}

function neighborsOf(letter) {
  const { row, column } = positions.get(letter);
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const neighbor = grid[row + rowOffset]?.[column + columnOffset];
      if (neighbor && neighbor !== " ") neighbors.push(neighbor);
    }
  }
  return neighbors;
}

function revealSafeArea(startLetter) {
  const queue = [startLetter];
  const queued = new Set(queue);
  for (let index = 0; index < queue.length; index += 1) {
    const letter = queue[index];
    if (opened.has(letter) || flags.has(letter) || current.word.includes(letter)) continue;
    const count = nearbyCount(letter, current.word);
    revealSafe(letter, keyByLetter.get(letter), count);
    if (count !== 0) continue;
    for (const neighbor of neighborsOf(letter)) {
      if (!opened.has(neighbor) && !flags.has(neighbor) && !queued.has(neighbor) && !current.word.includes(neighbor)) {
        queue.push(neighbor);
        queued.add(neighbor);
      }
    }
  }
}

function openLetter(letter, key) {
  if (!current || solved || opened.has(letter) || flags.has(letter)) return;
  const amount = [...current.word].filter(character => character === letter).length;
  if (amount) revealMine(letter, key, amount);
  else revealSafeArea(letter);
  updateProgress();
}

function endRound() {
  solved = true;
  elements.input.disabled = true;
  elements.submit.disabled = true;
  elements.giveUp.disabled = true;
  elements.next.textContent = "Next puzzle ↗";
  elements.board.querySelectorAll(".key:not(:disabled)").forEach(key => { key.disabled = true; });
}

elements.form.addEventListener("submit", event => {
  event.preventDefault();
  if (!current || solved) return;
  const guess = elements.input.value.trim().toUpperCase();
  if (!guess) {
    setMessage("Type a word before checking your answer.", "error");
    elements.input.focus();
    return;
  }
  if (!/^[A-Z]+$/.test(guess)) {
    setMessage("Use English letters A–Z only.", "error");
    return;
  }
  guessCount += 1;
  elements.guesses.textContent = `${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`;
  if (guess === current.word) {
    endRound();
    setMessage(`Correct! ${current.word} was the hidden word.`, "success");
  } else {
    setMessage(`Not ${guess}. Keep exploring and try again.`, "error");
    elements.input.select();
  }
});

elements.giveUp.addEventListener("click", () => {
  if (!current || solved) return;
  for (const letter of new Set(current.word)) {
    if (!opened.has(letter)) {
      const amount = [...current.word].filter(character => character === letter).length;
      revealMine(letter, keyByLetter.get(letter), amount);
    }
  }
  updateProgress();
  endRound();
  setMessage(`The word was ${current.word}. Try another puzzle.`, "answer");
});

elements.next.addEventListener("click", () => {
  if (!entries.length) return;
  startRound();
});

elements.start.addEventListener("click", () => { if (entries.length) showRound(); });
elements.change.addEventListener("click", showSetup);

const aboutDialog = document.querySelector("#about-dialog");
document.querySelector("#about-button").addEventListener("click", () => aboutDialog.showModal());
document.querySelector("#close-about").addEventListener("click", () => aboutDialog.close());
aboutDialog.addEventListener("click", event => {
  if (event.target !== aboutDialog) return;
  const bounds = aboutDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
    aboutDialog.close();
  }
});

document.querySelector("#year").textContent = String(new Date().getFullYear());

async function initialize() {
  try {
    const response = await fetch("words.csv", { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load words.csv (${response.status}).`);
    entries = readEntries(await response.text());
    for (const option of elements.difficulty.options) {
      if (option.value) option.disabled = !entries.some(entry => entry.level === option.value);
    }
    if (elements.difficulty.selectedOptions[0].disabled) elements.difficulty.value = "";
    elements.start.disabled = false;
    elements.setupMessage.textContent = "Ready when you are.";
  } catch (error) {
    elements.difficulty.disabled = true;
    elements.mode.disabled = true;
    elements.setupMessage.textContent = `${error.message} Serve this folder over HTTP to play.`;
    elements.setupMessage.classList.add("error");
  }
}

initialize();
