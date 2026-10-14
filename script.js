/* =========================================================================
   YÁÑEZ CENTENO ABOGADOS  |  Lógica y animaciones
   -------------------------------------------------------------------------
   Dependencias (cargadas por CDN en index.html): GSAP + ScrollTrigger, Lenis.
   Principios:
   - Mejora progresiva: sin GSAP, sin Lenis o con "reducir movimiento" el sitio
     se muestra completo y funcional, solo sin animaciones.
   - Sin listeners de scroll: se usa ScrollTrigger, IntersectionObserver y Lenis.
   - Solo se animan transform y opacity.
   - Cada animación comunica algo: jerarquía, narrativa, retroalimentación o estado.
   ========================================================================= */
(() => {
  'use strict';
  window.__yc = true; // le avisa a la red de seguridad del HTML que el script arrancó

  /* ---------- Configuración ---------- */
  const WA_NUMBER = '523121851166'; // 52 (México) + 312 185 11 66

  /* ---------- Utilidades ---------- */
  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const canMotion = hasGsap && !reduce;
  const HEADER_H = 72;

  let lenis = null;
  let menuOpen = false;

  const waUrl = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

  /* =========================================================
     1. Contenido estático: enlaces de WhatsApp y año
     ========================================================= */
  function hydrateLinks() {
    $$('[data-wa]').forEach((a) => { a.href = waUrl(a.dataset.wa); });
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* =========================================================
     2. División de texto en palabras (para revelar titulares)
     ========================================================= */
  function splitWords(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            const i = document.createElement('span');
            i.className = 'wi';
            i.textContent = part;
            w.appendChild(i);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    return $$('.wi', el);
  }

  /* =========================================================
     3. Lenis: scroll suave y pausado
     ========================================================= */
  function initLenis() {
    if (!canMotion || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on('scroll', window.ScrollTrigger.update);
    window.gsap.ticker.add((t) => lenis.raf(t * 1000));
    window.gsap.ticker.lagSmoothing(0);
    lenis.stop(); // detenido hasta que termine el preloader
  }

  function scrollToTarget(target, immediate = false) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) {
      // Offset 0: todas las secciones tienen >= 80px de padding superior, así el título nunca queda bajo el header
      lenis.scrollTo(el, { offset: 0, duration: immediate ? 0 : 1.7, immediate, easing: (t) => 1 - Math.pow(1 - t, 4) });
    } else {
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  function scrollToY(y) {
    if (lenis) lenis.scrollTo(Math.max(0, y), { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
  }

  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const go = () => scrollToTarget(id === '#inicio' ? document.body : target);
      if (menuOpen) { setMenu(false); setTimeout(go, 450); } else { go(); }
    });
  }

  /* =========================================================
     4. Menú móvil
     ========================================================= */
  const burger = $('#burger');
  const menu = $('#menu');
  const header = $('#header');

  function setMenu(open) {
    if (!burger || !menu) return;
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    if (open) header.classList.remove('is-hidden');
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    else { root.style.overflow = open ? 'hidden' : ''; }
  }

  function initMenu() {
    if (!burger || !menu) return;
    burger.addEventListener('click', () => setMenu(!menuOpen));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', (m) => { if (m.matches && menuOpen) setMenu(false); });
  }

  /* =========================================================
     5. Header: estado sólido (IntersectionObserver) y ocultar al bajar
     ========================================================= */
  function initHeader() {
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:90px;pointer-events:none;';
    document.body.prepend(sentinel);
    new IntersectionObserver(([entry]) => header.classList.toggle('is-solid', !entry.isIntersecting), { threshold: 0 }).observe(sentinel);

    // Resalta la sección actual en la navegación
    const links = $$('.nav a');
    const map = new Map(links.map((a) => [a.getAttribute('href'), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-current'));
        const link = map.get('#' + en.target.id);
        if (link) link.classList.add('is-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['despacho', 'areas', 'diferencias', 'trayectoria', 'preguntas'].forEach((id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

    if (canMotion) {
      const bar = $('.site-header__progress');
      window.gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.25 } });
      window.ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: (self) => {
          if (menuOpen) return;
          const y = self.scroll();
          header.classList.toggle('is-hidden', self.direction === 1 && y > 700);
        },
      });
    }
  }

  /* =========================================================
     6. Preloader: spinner corporativo + puertas que se abren
     ========================================================= */
  function runLoader() {
    const el = $('#loader');
    if (!el) return Promise.resolve();
    const count = $('#loaderCount');
    const bar = $('#loaderBar');
    const state = { p: 0 };
    const render = () => {
      count.textContent = String(Math.round(state.p * 100)).padStart(3, '0');
      bar.style.transform = `scaleX(${state.p})`;
    };

    const minMs = reduce ? 500 : 2600;
    const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const portrait = $('.portrait__img');
    const portraitReady = portrait && !portrait.complete
      ? new Promise((r) => { portrait.addEventListener('load', r, { once: true }); portrait.addEventListener('error', r, { once: true }); })
      : Promise.resolve();
    const minTime = new Promise((r) => setTimeout(r, minMs));
    const maxTime = new Promise((r) => setTimeout(r, 7000));
    const ready = Promise.race([Promise.all([loaded, fonts, portraitReady, minTime]), maxTime]);

    if (!canMotion) {
      return ready.then(() => new Promise((resolve) => {
        el.style.transition = 'opacity .5s ease';
        el.style.opacity = '0';
        setTimeout(() => { el.remove(); root.classList.remove('is-loading'); resolve(); }, 520);
      }));
    }

    const { gsap } = window;
    const sim = gsap.to(state, { p: 0.9, duration: (minMs / 1000) * 1.05, ease: 'power2.out', onUpdate: render });

    return ready.then(() => new Promise((resolve) => {
      sim.kill();
      gsap.to(state, {
        p: 1, duration: 0.55, ease: 'power2.inOut', onUpdate: render,
        onComplete: () => {
          window.ScrollTrigger.refresh();
          const tl = gsap.timeline({ onComplete: () => { el.remove(); } });
          tl.to('.loader__core', { opacity: 0, y: -14, duration: 0.55, ease: 'power2.in', delay: 0.2 })
            .to('.loader__door--l', { xPercent: -101, duration: 1.2, ease: 'expo.inOut' }, '>-0.05')
            .to('.loader__door--r', { xPercent: 101, duration: 1.2, ease: 'expo.inOut' }, '<')
            .call(() => { root.classList.remove('is-loading'); resolve(); }, null, '-=0.85');
        },
      });
    }));
  }

  /* =========================================================
     7. Estados iniciales (se aplican mientras el preloader cubre la página)
     ========================================================= */
  function setInitialStates() {
    const { gsap } = window;
    gsap.set('.site-header__bar', { opacity: 0, y: -20 });
    gsap.set('.hero__eyebrow', { opacity: 0, y: 20 });
    gsap.set('.hero__title .wi', { yPercent: 118 });
    gsap.set(['.hero__lead', '.hero__actions .btn'], { opacity: 0, y: 28 });
    gsap.set('.portrait__plate', { opacity: 0, yPercent: 6 });
    gsap.set('.portrait__frame', { scaleY: 0, transformOrigin: '50% 100%' });
    gsap.set('.portrait__img', { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.08, transformOrigin: '50% 100%' });
    gsap.set('.portrait__caption', { opacity: 0, x: -30 });
    gsap.set(['.hero__bg-wrap', '.hero__diamond', '.hero__watermark', '#particles'], { opacity: 0 });
  }

  /* =========================================================
     8. Entrada del hero (narrativa: marca, promesa, acción, persona)
     ========================================================= */
  function heroIntro() {
    const { gsap } = window;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero__bg-wrap', { opacity: 1, duration: 2.4, ease: 'power2.out' }, 0)
      .to('.hero__diamond', { opacity: 1, duration: 2.6, stagger: 0.3 }, 0.1)
      .to('.hero__watermark', { opacity: 1, duration: 2.6 }, 0.2)
      .to('#particles', { opacity: 1, duration: 2.2 }, 0.3)
      .to('.site-header__bar', { opacity: 1, y: 0, duration: 1.2 }, 0.2)
      .to('.hero__eyebrow', { opacity: 1, y: 0, duration: 1.1 }, 0.25)
      .from('.hero__eyebrow .eyebrow__line', { scaleX: 0, duration: 1.3 }, 0.3)
      .to('.hero__title .wi', { yPercent: 0, duration: 1.45, stagger: 0.075 }, 0.35)
      .to('.hero__lead', { opacity: 1, y: 0, duration: 1.2 }, 0.9)
      .to('.hero__actions .btn', { opacity: 1, y: 0, duration: 1.1, stagger: 0.12 }, 1.05)
      .to('.portrait__plate', { opacity: 1, yPercent: 0, duration: 1.6 }, 0.3)
      .to('.portrait__frame', { scaleY: 1, duration: 1.7, ease: 'expo.inOut' }, 0.35)
      .to('.portrait__img', { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.9, onComplete: () => gsap.set('.portrait__img', { clearProps: 'clipPath' }) }, 0.55)
      .to('.portrait__caption', { opacity: 1, x: 0, duration: 1.3 }, 1.35)
      .call(() => { const w = $('#waFloat'); if (w) w.classList.add('is-visible'); }, null, 1.8);
  }

  /* =========================================================
     9. Hero: parallax con el scroll y con el puntero
     ========================================================= */
  function initHeroMotion() {
    const { gsap } = window;
    const scrub = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__copy', { y: -70, opacity: 0.12, ease: 'none', scrollTrigger: scrub });
    gsap.to('.hero__bg-wrap', { yPercent: 16, scale: 1.08, ease: 'none', scrollTrigger: scrub });
    gsap.to('.hero__watermark', { yPercent: -18, ease: 'none', scrollTrigger: scrub });
    gsap.to('.portrait', { y: 50, ease: 'none', scrollTrigger: scrub });

    if (!finePointer) return;
    const hero = $('.hero');
    const glow = $('#heroGlow');
    const gx = gsap.quickTo(glow, 'x', { duration: 0.9, ease: 'power3' });
    const gy = gsap.quickTo(glow, 'y', { duration: 0.9, ease: 'power3' });
    const layers = [['.portrait__img', 10], ['.portrait__frame', -16], ['.portrait__plate', -7], ['.portrait__caption', 20], ['.hero__watermark', -18]]
      .map(([sel, amt]) => { const el = $(sel); return el ? { amt, x: gsap.quickTo(el, 'x', { duration: 1.3, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: 1.3, ease: 'power3' }) } : null; })
      .filter(Boolean);

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach((l) => { l.x(nx * l.amt); l.y(ny * l.amt); });
      gx(e.clientX - r.left); gy(e.clientY - r.top);
      gsap.to(glow, { opacity: 1, duration: 0.8, overwrite: 'auto' });
    });
    hero.addEventListener('pointerleave', () => {
      layers.forEach((l) => { l.x(0); l.y(0); });
      gsap.to(glow, { opacity: 0, duration: 1, overwrite: 'auto' });
    });
  }

  /* =========================================================
     10. Partículas doradas (rombos + constelación que reacciona al puntero)
     ========================================================= */
  function initParticles() {
    const canvas = $('#particles');
    const hero = $('.hero');
    if (!canvas || reduce) return;
    const ctx = canvas.getContext('2d');
    let w = 0; let h = 0; let pts = []; let raf = 0; let running = false;
    let mx = -9999; let my = -9999; let pointer = false;
    const rand = (a, b) => a + Math.random() * (b - a);
    const make = () => ({ x: rand(0, w), y: rand(0, h), vx: rand(-0.12, 0.12), vy: rand(-0.34, -0.06), s: rand(1.4, 3.4), a: rand(0.3, 0.95), t: rand(0, 6.28), ts: rand(0.008, 0.025) });
    const LINK = 128; const MLINK = 170;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const base = Math.min(78, Math.max(24, (w * h) / 24000));
      pts = Array.from({ length: Math.round(w < 700 ? base * 0.62 : base) }, make);
    };

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.t += p.ts; p.x += p.vx + Math.sin(p.t) * 0.12; p.y += p.vy;
        if (p.y < -10) { p.y = h + 10; p.x = rand(0, w); }
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (pointer) {
          const dx = p.x - mx; const dy = p.y - my; const d2 = dx * dx + dy * dy;
          if (d2 < 14000) { const d = Math.sqrt(d2) || 1; const f = (1 - d / 118) * 0.9; p.x += (dx / d) * f; p.y += (dy / d) * f; }
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j]; const dx = a.x - b.x; const dy = a.y - b.y; const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            ctx.strokeStyle = `rgba(214,185,125,${(1 - Math.sqrt(d2) / LINK) * 0.2})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (pointer) {
          const dx = a.x - mx; const dy = a.y - my; const d2 = dx * dx + dy * dy;
          if (d2 < MLINK * MLINK) {
            ctx.strokeStyle = `rgba(230,211,166,${(1 - Math.sqrt(d2) / MLINK) * 0.5})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        const tw = 0.55 + 0.45 * Math.sin(p.t * 2);
        ctx.fillStyle = `rgba(230,211,166,${p.a * tw})`;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4); ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    new ResizeObserver(() => resize()).observe(hero);
    new IntersectionObserver(([en]) => (en.isIntersecting && !document.hidden ? start() : stop()), { threshold: 0 }).observe(hero);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (hero.getBoundingClientRect().bottom > 0) start(); });
    if (finePointer) {
      hero.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; pointer = true; });
      hero.addEventListener('pointerleave', () => { pointer = false; });
    }
  }

  /* =========================================================
     11. Botones magnéticos (retroalimentación al acercar el puntero)
     ========================================================= */
  function initMagnetic() {
    if (!finePointer || !canMotion) return;
    const { gsap } = window;
    $$('[data-mag]').forEach((btn) => {
      const x = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'power3' });
      const y = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'power3' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        x((e.clientX - (r.left + r.width / 2)) * 0.18);
        y((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      btn.addEventListener('pointerleave', () => { x(0); y(0); });
    });
  }

  /* =========================================================
     12. Revelados al hacer scroll (por zona, en orden del documento
         para que los pins de ScrollTrigger calculen bien sus posiciones)
     ========================================================= */
  function initReveals(scopes) {
    const { gsap, ScrollTrigger } = window;
    const within = (sel) => scopes.flatMap((s) => $$(sel, s));

    // Titulares palabra por palabra
    within('[data-split]').forEach((h) => {
      if (h.classList.contains('hero__title')) return;
      const words = $$('.wi', h);
      gsap.set(words, { yPercent: 118 });
      ScrollTrigger.create({ trigger: h, start: 'top 88%', once: true, onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: 0.055 }) });
    });

    // Bloques que suben con fundido
    within('[data-reveal]').forEach((el) => {
      const kind = el.dataset.reveal;
      gsap.set(el, { opacity: 0, x: kind === 'left' ? -44 : kind === 'right' ? 44 : 0, y: kind ? (kind === 'left' || kind === 'right' ? 0 : 36) : 36 });
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 1.3, ease: 'expo.out' }) });
    });

    // Listas con cascada
    within('[data-stagger]').forEach((wrap) => {
      const kids = $$('[data-s]', wrap);
      gsap.set(kids, { opacity: 0, y: 44 });
      ScrollTrigger.create({ trigger: wrap, start: 'top 86%', once: true, onEnter: () => gsap.to(kids, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.12 }) });
    });

    // Líneas que se dibujan
    within('[data-line]').forEach((l) => {
      gsap.set(l, { scaleX: 0 });
      ScrollTrigger.create({ trigger: l, start: 'top 92%', once: true, onEnter: () => gsap.to(l, { scaleX: 1, duration: 1.4, ease: 'expo.out' }) });
    });

    // Imágenes con cortina
    within('[data-clip]').forEach((c) => {
      gsap.set(c, { clipPath: 'inset(0% 0% 100% 0%)' });
      ScrollTrigger.create({ trigger: c, start: 'top 85%', once: true, onEnter: () => gsap.to(c, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.7, ease: 'expo.inOut' }) });
    });

    // Parallax interno de imágenes
    within('[data-parallax]').forEach((img) => {
      const amt = parseFloat(img.dataset.parallax) * 100;
      gsap.fromTo(img, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* Despacho: la línea del método se dibuja y cada paso se enciende */
  function initMethod() {
    const { ScrollTrigger } = window;
    const method = $('#method');
    if (!method) return;
    ScrollTrigger.create({ trigger: method, start: 'top 72%', end: 'bottom 62%', scrub: 0.4, onUpdate: (s) => method.style.setProperty('--p', s.progress.toFixed(3)) });
    $$('.method__item', method).forEach((li) => {
      ScrollTrigger.create({ trigger: li, start: 'top 64%', onEnter: () => li.classList.add('is-lit'), onLeaveBack: () => li.classList.remove('is-lit') });
    });
  }

  /* Marquee del lema: velocidad y sentido responden al scroll */
  function initMarquee() {
    const { gsap, ScrollTrigger } = window;
    const track = $('#marqueeTrack');
    if (!track) return;
    const tween = gsap.to(track, { xPercent: -50, ease: 'none', duration: 40, repeat: -1 });
    let target = 1; let cur = 1;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { target = (self.direction || 1) * (1 + Math.min(Math.abs(self.getVelocity()) / 260, 7)); } });
    gsap.ticker.add(() => {
      target += ((target >= 0 ? 1 : -1) - target) * 0.04;
      cur += (target - cur) * 0.1;
      tween.timeScale(cur);
    });
  }

  /* Primeros pasos: scroll horizontal fijado (escritorio) o pila vertical (móvil) */
  function initPasos() {
    const { gsap } = window;
    const mm = gsap.matchMedia();

    mm.add('(min-width: 900px)', () => {
      const sec = $('#primeros-pasos');
      const track = $('#pasosTrack');
      const bar = $('#pasosBar');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const move = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress})`; },
        },
      });
      $$('.paso:not(.paso--intro)', sec).forEach((p) => {
        gsap.from(p.children, { opacity: 0, y: 56, duration: 1.1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: p, containerAnimation: move, start: 'left 88%', toggleActions: 'play none none none' } });
      });
    });

    mm.add('(max-width: 899px)', () => {
      $$('.paso').forEach((p) => {
        gsap.from(p.children, { opacity: 0, y: 44, duration: 1.1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: p, start: 'top 86%', once: true } });
      });
    });
  }

  /* Compliance: la frase se ilumina palabra a palabra con el scroll */
  function initCompliance() {
    const { gsap } = window;
    const scrub = $('.compliance__title .scrub');
    const bgImg = $('.compliance__bg img');
    if (!scrub) return;
    scrub.innerHTML = scrub.textContent.trim().split(/\s+/).map((w) => `<span class="sw">${w}</span>`).join(' ');
    const words = $$('.sw', scrub);
    gsap.set(words, { opacity: 0.16 });
    const total = 0.5 + 0.1 * (words.length - 1);
    const mm = gsap.matchMedia();

    mm.add('(min-width: 900px)', () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: '#compliance', start: 'top top', end: '+=130%', scrub: 0.6, pin: true, anticipatePin: 1 } });
      tl.to(words, { opacity: 1, stagger: 0.1, ease: 'none' }, 0);
      if (bgImg) tl.fromTo(bgImg, { scale: 1.2 }, { scale: 1, ease: 'none', duration: total }, 0);
      tl.from('.compliance__foot', { opacity: 0, y: 40, duration: 0.6, ease: 'power2.out' }, total * 0.7);
    });

    mm.add('(max-width: 899px)', () => {
      gsap.to(words, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: scrub, start: 'top 82%', end: 'bottom 48%', scrub: true } });
    });
  }

  /* =========================================================
     13. Áreas de práctica: acordeón + imagen que cambia
     ========================================================= */
  function initAreas() {
    const items = $$('.area');
    const stages = $$('.stage');
    if (!items.length) return;
    let current = 0; let timer = 0;

    const open = (i) => {
      items.forEach((it, k) => {
        const on = k === i;
        it.classList.toggle('is-open', on);
        $('.area__btn', it).setAttribute('aria-expanded', String(on));
      });
      stages.forEach((s, k) => s.classList.toggle('is-active', k === i));
      current = i;
      if (hasGsap) { clearTimeout(timer); timer = setTimeout(() => window.ScrollTrigger.refresh(), 950); }
    };

    items.forEach((it, i) => {
      $('.area__btn', it).addEventListener('click', () => {
        if (i === current) return;
        // En móvil, el panel anterior se pliega y desplaza el contenido: calculamos la posición final
        const prev = items[current];
        const prevIsAbove = Boolean(prev.compareDocumentPosition(it) & Node.DOCUMENT_POSITION_FOLLOWING);
        const delta = prevIsAbove ? $('.area__inner', prev).offsetHeight : 0;
        const y = it.getBoundingClientRect().top + window.scrollY - delta - HEADER_H - 12;
        open(i);
        if (window.matchMedia('(max-width: 999px)').matches) scrollToY(y);
      });
    });
  }

  /* =========================================================
     14. Preguntas frecuentes
     ========================================================= */
  function initFaq() {
    const buttons = $$('.qa__q');
    if (!buttons.length) return;
    let timer = 0;
    const set = (btn, open) => {
      btn.setAttribute('aria-expanded', String(open));
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) panel.classList.toggle('is-open', open);
    };
    buttons.forEach((btn) => btn.addEventListener('click', () => {
      const wasOpen = btn.getAttribute('aria-expanded') === 'true';
      buttons.forEach((b) => set(b, false));
      if (!wasOpen) set(btn, true);
      if (hasGsap) { clearTimeout(timer); timer = setTimeout(() => window.ScrollTrigger.refresh(), 800); }
    }));
    set(buttons[0], true);
  }

  /* =========================================================
     15. Formulario: validación inline y envío a WhatsApp
     ========================================================= */
  function initForm() {
    const form = $('#contactForm');
    if (!form) return;
    const note = $('#formNote');
    const submit = $('#formSubmit');
    const defaultNote = note.textContent;

    const rules = {
      nombre: (v) => (v.trim().length >= 3 ? '' : 'Escribe tu nombre completo.'),
      telefono: (v) => (v.replace(/\D/g, '').length >= 10 ? '' : 'Escribe un teléfono de al menos 10 dígitos.'),
      area: (v) => (v ? '' : 'Selecciona el tema de tu consulta.'),
    };
    const check = (name) => {
      const input = form.elements[name];
      const field = input.closest('.field');
      const err = $('.field__error', field);
      const msg = rules[name](input.value);
      field.classList.toggle('is-invalid', Boolean(msg));
      input.setAttribute('aria-invalid', String(Boolean(msg)));
      err.textContent = msg;
      return !msg;
    };
    Object.keys(rules).forEach((name) => {
      const input = form.elements[name];
      input.addEventListener('blur', () => check(name));
      input.addEventListener('input', () => { if (input.closest('.field').classList.contains('is-invalid')) check(name); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (form.elements.empresa && form.elements.empresa.value) return; // anti-spam
      const results = Object.keys(rules).map(check);
      if (results.includes(false)) {
        const firstBad = Object.keys(rules).find((n) => form.elements[n].closest('.field').classList.contains('is-invalid'));
        form.elements[firstBad].focus();
        note.classList.remove('is-ok');
        note.textContent = 'Revisa los campos marcados para continuar.';
        return;
      }
      const nombre = form.elements.nombre.value.trim();
      const tel = form.elements.telefono.value.trim();
      const area = form.elements.area.value;
      const msg = form.elements.mensaje.value.trim();
      const text = [`Hola, soy ${nombre}. Quiero agendar una asesoría sobre: ${area}.`, msg ? `Mi caso: ${msg}` : '', `Mi teléfono: ${tel}`].filter(Boolean).join('\n');

      submit.disabled = true;
      $('span', submit).textContent = 'Abriendo WhatsApp...';
      const win = window.open(waUrl(text), '_blank', 'noopener');
      if (!win) window.location.href = waUrl(text);
      note.classList.add('is-ok');
      note.textContent = 'Listo. Abrimos WhatsApp con tu mensaje. Si no se abre, escríbenos al 312 185 11 66.';
      setTimeout(() => {
        submit.disabled = false;
        $('span', submit).textContent = 'Quiero mi asesoría por WhatsApp';
        form.reset();
        note.classList.remove('is-ok');
        note.textContent = defaultNote;
      }, 5200);
    });
  }

  /* =========================================================
     16. Orquestación
     ========================================================= */
  function boot() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);

    hydrateLinks();
    initMenu();
    initAnchors();
    initFaq();
    initForm();
    initAreas();
    initHeader();

    if (!canMotion) {
      root.classList.add('no-gsap');
      runLoader().then(() => { const w = $('#waFloat'); if (w) w.classList.add('is-visible'); });
      return;
    }

    const { gsap, ScrollTrigger } = window;
    ScrollTrigger.config({ ignoreMobileResize: true });
    root.classList.add('is-motion');

    initLenis();
    $$('[data-split]').forEach(splitWords);
    setInitialStates();
    initParticles();

    // Zona 1: todo lo que está antes de las secciones fijadas
    const before = $$('.pillars, .about, .areas, .versus');
    initHeroMotion();
    initReveals(before);
    initMethod();
    initMarquee();
    // Zona 2: secciones fijadas (en orden del documento)
    initPasos();
    initCompliance();
    // Zona 3: lo que sigue
    initReveals($$('.trayectoria, .faq, .contact'));
    initMagnetic();

    window.addEventListener('load', () => { ScrollTrigger.refresh(); setTimeout(() => ScrollTrigger.refresh(), 800); });

    runLoader().then(() => {
      heroIntro();
      if (lenis) lenis.start();
      if (location.hash && $(location.hash)) setTimeout(() => scrollToTarget(location.hash, true), 400);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
