const PAGES = [['/', 'Ana sayfa'], ['/blog', 'Blog'], ['/tools', 'Araçlar'], ['/dashboard', 'Dashboard'], ['/about', 'Hakkında']];

export function mountNav() {
  const here = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '') || '/';
  const nav = document.createElement('nav');
  nav.innerHTML = '<a class="brand" href="/">▲ Vercel Demo</a>' +
    PAGES.map(([h, t]) => `<a class="link${h === here ? ' active' : ''}" href="${h}">${t}</a>`).join('') +
    '<button class="ghost" id="theme" aria-label="Tema değiştir">🌓</button>';
  document.body.prepend(nav);
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.dataset.theme = saved;
  nav.querySelector('#theme').onclick = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  };
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function api(path) {
  const t0 = performance.now();
  const res = await fetch(path);
  const ms = performance.now() - t0;
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { ms });
  return { data: await res.json(), ms };
}

function trackView() {
  const path = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '') || '/';
  fetch('/api/stats', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) }).catch(() => {});
}

mountNav();
trackView();
