const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearButton = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

const draftStorageKey = "day4-note-draft";
const themeStorageKey = "day4-theme";

function updateCounts() {
  const characterTotal = noteText.value.length;
  const words = noteText.value.trim().match(/\S+/g) || [];

  charCount.textContent = `${characterTotal} / 200 characters`;
  wordCount.textContent = `${words.length} ${words.length === 1 ? "word" : "words"}`;
  charCount.classList.toggle("warning", characterTotal > 180);
  charCount.classList.toggle("over", characterTotal > 200);
}

function clearNote() {
  noteText.value = "";
  localStorage.removeItem(draftStorageKey);
  updateCounts();
}

function setTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-pressed", String(isDark));
}

noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem(draftStorageKey, noteText.value);
});

clearButton.addEventListener("click", clearNote);

noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearNote();
  }
});

themeToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark");
  setTheme(isDark);
  localStorage.setItem(themeStorageKey, isDark ? "dark" : "light");
});

const savedDraft = localStorage.getItem(draftStorageKey);
if (savedDraft !== null) {
  noteText.value = savedDraft;
}

setTheme(localStorage.getItem(themeStorageKey) === "dark");
updateCounts();