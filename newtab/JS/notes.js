/**
 * notes.js — Notes widget: IndexedDB storage, list rendering,
 * editor (add/edit), pin, complete, delete.
 */

import { STORES, dbGetAll, dbPut, dbDelete } from "./db.js";
import { showConfirmDialog, showAlertDialog } from "./dialog.js";

const notesList = document.querySelector("#notesList");
const notesCount = document.querySelector("#notesCount");
const addNoteButton = document.querySelector("#addNoteButton");

// Note editor elements
const noteEditor = document.querySelector("#noteEditor");
const noteTitle = document.querySelector("#noteTitle");
const noteContent = document.querySelector("#noteContent");
const saveNoteButton = document.querySelector("#saveNoteButton");
const cancelNoteButton = document.querySelector("#cancelNoteButton");

let editingNoteId = null;

// --- DB Operations ---

const getNotes = () => dbGetAll(STORES.notes);
const saveNote = (note) => dbPut(STORES.notes, note);
const deleteNote = (id) => dbDelete(STORES.notes, id);

async function findNote(id) {
  const notes = await getNotes();
  return notes.find((item) => item.id === id);
}

// --- UI Rendering ---

async function renderNotes() {
  const notes = await getNotes();

  notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    return b.updatedAt - a.updatedAt;
  });

  notesList.innerHTML = "";
  notesCount.textContent = `${notes.length} ${notes.length === 1 ? "note" : "notes"}`;

  if (notes.length === 0) {
    notesList.innerHTML = `<div class="note-empty">No notes yet.</div>`;
    return;
  }

  notes.forEach((note) => {
    const item = document.createElement("div");
    item.className = "note-item";
    if (note.pinned) item.classList.add("pinned");

    item.innerHTML = `
      <div class="note-content">
        <input type="checkbox" class="note-check" data-complete="${note.id}" ${note.completed ? "checked" : ""}>
        <div class="note-title ${note.completed ? "completed" : ""}"></div>
        <div class="note-text ${note.completed ? "completed" : ""}"></div>
      </div>
      <div class="note-actions">
        <button class="note-action" data-pin="${note.id}">${note.pinned ? "Unpin" : "Pin"}</button>
        <button class="note-action" data-edit="${note.id}">Edit</button>
        <button class="note-action" data-delete-note="${note.id}">Delete</button>
      </div>
    `;
    // User-provided text goes in via textContent (no HTML escaping needed).
    item.querySelector(".note-title").textContent = note.title ?? "";
    item.querySelector(".note-text").textContent = note.content ?? "";

    notesList.appendChild(item);
  });

  attachNoteActions();
}

function attachNoteActions() {
  notesList.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      editNote(button.dataset.edit).catch((error) => {
        console.error("Note edit failed:", error);
      });
    });
  });

  notesList.querySelectorAll("[data-pin]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleNotePin(button.dataset.pin).catch((error) => {
        console.error("Note pin update failed:", error);
      });
    });
  });

  notesList.querySelectorAll("[data-complete]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      toggleNoteCompleted(checkbox.dataset.complete).catch((error) => {
        console.error("Note completion update failed:", error);
      });
    });
  });

  notesList.querySelectorAll("[data-delete-note]").forEach((button) => {
    button.addEventListener("click", () => {
      removeNote(button.dataset.deleteNote).catch((error) => {
        console.error("Note deletion failed:", error);
      });
    });
  });
}

// --- Editor ---

function openNoteEditor(note = null) {
  editingNoteId = note ? note.id : null;
  noteTitle.value = note?.title || "";
  noteContent.value = note?.content || "";
  
  noteContent.style.height = "auto";
  setTimeout(() => {
    noteContent.style.height = noteContent.scrollHeight + "px";
  }, 10);
  
  noteEditor.classList.add("active");
  noteTitle.focus();
}

function closeNoteEditor() {
  editingNoteId = null;
  noteTitle.value = "";
  noteContent.value = "";
  noteEditor.classList.remove("active");
}

// Save note (new or edit)
async function handleSaveNote() {
  try {
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();
    if (!title && !content) return;

    const now = Date.now();

    if (editingNoteId) {
      const note = await findNote(editingNoteId);
      if (!note) return;

      note.title = title;
      note.content = content;
      note.updatedAt = now;
      await saveNote(note);
    } else {
      await saveNote({
        id: crypto.randomUUID(),
        title,
        content,
        completed: false,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    closeNoteEditor();
    await renderNotes();
  } catch (error) {
    console.error("Note save failed:", error);
    await showAlertDialog("Failed to save note.", "Error");
  }
}

// --- State Management ---

async function editNote(id) {
  const note = await findNote(id);
  if (!note) return;

  openNoteEditor(note);
}

async function toggleNotePin(id) {
  const note = await findNote(id);
  if (!note) return;

  note.pinned = !note.pinned;
  note.updatedAt = Date.now();
  await saveNote(note);
  await renderNotes();
}

async function toggleNoteCompleted(id) {
  const note = await findNote(id);
  if (!note) return;

  note.completed = !note.completed;
  note.updatedAt = Date.now();
  await saveNote(note);
  await renderNotes();
}

async function removeNote(id) {
  const confirmed = await showConfirmDialog("Delete this note?");
  if (!confirmed) return;

  await deleteNote(id);
  await renderNotes();
}

// --- Init ---

function bindNoteEditor() {
  addNoteButton.addEventListener("click", () => openNoteEditor());
  saveNoteButton.addEventListener("click", handleSaveNote);
  cancelNoteButton.addEventListener("click", closeNoteEditor);
  
  noteContent.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });
}

/** Requires openDatabase() to have resolved. */
export async function initNotes() {
  bindNoteEditor();
  await renderNotes();

  console.log("Notes system initialized.");
}