// ============ CART HELPERS (localStorage on the customer's own browser) ============
function getCart() {
  return JSON.parse(localStorage.getItem('qayorra_cart') || '[]');
}
function saveCart(cart) {
  localStorage.setItem('qayorra_cart', JSON.stringify(cart));
  updateCartCount();
}
function addToCart(product, qty) {
  const cart = getCart();
  const existing = cart.find((c) => c.id === product.id);
  if (existing) existing.qty += qty;
  else cart.push({ id: product.id, title: product.title, price: product.price, image: product.image, qty });
  saveCart(cart);
}
function removeFromCart(id) {
  saveCart(getCart().filter((c) => c.id !== id));
}
function cartTotal() {
  return getCart().reduce((s, c) => s + c.price * c.qty, 0);
}
function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (el) {
    const count = getCart().reduce((s, c) => s + c.qty, 0);
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  }
}

// ============ AUTH TOKEN ============
function getToken() {
  return localStorage.getItem('qayorra_token');
}
function setToken(t) {
  localStorage.setItem('qayorra_token', t);
}
function clearToken() {
  localStorage.removeItem('qayorra_token');
}
async function authFetch(url, opts = {}) {
  opts.headers = opts.headers || {};
  opts.headers['Authorization'] = 'Bearer ' + getToken();
  const res = await fetch(url, opts);
  if (res.status === 401) {
    clearToken();
    window.location.href = '/admin-login.html?next=' + encodeURIComponent(window.location.pathname);
    throw new Error('Unauthorized');
  }
  return res;
}

// ============ HEADER / DOT MENU ============
function injectHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  header.innerHTML = `
    <div class="header-inner">
      <a href="/index.html" class="brand">Qayorra <span>Fragrance</span></a>
      <div class="header-actions">
        <a href="/cart.html" class="icon-btn" title="কার্ট">🛒<span class="cart-count" id="cartCount" style="display:none">0</span></a>
        <div class="dot-menu-wrap">
          <button class="dot-menu-btn" id="dotMenuBtn">⋮</button>
          <div class="dot-menu-dropdown" id="dotMenuDropdown">
            <a href="/index.html">🏠 হোম</a>
            <a href="/cart.html">🛒 আমার কার্ট</a>
            <a href="/order-login.html">📦 অর্ডার লগইন</a>
            <a href="/admin-login.html">🔑 এডমিন লগইন</a>
            <a href="/dashboard-login.html">📊 এডমিন ড্যাশবোর্ড</a>
            <a href="/clients-login.html">👥 Clients History</a>
            <a href="/policy.html">📄 পলিসি</a>
          </div>
        </div>
      </div>
    </div>
  `;
  const btn = document.getElementById('dotMenuBtn');
  const dd = document.getElementById('dotMenuDropdown');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dd.classList.toggle('open');
  });
  document.addEventListener('click', () => dd.classList.remove('open'));
  updateCartCount();
}

// ============ FOOTER ============
function injectFooter() {
  const footer = document.getElementById('siteFooter');
  if (!footer) return;
  footer.innerHTML = `
    <div class="container footer-grid">
      <div>
        <h4>Qayorra Fragrance</h4>
        <p>by Mahe — বাংলাদেশের রাজকীয় সুগন্ধি, হাতে তৈরি প্রিমিয়াম আর্টিজান পারফিউম।</p>
      </div>
      <div>
        <h4>যোগাযোগ</h4>
        <a href="https://wa.me/8801732543193" target="_blank">📱 WhatsApp: 01732543193</a>
        <a href="https://www.facebook.com/profile.php?id=61593196076508" target="_blank">📘 আমাদের Facebook Page</a>
      </div>
      <div>
        <h4>নীতিমালা</h4>
        <a href="/policy.html">ডেলিভারি ও রিটার্ন পলিসি</a>
        <a href="/policy.html#privacy">প্রাইভেসি পলিসি</a>
      </div>
      <div>
        <h4>লিংক</h4>
        <a href="/index.html">হোম</a>
        <a href="/cart.html">কার্ট</a>
        <a href="/order-login.html">অর্ডার লগইন</a>
      </div>
    </div>
    <div class="footer-bottom">© ${new Date().getFullYear()} Qayorra Fragrance by Mahe — সর্বস্বত্ব সংরক্ষিত।</div>
  `;
}

// ============ FLOATING BUTTONS ============
function injectFloatingButtons() {
  const wrap = document.getElementById('floatingBtns');
  if (!wrap) return;
  wrap.innerHTML = `
    <a class="fab whatsapp" href="https://wa.me/8801732543193" target="_blank" title="WhatsApp">💬</a>
    <a class="fab facebook" href="https://www.facebook.com/profile.php?id=61593196076508" target="_blank" title="Facebook">📘</a>
  `;
}

// ============ VISIT / ABANDON TRACKING ============
function trackVisit() {
  fetch('/api/track/visit', { method: 'POST' }).catch(() => {});
}
function trackAbandonOnLeave() {
  window.addEventListener('beforeunload', () => {
    if (!sessionStorage.getItem('qayorra_purchased')) {
      navigator.sendBeacon && navigator.sendBeacon('/api/track/abandon');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  injectHeader();
  injectFooter();
  injectFloatingButtons();
  trackVisit();
  trackAbandonOnLeave();
});
