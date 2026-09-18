const form = document.querySelector('#note-form');
const titleInput = document.querySelector('#title');
const descriptionInput = document.querySelector('#description');
const notesGrid = document.querySelector('#notes-grid');
const emptyState = document.querySelector('#empty-state');
const noteCount = document.querySelector('#note-count');
const formStatus = document.querySelector('#form-status');

function formatDate(dateValue) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dateValue));
}

function renderNotes(notes) {
  notesGrid.innerHTML = '';
  noteCount.textContent = notes.length;
  emptyState.hidden = notes.length > 0;

  notes.forEach((note, index) => {
    const card = document.createElement('article');
    card.className = 'note-card';
    card.style.animationDelay = `${index * 45}ms`;
    card.innerHTML = `
      <button class="delete-button" type="button" aria-label="Delete ${escapeHtml(note.title)}" data-id="${note.id}">&times;</button>
      <h3>${escapeHtml(note.title)}</h3>
      <p>${escapeHtml(note.description)}</p>
      <time class="note-date" datetime="${note.createdAt}">${formatDate(note.createdAt)}</time>
    `;
    notesGrid.appendChild(card);
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

async function loadNotes() {
  const response = await fetch('/notes');
  if (!response.ok) throw new Error('Could not load notes.');
  renderNotes(await response.json());
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  formStatus.textContent = 'Saving...';

  try {
    const response = await fetch('/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleInput.value, description: descriptionInput.value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save note.');
    form.reset();
    formStatus.textContent = 'Note saved.';
    await loadNotes();
    titleInput.focus();
  } catch (error) {
    formStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

notesGrid.addEventListener('click', async (event) => {
  const button = event.target.closest('.delete-button');
  if (!button) return;
  button.disabled = true;

  try {
    const response = await fetch(`/notes/${button.dataset.id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Could not delete note.');
    await loadNotes();
  } catch (error) {
    button.disabled = false;
    formStatus.textContent = error.message;
  }
});

loadNotes().catch((error) => {
  emptyState.hidden = false;
  emptyState.querySelector('p').textContent = error.message;
});