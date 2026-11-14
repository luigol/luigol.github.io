// Luigol — comportamento da página (sem dependências)
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  // ---------- 0. Section titles: slide-up words ----------
  // Based on Spell UI Slide Up Text (MIT) - github.com/xxtomm/spell-ui.
  // Each word goes into a clipping span and rises from below when the
  // section becomes visible. Screen readers read a hidden full copy.
  document.querySelectorAll('.sec-head h2').forEach((h2) => {
    const text = h2.textContent.trim();
    const words = document.createElement('span');
    words.setAttribute('aria-hidden', 'true');
    text.split(/\s+/).forEach((word, i) => {
      if (i) words.appendChild(document.createTextNode(' '));
      const clip = document.createElement('span');
      clip.className = 'slide-word';
      const inner = document.createElement('span');
      inner.style.setProperty('--w', i);
      inner.textContent = word;
      clip.appendChild(inner);
      words.appendChild(clip);
    });
    const label = document.createElement('span');
    label.className = 'sr-only';
    label.textContent = text;
    h2.replaceChildren(label, words);
  });

  // ---------- 1. Animações ao rolar ----------
  // Cada <section data-animate> ganha .is-visible quando entra na tela;
  // o CSS então dispara as animações dos elementos .reveal dela.
  const sections = document.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target); // anima só uma vez
        }
      });
    }, { threshold: 0.18 });
    sections.forEach((s) => io.observe(s));
  } else {
    sections.forEach((s) => s.classList.add('is-visible'));
  }

  // ---------- 2. Carrossel de empresas ----------
  // Repete os logos até preencher a faixa e duplica o conjunto
  // para o loop (translateX -50%) não ter emenda.
  const track = document.querySelector('.marquee__track');
  if (track) {
    const originals = Array.from(track.children);
    const fill = () => {
      while (track.scrollWidth < window.innerWidth * 1.2) {
        originals.forEach((el) => track.appendChild(el.cloneNode(true)));
      }
      Array.from(track.children).forEach((el) => {
        const copy = el.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        track.appendChild(copy);
      });
      const PX_POR_SEGUNDO = 70; // velocidade do carrossel
      track.style.setProperty('--marquee-duration', (track.scrollWidth / 2 / PX_POR_SEGUNDO) + 's');
    };
    // espera as imagens carregarem para medir a largura certa
    const imgs = track.querySelectorAll('img');
    let pending = imgs.length;
    const done = () => { if (--pending <= 0) fill(); };
    if (!pending) fill();
    imgs.forEach((img) => (img.complete ? done() : (img.addEventListener('load', done), img.addEventListener('error', done))));
  }

  // (3. The hero background now lives in js/hero-spheres.js)

  // ---------- 4. Chips de habilidades ----------
  // Clicar num chip mostra o data-desc dele abaixo dos chips da área.
  // Só um chip fica ativo na página; clicar no ativo de novo fecha.
  const chips = document.querySelectorAll('.skill .tags li[data-desc]');
  let active = null;
  const close = (chip) => {
    chip.classList.remove('is-active');
    chip.setAttribute('aria-pressed', 'false');
    chip.closest('.skill__body').querySelector('.skill__desc').classList.remove('is-open');
  };
  const toggle = (chip) => {
    const wasActive = chip === active;
    if (active) close(active);
    active = null;
    if (wasActive) return;
    const desc = chip.closest('.skill__body').querySelector('.skill__desc');
    desc.innerHTML = '<span></span>';
    desc.firstChild.textContent = chip.dataset.desc;
    desc.classList.add('is-open');
    chip.classList.add('is-active');
    chip.setAttribute('aria-pressed', 'true');
    active = chip;
  };
  chips.forEach((chip) => {
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => toggle(chip));
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(chip); }
    });
  });

  // ---------- 5. Footer e-mail ----------
  // Build the address at runtime so it never appears in the HTML source.
  // Without JS, the button keeps its LinkedIn fallback link.
  document.querySelectorAll('[data-email-user]').forEach((el) => {
    const email = el.dataset.emailUser + '@' + el.dataset.emailDomain;
    if (el.tagName === 'A') el.href = 'mailto:' + email;
    else el.textContent = email;
  });
})();
