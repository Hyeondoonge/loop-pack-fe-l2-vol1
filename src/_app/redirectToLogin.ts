export function redirectToLogin(): void {
  if (window.location.pathname === '/login') return;

  window.location.replace(`/login?next=${encodeURIComponent(window.location.href)}&reason=expired`);
}
