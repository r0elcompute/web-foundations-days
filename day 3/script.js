let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const categories = ["personal", "work", "study"];

function searchNotes(word) {
  const searchTerm = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(searchTerm));
}

function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

function countByCategory() {
  const counts = { personal: 0, work: 0, study: 0 };
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const noteLabel = total === 1 ? "note" : "notes";
  return `${total} ${noteLabel}: ${counts.personal} personal, ${counts.work} work, ${counts.study} study.`;
}

function isDuplicate(text) {
  const normalizedText = text.trim().toLowerCase();
  return notes.some((note) => note.text.trim().toLowerCase() === normalizedText);
}

function addNote(text, category) {
  if (typeof text !== "string" || text.trim().length < 1 || text.trim().length > 200) {
    console.warn("Note was not added: text must be 1-200 characters.");
    return false;
  }

  if (!categories.includes(category)) {
    console.warn("Note was not added: category must be personal, work, or study.");
    return false;
  }

  if (isDuplicate(text)) {
    console.warn("Note was not added: a note with the same text already exists.");
    return false;
  }

  const nextId = notes.reduce((highestId, note) => Math.max(highestId, note.id), 0) + 1;
  notes.push({ id: nextId, text: text.trim(), category });
  return true;
}

console.log("searchNotes('DAY 3'):", searchNotes("DAY 3")); // Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]
console.log("searchNotes('missing'):", searchNotes("missing")); // Expected: []

console.log("longestNote():", longestNote()); // Expected: { id: 3, text: "Email the project report to Grace", category: "work" }
console.log("countByCategory():", countByCategory()); // Expected: { personal: 2, work: 1, study: 2 }
console.log("getSummary():", getSummary()); // Expected: "5 notes: 2 personal, 1 work, 2 study."

const savedNotes = notes;
notes = [];
console.log("longestNote() with no notes:", longestNote()); // Expected: null
console.log("countByCategory() with no notes:", countByCategory()); // Expected: { personal: 0, work: 0, study: 0 }
console.log("getSummary() with no notes:", getSummary()); // Expected: "0 notes: 0 personal, 0 work, 0 study."
notes = savedNotes;

console.log("isDuplicate('  BUY MILK AND BREAD  '):", isDuplicate("  BUY MILK AND BREAD  ")); // Expected: true
console.log("isDuplicate('Buy fruit'):", isDuplicate("Buy fruit")); // Expected: false

console.log("addNote('Plan weekend hike', 'personal'):", addNote("Plan weekend hike", "personal")); // Expected: true
console.log("addNote(' plan weekend hike ', 'personal'):", addNote(" plan weekend hike ", "personal")); // Expected: false (duplicate)
console.log("addNote('', 'work'):", addNote("", "work")); // Expected: false (invalid length)
console.log("addNote('Prepare meeting agenda', 'invalid'):", addNote("Prepare meeting agenda", "invalid")); // Expected: false (invalid category)
