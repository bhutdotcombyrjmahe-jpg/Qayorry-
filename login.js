// Reads data-redirect attribute on the form to know where to go after login
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const errEl = document.getElementById('errMsg');
  const redirectTo = form.dataset.redirect;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ফোন নাম্বার অথবা পাসওয়ার্ড সঠিক নয়');
      }
      setToken(data.token);
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('next') || redirectTo;
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  });
});
