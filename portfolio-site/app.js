// Small, dependency-free interactions for the site.

// Mobile nav toggle
const toggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Close the menu after tapping a link (mobile)
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Current year in the footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Contact form → submit to Formspree via fetch, show inline success.
// If JS is unavailable, the form still POSTs normally (and _next redirects
// to the branded thanks page), so this is pure progressive enhancement.
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const successPanel = document.getElementById('formSuccess');
  const errorEl = document.getElementById('formError');
  const submitBtn = contactForm.querySelector('button[type="submit"]');

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (errorEl) errorEl.hidden = true;

    const originalLabel = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        contactForm.hidden = true;
        if (successPanel) successPanel.hidden = false;
        return;
      }

      let message = 'Something went wrong. Please try again, or email me directly at BrownForgeIT@gmail.com.';
      try {
        const data = await response.json();
        if (data && Array.isArray(data.errors) && data.errors.length) {
          message = data.errors.map((e) => e.message).join(' ');
        }
      } catch (_) { /* keep default message */ }
      if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }
    } catch (_) {
      if (errorEl) {
        errorEl.textContent = 'Network error — please email me at BrownForgeIT@gmail.com.';
        errorEl.hidden = false;
      }
    } finally {
      if (submitBtn && !contactForm.hidden) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
    }
  });
}

// Fade elements in as they scroll into view.
// Everything stays fully visible if JS or IntersectionObserver is unavailable —
// the hidden state is only applied once we know we can reveal it.
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealEls = document.querySelectorAll('.card, .project, .cert, .faq-item, .hero-stats');

if (revealEls.length && 'IntersectionObserver' in window && !prefersReduced) {
  document.documentElement.classList.add('js-reveal');
  revealEls.forEach((el) => el.classList.add('reveal'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach((el) => io.observe(el));
}
