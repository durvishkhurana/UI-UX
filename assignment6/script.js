// script.js — Global behavior for TravelBuddy
// Loads on all pages (defer)
document.addEventListener('DOMContentLoaded', () => {
  activateNavLink();
  enhancePackagesPage();
  enhanceBookingPage();
  enhanceGalleryPage();
});

/* -------------------- Navigation: active link + smooth anchors -------------------- */
function activateNavLink() {
  const nav = document.querySelector('.unique-nav');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll('a'));
  const current = (window.location.pathname.split('/').pop()) || 'index.html';

  links.forEach(a => {
    a.classList.remove('active');
    const href = a.getAttribute('href') || '';
    // Match filenames (e.g., packages.html)
    if (href === current || (href === 'index.html' && current === '')) {
      a.classList.add('active');
    }
    // Smooth scroll for local anchors
    if (href.startsWith('#')) {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }
  });
}

/* -------------------- PACKAGES: data-driven table -------------------- */
function enhancePackagesPage() {
  const grid = document.querySelector('.package-grid');
  if (!grid) return;

  // Package objects array
  const packages = [
    { id: 1, destination: 'Bali, Indonesia', durationDays: 7, basePrice: 1200, season: 'peak' },
    { id: 2, destination: 'Paris, France', durationDays: 5, basePrice: 1500, season: 'shoulder' },
    { id: 3, destination: 'Dubai, UAE', durationDays: 6, basePrice: 1100, season: 'off' },
    { id: 4, destination: 'Tokyo, Japan', durationDays: 8, basePrice: 1700, season: 'peak' },
  ];

  // Build table
  const table = document.createElement('table');
  table.className = 'package-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Destination</th>
        <th>Duration (days)</th>
        <th>Base Price (USD)</th>
        <th>Season</th>
        <th>Final Price (USD)</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');

  packages.forEach(pkg => {
    const final = computeFinalPrice(pkg);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${pkg.id}</td>
      <td>${pkg.destination}</td>
      <td>${pkg.durationDays}</td>
      <td>$${pkg.basePrice.toFixed(2)}</td>
      <td>${capitalize(pkg.season)}</td>
      <td><strong>$${final.toFixed(2)}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  grid.replaceWith(table);

  // Compute final price using season multiplier + weekend surcharge
  function computeFinalPrice(pkg) {
    let multiplier = 1.0;
    switch ((pkg.season || '').toLowerCase()) {
      case 'peak': multiplier = 1.25; break;       // +25%
      case 'shoulder': multiplier = 1.10; break;   // +10%
      case 'off': multiplier = 0.90; break;        // -10%
      default: multiplier = 1.0; break;
    }

    // Weekend surcharge heuristic: if trip >= 6 days, add 5%
    const weekendSurcharge = (pkg.durationDays >= 6) ? 0.05 : 0;
    const price = pkg.basePrice * multiplier * (1 + weekendSurcharge);
    return Math.round(price * 100) / 100;
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
}

/* -------------------- BOOKING: live price estimator + validation -------------------- */
function enhanceBookingPage() {
  const form = document.querySelector('form');
  if (!form) return;

  // Ensure checkin & checkout exist (replace any single date input)
  const dateEl = document.getElementById('date');
  if (dateEl) {
    const parent = dateEl.parentElement;
    parent.innerHTML = `
      <label for="checkin">📅 Check In</label>
      <input type="date" id="checkin" required>
      <label for="checkout" style="margin-top:10px; display:block;">📅 Check Out</label>
      <input type="date" id="checkout" required>
    `;
  } else {
    // If only checkin/checkout missing: create them near top of form
    if (!document.getElementById('checkin')) {
      const firstGroup = form.querySelector('.form-group');
      if (firstGroup) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';
        wrapper.innerHTML = `
          <label for="checkin">📅 Check In</label>
          <input type="date" id="checkin" required>
          <label for="checkout" style="margin-top:10px; display:block;">📅 Check Out</label>
          <input type="date" id="checkout" required>
        `;
        firstGroup.parentElement.insertBefore(wrapper, firstGroup.nextSibling);
      }
    }
  }

  // Ensure guests field
  if (!document.getElementById('guests')) {
    const packageSelect = document.getElementById('package');
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `
      <label for="guests">👥 Guests</label>
      <input type="number" id="guests" min="1" value="1" required>
    `;
    packageSelect.parentElement.insertAdjacentElement('afterend', div);
  }

  // Ensure promo code
  if (!document.getElementById('promoCode')) {
    const guestsEl = document.getElementById('guests');
    const div2 = document.createElement('div');
    div2.className = 'form-group';
    div2.innerHTML = `
      <label for="promoCode">🎟 Promo Code</label>
      <input type="text" id="promoCode" placeholder="Enter code (e.g. EARLYBIRD)">
    `;
    guestsEl.parentElement.insertAdjacentElement('afterend', div2);
  }

  // Price display box
  let priceBox = document.getElementById('priceEstimate');
  if (!priceBox) {
    priceBox = document.createElement('div');
    priceBox.id = 'priceEstimate';
    priceBox.style.margin = '1rem 0';
    priceBox.style.padding = '12px';
    priceBox.style.borderRadius = '8px';
    priceBox.style.background = '#f8f9fa';
    priceBox.style.fontWeight = '700';
    priceBox.textContent = 'Estimated total: —';
    const submitBtn = form.querySelector('.btn');
    submitBtn.parentElement.insertBefore(priceBox, submitBtn);
  }

  // Map some package names to base prices (keeps original UI)
  const packagePrices = {
    'Beach Paradise': 1200,
    'Romantic Getaway': 1500,
    'Luxury Escape': 1100,
    'Cultural Journey': 1700
  };

  // Get selected base price from package or destination
  function getSelectedBasePrice() {
    const pkgSelect = document.getElementById('package');
    const destSelect = document.getElementById('destination');
    const pkgVal = pkgSelect ? pkgSelect.value.trim() : '';
    if (packagePrices[pkgVal]) return packagePrices[pkgVal];

    const dest = destSelect ? destSelect.value : '';
    if (/bali/i.test(dest)) return 1200;
    if (/paris/i.test(dest)) return 1500;
    if (/dubai/i.test(dest)) return 1100;
    if (/tokyo/i.test(dest)) return 1700;
    return 1000; // fallback
  }

  // Event listeners to update estimate
  ['input', 'change'].forEach(evt => {
    form.addEventListener(evt, (e) => {
      const ids = ['checkin','checkout','guests','promoCode','package','destination','name','email'];
      if (ids.includes(e.target.id)) updateEstimate();
    });
  });
  // Validate on input
  form.addEventListener('input', validateFormAndToggleSubmit);

  // Initial calculate
  updateEstimate();
  validateFormAndToggleSubmit();

  function updateEstimate() {
    const ciVal = document.getElementById('checkin') ? document.getElementById('checkin').value : '';
    const coVal = document.getElementById('checkout') ? document.getElementById('checkout').value : '';
    const guests = Number(document.getElementById('guests') ? document.getElementById('guests').value : 1);
    const promo = (document.getElementById('promoCode') ? document.getElementById('promoCode').value : '').trim().toUpperCase();

    // Date math — nights
    let nights = 0;
    if (ciVal && coVal) {
      const ci = new Date(ciVal);
      const co = new Date(coVal);
      const diff = co.getTime() - ci.getTime();
      nights = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (isNaN(nights) || nights < 0) nights = 0;
    }

    // Base price * nights
    const basePrice = getSelectedBasePrice();
    let total = basePrice * Math.max(1, nights);

    // guests multiplier: +20% if guests > 2
    if (guests > 2) total *= 1.2;

    // Promo code discount via switch
    let promoDiscount = 0;
    switch (promo) {
      case 'EARLYBIRD': promoDiscount = 0.10; break;
      case 'SUMMER': promoDiscount = 0.05; break;
      case 'FALLSALE': promoDiscount = 0.15; break;
      default: promoDiscount = 0; break;
    }
    total = total * (1 - promoDiscount);
    total = Math.round(total * 100) / 100;

    priceBox.textContent = nights > 0 ? `Estimated total: $${total.toFixed(2)} (${nights} night${nights > 1 ? 's' : ''})` : 'Estimated total: —';
  }

  function validateFormAndToggleSubmit() {
    const name = document.getElementById('name');
    const email = document.getElementById('email');
    const checkin = document.getElementById('checkin');
    const checkout = document.getElementById('checkout');
    const pkg = document.getElementById('package');

    const isNameValid = name && name.value.trim().length > 1;
    const isEmailValid = email && email.checkValidity();

    let nights = 0;
    if (checkin && checkout && checkin.value && checkout.value) {
      const ci = new Date(checkin.value);
      const co = new Date(checkout.value);
      nights = Math.floor((co - ci) / (1000 * 60 * 60 * 24));
      if (isNaN(nights) || nights < 0) nights = 0;
    }
    const datesValid = nights > 0;
    const packageValid = pkg && pkg.value.trim() !== '';

    const ok = isNameValid && isEmailValid && datesValid && packageValid;
    const submitBtn = form.querySelector('.btn');
    if (submitBtn) submitBtn.disabled = !ok;

    // visual invalid indicators
    toggleInvalid(name, !isNameValid);
    toggleInvalid(email, !isEmailValid);
    toggleInvalid(checkin, !(checkin && checkin.value));
    toggleInvalid(checkout, !(checkout && checkout.value && nights > 0));
    toggleInvalid(pkg, !packageValid);
  }

  function toggleInvalid(el, invalid) {
    if (!el) return;
    if (invalid) el.style.borderColor = '#ff4757';
    else el.style.borderColor = '';
  }
}

/* -------------------- GALLERY: attribute-driven modal + layout toggle -------------------- */
function enhanceGalleryPage() {
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;

  // Ensure each thumbnail has data-large; if not, use src
  const imgs = Array.from(grid.querySelectorAll('.gallery-item img'));
  imgs.forEach(img => {
    if (!img.dataset.large) img.dataset.large = img.src;
    // set title for modal caption if absent
    if (!img.title) img.title = img.alt || '';
    img.style.cursor = 'zoom-in';
  });

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'tb-modal';
  modal.innerHTML = `
    <div class="tb-modal-inner">
      <button class="tb-modal-close" aria-label="Close">✕</button>
      <img class="tb-modal-img" src="" alt="">
      <div class="tb-modal-caption"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const modalImg = modal.querySelector('.tb-modal-img');
  const modalCaption = modal.querySelector('.tb-modal-caption');
  const modalClose = modal.querySelector('.tb-modal-close');

  function openModal(src, alt, captionText) {
    modal.classList.add('open');
    modalImg.src = src;
    modalImg.alt = alt || '';
    modalCaption.textContent = captionText || '';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    modalImg.src = '';
    document.body.style.overflow = '';
  }

  imgs.forEach(img => {
    img.addEventListener('click', () => {
      openModal(img.dataset.large, img.alt, img.title || img.alt);
    });
  });

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Layout toggle button
  const toggle = document.createElement('button');
  toggle.className = 'btn';
  toggle.textContent = 'Toggle layout';
  toggle.style.margin = '1rem';
  grid.parentElement.insertBefore(toggle, grid);

  toggle.addEventListener('click', () => {
    grid.classList.toggle('gallery-list');
  });
}
