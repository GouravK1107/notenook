/* ==========================================================================
   NoteNook — dashboard (Django backend version)
   ========================================================================== */

(function(){

  // Get initial data from Django
  const INITIAL_NOTES = window.INITIAL_NOTES || [];
  const USER_ID = window.USER_ID || null;
  
  // If no user ID, redirect to login
  if (!USER_ID) {
    window.location.href = '/login/';
    return;
  }

  const DEFAULT_CATEGORIES = ['General','Work','Personal','Ideas'];

  let notes = [...INITIAL_NOTES];
  let state = { filter: 'all', search: '', editingId: null, pendingDeleteId: null };

  /* ---------------- element refs ---------------- */
  const grid = document.getElementById('notes-grid');
  const emptyState = document.getElementById('empty-state');
  const emptyTitle = document.getElementById('empty-title');
  const emptyCopy = document.getElementById('empty-copy');
  const categoryList = document.getElementById('category-list');
  const searchInput = document.getElementById('search-input');
  const resultCount = document.getElementById('result-count');
  const sidebarStats = document.getElementById('sidebar-stats');
  const mascotLine = document.getElementById('mascot-line');
  const cardTemplate = document.getElementById('note-card-template');

  const overlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const noteForm = document.getElementById('note-form');
  const titleInput = document.getElementById('note-title');
  const categorySelect = document.getElementById('note-category');
  const categoryNewInput = document.getElementById('note-category-new');
  const contentInput = document.getElementById('note-content');
  const favoriteToggle = document.getElementById('note-favorite');
  const saveBtn = document.getElementById('save-note-btn');

  const deleteOverlay = document.getElementById('delete-overlay');

  /* ---------------- Inky mounts ---------------- */
  if (typeof Inky !== 'undefined') {
    Inky.mount('.page-loader .inky-host', 'think');
    Inky.mount('[data-inky-side]', 'idle');
    Inky.mount('[data-inky-empty]', 'sleep');
    Inky.mount('[data-inky-delete]', 'sad');
  }

  const mascotLines = [
    'Ready when you are.', 'What are we writing today?', 'A clear page is an open door.',
    'Small notes, big memory.', 'Everything here saves itself.'
  ];
  if (mascotLine) {
    mascotLine.textContent = mascotLines[Math.floor(Math.random()*mascotLines.length)];
  }

  /* ---------------- helpers ---------------- */
  function getCategories(){
    const fromNotes = notes.map(n => n.category);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...fromNotes]));
  }

  function timeAgo(ts){
    const diff = Date.now() - ts;
    const mins = Math.floor(diff/60000);
    if(mins < 1) return 'just now';
    if(mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if(hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs/24);
    if(days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------- API calls ---------------- */
  async function refreshNotesFromServer() {
    try {
      const data = await apiRequest('/api/notes/');
      notes = data;
      renderAll();
    } catch (error) {
      showToast('Failed to load notes', 'error', { title: 'Error' });
    }
  }

  async function createNoteAPI(data) {
    return await apiRequest('/api/notes/create/', 'POST', data);
  }

  async function updateNoteAPI(id, data) {
    return await apiRequest(`/api/notes/${id}/update/`, 'PUT', data);
  }

  async function deleteNoteAPI(id) {
    return await apiRequest(`/api/notes/${id}/delete/`, 'DELETE');
  }

  async function toggleFavoriteAPI(id) {
    return await apiRequest(`/api/notes/${id}/favorite/`, 'POST');
  }

  /* ---------------- rendering ---------------- */
  function renderCategorySidebar(){
    const favCount = notes.filter(n => n.favorite).length;
    const categories = getCategories();

    const items = [
      { key: 'all', label: 'All notes', count: notes.length },
      { key: 'favorites', label: '★ Favorites', count: favCount },
      ...categories.map(c => ({ key: 'cat:' + c, label: c, count: notes.filter(n => n.category === c).length }))
    ];

    categoryList.innerHTML = items.map(item => `
      <li>
        <button class="cat-btn ${state.filter === item.key ? 'active' : ''}" data-filter="${item.key}">
          <span>${escapeHtml(item.label)}</span>
          <span class="cat-count">${item.count}</span>
        </button>
      </li>
    `).join('');

    categoryList.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.filter = btn.dataset.filter;
        renderAll();
      });
    });

    sidebarStats.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'} · ${categories.length} categories`;
  }

  function getFilteredNotes(){
    let filtered = [...notes];

    if(state.filter === 'favorites') filtered = filtered.filter(n => n.favorite);
    else if(state.filter.startsWith('cat:')) filtered = filtered.filter(n => n.category === state.filter.slice(4));

    if(state.search.trim()){
      const q = state.search.trim().toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  function renderNotes(){
    const filtered = getFilteredNotes();
    grid.innerHTML = '';

    resultCount.textContent = `${filtered.length} shown`;

    if(filtered.length === 0){
      emptyState.hidden = false;
      grid.hidden = true;
      const hasAnyNotes = notes.length > 0;
      if(hasAnyNotes){
        emptyTitle.textContent = 'Nothing matches';
        emptyCopy.textContent = 'Try a different search term or filter.';
        if (typeof Inky !== 'undefined') {
          Inky.pose('[data-inky-empty]', 'sad');
        }
      } else {
        emptyTitle.textContent = 'No notes yet';
        emptyCopy.textContent = "This page is blank on purpose — write the first thing on your mind.";
        if (typeof Inky !== 'undefined') {
          Inky.pose('[data-inky-empty]', 'sleep');
        }
      }
      return;
    }

    emptyState.hidden = true;
    grid.hidden = false;

    filtered.forEach(note => {
      const node = cardTemplate.content.cloneNode(true);
      const card = node.querySelector('.note-card');
      card.dataset.id = note.id;
      node.querySelector('.note-category').textContent = note.category;
      node.querySelector('.note-title').textContent = note.title;
      node.querySelector('.note-snippet').textContent = note.content;
      node.querySelector('.note-date').textContent = timeAgo(note.updated_at);

      const star = node.querySelector('.note-fav');
      star.setAttribute('aria-pressed', String(note.favorite));
      star.textContent = note.favorite ? '★' : '☆';
      star.addEventListener('click', () => onToggleFavorite(note.id, star));

      node.querySelector('.note-edit').addEventListener('click', () => openEditor(note.id));
      node.querySelector('.note-delete').addEventListener('click', () => openDeleteConfirm(note.id));

      grid.appendChild(node);
    });
  }

  function renderAll(){
    renderCategorySidebar();
    renderNotes();
  }

  /* ---------------- search ---------------- */
  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      if (typeof Inky !== 'undefined') {
        Inky.pose('[data-inky-side]', 'search');
      }
      searchTimer = setTimeout(() => {
        state.search = searchInput.value;
        renderNotes();
        if (typeof Inky !== 'undefined') {
          Inky.pose('[data-inky-side]', 'idle');
        }
      }, 180);
    });
  }

  /* ---------------- favorite toggle ---------------- */
  async function onToggleFavorite(id, starEl){
    try {
      const result = await toggleFavoriteAPI(id);
      // Update local notes array
      const note = notes.find(n => n.id === id);
      if (note) {
        note.favorite = result.favorite;
      }
      starEl.classList.add('pulse');
      starEl.addEventListener('animationend', () => starEl.classList.remove('pulse'), { once:true });
      starEl.textContent = result.favorite ? '★' : '☆';
      starEl.setAttribute('aria-pressed', String(result.favorite));
      
      const noteTitle = notes.find(n => n.id === id)?.title || 'Note';
      showToast(result.favorite ? `"${noteTitle}" starred.` : `"${noteTitle}" unstarred.`, 'success');
      renderCategorySidebar();
      if(state.filter === 'favorites') renderNotes();
    } catch (error) {
      showToast('Could not toggle favorite', 'error', { title: 'Error' });
    }
  }

  /* ---------------- modal: create / edit ---------------- */
  function openEditor(noteId){
    state.editingId = noteId || null;
    noteForm.reset();
    ['field-title','field-category','field-content'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.classList.remove('has-error');
    });
    if (categoryNewInput) categoryNewInput.style.display = 'none';

    // rebuild category options from current categories
    const categories = getCategories();
    if (categorySelect) {
      categorySelect.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')
        + `<option value="__new">+ New category…</option>`;
    }

    if(noteId){
      const note = notes.find(n => n.id === noteId);
      if(!note) return;
      modalTitle.textContent = 'Edit note';
      titleInput.value = note.title;
      contentInput.value = note.content;
      if (categorySelect) {
        categorySelect.value = categories.includes(note.category) ? note.category : '__new';
        if(categorySelect.value === '__new' && categoryNewInput){
          categoryNewInput.style.display = 'block';
          categoryNewInput.value = note.category;
        }
      }
      favoriteToggle.setAttribute('aria-pressed', String(note.favorite));
      favoriteToggle.textContent = note.favorite ? '★' : '☆';
    } else {
      modalTitle.textContent = 'New note';
      favoriteToggle.setAttribute('aria-pressed', 'false');
      favoriteToggle.textContent = '☆';
    }

    overlay.hidden = false;
    titleInput.focus();
  }

  function closeEditor(){
    overlay.hidden = true;
    state.editingId = null;
  }

  document.getElementById('new-note-btn')?.addEventListener('click', () => openEditor(null));
  document.getElementById('empty-cta')?.addEventListener('click', () => openEditor(null));
  document.getElementById('modal-close')?.addEventListener('click', closeEditor);
  document.getElementById('modal-cancel')?.addEventListener('click', closeEditor);
  if (overlay) {
    overlay.addEventListener('click', (e) => { if(e.target === overlay) closeEditor(); });
  }
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && !overlay.hidden) closeEditor(); });

  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      if (categoryNewInput) {
        categoryNewInput.style.display = categorySelect.value === '__new' ? 'block' : 'none';
        if(categorySelect.value === '__new') categoryNewInput.focus();
      }
    });
  }

  if (favoriteToggle) {
    favoriteToggle.addEventListener('click', () => {
      const pressed = favoriteToggle.getAttribute('aria-pressed') === 'true';
      favoriteToggle.setAttribute('aria-pressed', String(!pressed));
      favoriteToggle.textContent = !pressed ? '★' : '☆';
      favoriteToggle.classList.add('pulse');
      favoriteToggle.addEventListener('animationend', () => favoriteToggle.classList.remove('pulse'), { once:true });
    });
  }

  noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    let category = categorySelect.value;
    if(category === '__new'){
      category = categoryNewInput.value.trim() || 'General';
    }
    const favorite = favoriteToggle.getAttribute('aria-pressed') === 'true';

    const titleValid = title.length > 0;
    const contentValid = content.length > 0;
    const titleField = document.getElementById('field-title');
    const contentField = document.getElementById('field-content');
    if (titleField) titleField.classList.toggle('has-error', !titleValid);
    if (contentField) contentField.classList.toggle('has-error', !contentValid);
    if(!titleValid || !contentValid) return;

    saveBtn.classList.add('is-loading');
    saveBtn.disabled = true;

    try {
      let result;
      if(state.editingId){
        result = await withLoader(() => updateNoteAPI(state.editingId, { title, content, category, favorite }));
      } else {
        result = await withLoader(() => createNoteAPI({ title, content, category, favorite }));
      }
      
      // Update local notes array
      if(state.editingId){
        const index = notes.findIndex(n => n.id === state.editingId);
        if(index !== -1) notes[index] = result;
      } else {
        notes.unshift(result);
      }
      
      saveBtn.classList.remove('is-loading');
      saveBtn.disabled = false;
      closeEditor();
      renderAll();
      if (typeof Inky !== 'undefined') {
        Inky.pose('[data-inky-side]', 'cheer', { revertTo:'idle', duration:1300 });
      }
      showToast(state.editingId ? `"${result.title}" updated.` : `"${result.title}" added to your notebook.`, 'success', {
        title: state.editingId ? 'Saved' : 'Created'
      });
    } catch (error) {
      saveBtn.classList.remove('is-loading');
      saveBtn.disabled = false;
      // Error already handled by withLoader
    }
  });

  /* ---------------- delete flow ---------------- */
  function openDeleteConfirm(noteId){
    state.pendingDeleteId = noteId;
    deleteOverlay.hidden = false;
  }
  function closeDeleteConfirm(){
    deleteOverlay.hidden = true;
    state.pendingDeleteId = null;
  }
  document.getElementById('delete-cancel')?.addEventListener('click', closeDeleteConfirm);
  if (deleteOverlay) {
    deleteOverlay.addEventListener('click', (e) => { if(e.target === deleteOverlay) closeDeleteConfirm(); });
  }

  document.getElementById('delete-confirm')?.addEventListener('click', async () => {
    const id = state.pendingDeleteId;
    if(!id) return;
    const note = notes.find(n => n.id === id);
    const cardEl = grid?.querySelector(`.note-card[data-id="${id}"]`);

    closeDeleteConfirm();

    if(cardEl){
      cardEl.classList.add('removing');
      cardEl.addEventListener('animationend', async () => {
        try {
          await deleteNoteAPI(id);
          notes = notes.filter(n => n.id !== id);
          renderAll();
          showToast(`"${note?.title || 'Note'}" deleted.`, 'error', { title:'Removed' });
        } catch (error) {
          cardEl.classList.remove('removing');
          showToast('Could not delete that note.', 'error', { title:'Delete failed' });
        }
      }, { once:true });
    } else {
      try {
        await deleteNoteAPI(id);
        notes = notes.filter(n => n.id !== id);
        renderAll();
        showToast(`"${note?.title || 'Note'}" deleted.`, 'error', { title:'Removed' });
      } catch (error) {
        showToast('Could not delete that note.', 'error', { title:'Delete failed' });
      }
    }
  });

  /* ---------------- init ---------------- */
  renderAll();
})();