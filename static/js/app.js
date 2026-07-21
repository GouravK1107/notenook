/* ==========================================================================
   NoteNook — shared app utilities (toasts, dark mode, loader)
   ========================================================================== */

/* ---------------- toast notifications ---------------- */
function ensureToastStack(){
  let stack = document.querySelector('.toast-stack');
  if(!stack){
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('aria-live','polite');
    document.body.appendChild(stack);
  }
  return stack;
}

const ICONS = { success:'✓', error:'✕', info:'✎' };

function showToast(message, type = 'info', opts = {}){
  const stack = ensureToastStack();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
    <span>${opts.title ? `<strong>${opts.title}</strong> ` : ''}${message}</span>
  `;
  stack.appendChild(toast);
  const life = opts.duration || 3200;
  window.setTimeout(() => {
    toast.classList.add('leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once:true });
  }, life);
}

/* ---------------- page loader ---------------- */
function hidePageLoader(){
  const loader = document.querySelector('.page-loader');
  if(loader){ loader.setAttribute('hidden',''); }
}

document.addEventListener('DOMContentLoaded', () => {
  window.setTimeout(hidePageLoader, 500);
});

/* ---------------- dark mode ---------------- */
const DARK_MODE_KEY = 'notenook_dark_mode';

function applyDarkMode(isDark){
  document.body.classList.toggle('dark-mode', isDark);
  const toggle = document.getElementById('dark-mode-toggle');
  if(toggle){
    toggle.setAttribute('aria-pressed', String(isDark));
    const icon = toggle.querySelector('.dark-mode-icon');
    const label = toggle.querySelector('.dark-mode-label');
    if(icon) icon.textContent = isDark ? '☀' : '🌙';
    if(label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
  }
}

// Load dark mode preference
let darkModeOn = false;
try{ 
  darkModeOn = JSON.parse(localStorage.getItem(DARK_MODE_KEY) || 'false'); 
}catch(e){ darkModeOn = false; }
applyDarkMode(darkModeOn);

// Dark mode toggle (if exists on page)
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('dark-mode-toggle');
  if(toggle){
    toggle.addEventListener('click', () => {
      darkModeOn = !darkModeOn;
      applyDarkMode(darkModeOn);
      try{ localStorage.setItem(DARK_MODE_KEY, JSON.stringify(darkModeOn)); }catch(e){}
    });
  }
});

/* ---------------- nav auth state ---------------- */
function renderNavAuthState(){
  // This will be handled by Django templates now
  // But we keep this for any dynamic updates
  const userElement = document.querySelector('[data-nav-auth]');
  if(!userElement) return;
  
  // Check if user is logged in by checking if dashboard link exists or session
  const isLoggedIn = document.querySelector('.nav-links .dashboard-link') !== null;
  
  if(isLoggedIn){
    // Already rendered by Django
  } else {
    // Show login/register links if not logged in
    userElement.innerHTML = `
      <a class="btn btn-sm btn-ghost" href="/login/">Log in</a>
      <a class="btn btn-sm btn-primary" href="/register/">Sign up</a>
    `;
  }
}

// CSRF token helper for AJAX requests
function getCSRFToken() {
  const cookieValue = document.cookie.match(/csrftoken=([^;]+)/);
  return cookieValue ? cookieValue[1] : null;
}

// API request helper
async function apiRequest(url, method = 'GET', data = null) {
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken(),
    },
    credentials: 'same-origin'
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

/* ---------------- Loader wrapper ---------------- */
function withLoader(promiseFn, { minDuration = 650 } = {}){
  const start = Date.now();
  return Promise.resolve()
    .then(promiseFn)
    .then(result => {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, minDuration - elapsed);
      return new Promise(res => setTimeout(() => res(result), wait));
    })
    .catch(err => {
      document.querySelectorAll('.btn.is-loading').forEach(btn => {
        btn.classList.remove('is-loading');
        btn.disabled = false;
      });
      showToast(
        err.message || "Something went wrong. Please try again.",
        'error',
        { title: 'Error', duration: 6000 }
      );
      throw err;
    });
}

// Initialize nav on page load
document.addEventListener('DOMContentLoaded', renderNavAuthState);