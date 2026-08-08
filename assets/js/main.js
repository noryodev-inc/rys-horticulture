/* ==========================================================================
   RYS Horticulture — interakcije
   Bez vanjskih biblioteka. Pokret je vođen oprugama: svaka animacija kreće
   od trenutne vrijednosti na ekranu, preuzima brzinu geste i može se
   prekinuti i preusmjeriti u bilo kojem trenutku.
   ========================================================================== */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
     1. Opruga  (Appleovi parametri: response + damping ratio)
        a = -ω²(x - target) - 2ζω·v     gdje je  ω = 2π / response
     ---------------------------------------------------------------------- */
  const ticking = new Set();
  let rafId = null;
  let lastT = 0;

  function tick(now) {
    const dt = Math.min((now - lastT) / 1000, 1 / 20); // ograniči skok nakon pauze
    lastT = now;
    for (const s of ticking) s._advance(dt);
    rafId = ticking.size ? requestAnimationFrame(tick) : null;
  }

  function startTicking(s) {
    ticking.add(s);
    if (rafId === null) { lastT = performance.now(); rafId = requestAnimationFrame(tick); }
  }

  class Spring {
    constructor({ from = 0, response = 0.4, damping = 1, onUpdate, onRest } = {}) {
      this.value = from;
      this.target = from;
      this.velocity = 0;
      this.response = response;
      this.damping = damping;
      this.onUpdate = onUpdate;
      this.onRest = onRest;
      this.resting = true;
    }

    /* Prekid: cilj se mijenja, trenutna vrijednost i brzina se zadržavaju.
       Nema skoka jer krećemo od onoga što je na ekranu. */
    to(target, { velocity, response, damping } = {}) {
      this.target = target;
      if (velocity !== undefined) this.velocity = velocity;
      if (response !== undefined) this.response = response;
      if (damping !== undefined) this.damping = damping;

      if (reduceMotion.matches) { this.set(target); return this; }

      if (this.resting) { this.resting = false; startTicking(this); }
      return this;
    }

    /* Tvrdo postavljanje — koristi se dok prst vuče (1:1 praćenje). */
    set(value, velocity = 0) {
      this.value = value;
      this.target = value;
      this.velocity = velocity;
      this._emit();
      this._rest();
      return this;
    }

    /* Vrijednost se mijenja bez zaustavljanja opruge (za praćenje geste). */
    track(value, velocity = 0) {
      this.stop();
      this.value = value;
      this.velocity = velocity;
      this._emit();
      return this;
    }

    stop() {
      if (!this.resting) { ticking.delete(this); this.resting = true; }
      return this;
    }

    _rest() {
      if (this.resting) return;
      ticking.delete(this);
      this.resting = true;
      this.onRest && this.onRest(this.value);
    }

    _emit() { this.onUpdate && this.onUpdate(this.value, this.velocity); }

    _advance(dt) {
      const omega = (2 * Math.PI) / this.response;
      const zeta = this.damping;
      // Fiksni pod-korak drži integraciju stabilnom neovisno o frame rateu
      const step = 1 / 240;
      let remaining = dt;
      while (remaining > 0) {
        const h = Math.min(step, remaining);
        remaining -= h;
        const a = -omega * omega * (this.value - this.target) - 2 * zeta * omega * this.velocity;
        this.velocity += a * h;
        this.value += this.velocity * h;
      }
      this._emit();
      if (Math.abs(this.value - this.target) < 0.0015 && Math.abs(this.velocity) < 0.02) {
        this.value = this.target;
        this.velocity = 0;
        this._emit();
        this._rest();
      }
    }
  }

  /* Projekcija zamaha — kamo gesta *ide*, ne gdje je puštena.
     Ista eksponencijalna funkcija koju koristi iOS scroll deceleration. */
  const project = (velocity, deceleration = 0.998) =>
    (velocity / 1000) * deceleration / (1 - deceleration);

  /* Gumeni rub — otpor raste što se dalje povuče preko granice */
  const rubberband = (overshoot, dimension, c = 0.55) =>
    (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));

  /* Prati zadnjih nekoliko točaka da bismo pri otpuštanju imali stvarnu brzinu */
  function VelocityTracker() {
    const hist = [];
    return {
      add(v) {
        hist.push({ v, t: performance.now() });
        while (hist.length > 6) hist.shift();
      },
      reset() { hist.length = 0; },
      get() {
        if (hist.length < 2) return 0;
        const last = hist[hist.length - 1];
        let first = hist[0];
        for (let i = hist.length - 1; i >= 0; i--) {
          if (last.t - hist[i].t > 30) { first = hist[i]; break; }
        }
        const dt = (last.t - first.t) / 1000;
        return dt > 0 ? (last.v - first.v) / dt : 0;
      }
    };
  }

  /* ------------------------------------------------------------------------
     2. Odziv na pritisak — trenutan, na pointerdown, ne na klik
     ---------------------------------------------------------------------- */
  const pressSelector = '.btn, .nav-toggle, .shot, .lightbox__close, .lightbox__nav, .sheet__close';
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest(pressSelector);
    if (!el || el.classList.contains('shot--empty')) return;
    el.setAttribute('data-pressed', '');
    const release = () => {
      el.removeAttribute('data-pressed');
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  }, { passive: true });

  /* ------------------------------------------------------------------------
     3. Zaglavlje — rubni efekt pri skrolu (materijal postaje gušći)
     ---------------------------------------------------------------------- */
  const header = document.querySelector('.header');
  if (header) {
    let scrolled = null;
    const onScroll = () => {
      const next = window.scrollY > 12;
      if (next === scrolled) return;
      scrolled = next;
      header.toggleAttribute('data-scrolled', next);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------------
     4. Ulazak sadržaja u vidno polje
     ---------------------------------------------------------------------- */
  const revealables = document.querySelectorAll('[data-reveal]');
  if (revealables.length) {
    if (!('IntersectionObserver' in window)) {
      revealables.forEach((el) => el.setAttribute('data-shown', ''));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute('data-shown', '');
          io.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealables.forEach((el) => io.observe(el));
    }
  }

  /* ------------------------------------------------------------------------
     5. Mobilna ladica — ulazi i izlazi istim putem, može se povući prstom
     ---------------------------------------------------------------------- */
  const sheet = document.querySelector('.sheet');
  const scrim = document.querySelector('.sheet-scrim');
  const toggle = document.querySelector('.nav-toggle');

  if (sheet && scrim && toggle) {
    let width = sheet.getBoundingClientRect().width || 320;
    let isOpen = false;
    let lastFocused = null;

    const render = (x) => {
      const p = 1 - Math.min(Math.max(x / width, 0), 1); // 0 zatvoreno → 1 otvoreno
      sheet.style.transform = `translate3d(${x}px,0,0)`;
      scrim.style.opacity = String(p);
    };

    const spring = new Spring({
      from: width,
      response: 0.34,
      damping: 1,
      onUpdate: render,
      onRest: (v) => {
        if (v >= width - 0.5) {
          sheet.removeAttribute('data-open');
          scrim.removeAttribute('data-open');
          document.body.classList.remove('is-locked');
          if (lastFocused) { lastFocused.focus(); lastFocused = null; }
        }
      }
    });
    render(width);

    function open() {
      if (isOpen) return;
      isOpen = true;
      width = sheet.getBoundingClientRect().width || width;
      lastFocused = document.activeElement;
      sheet.setAttribute('data-open', '');
      scrim.setAttribute('data-open', '');
      document.body.classList.add('is-locked');
      toggle.setAttribute('aria-expanded', 'true');
      spring.to(0, { damping: 0.86, response: 0.34 });
      requestAnimationFrame(() => {
        const first = sheet.querySelector('a, button');
        first && first.focus({ preventScroll: true });
      });
    }

    function close(velocity = 0) {
      if (!isOpen) return;
      isOpen = false;
      toggle.setAttribute('aria-expanded', 'false');
      spring.to(width, { velocity, damping: 1, response: 0.3 });
    }

    toggle.addEventListener('click', () => (isOpen ? close() : open()));
    scrim.addEventListener('click', () => close());
    sheet.querySelector('.sheet__close').addEventListener('click', () => close());
    sheet.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => close()));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) close();
      if (e.key !== 'Tab' || !isOpen) return;
      const items = [...sheet.querySelectorAll('a, button')].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* Povlačenje prstom — 1:1 praćenje, gumeni rub, predaja brzine */
    let dragging = false, startX = 0, startVal = 0, pointerId = null;
    const tracker = VelocityTracker();

    sheet.addEventListener('pointerdown', (e) => {
      if (!isOpen || e.pointerType === 'mouse') return;
      if (e.target.closest('a, button')) { /* i dalje dopusti povlačenje */ }
      dragging = true;
      pointerId = e.pointerId;
      startX = e.clientX;
      startVal = spring.value;
      spring.stop();
      tracker.reset();
      tracker.add(e.clientX);
    }, { passive: true });

    sheet.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      let next = startVal + (e.clientX - startX);
      if (next < 0) next = -rubberband(-next, width); // otpor kod povlačenja preko ruba
      tracker.add(e.clientX);
      spring.track(next);
    }, { passive: true });

    const endDrag = (e) => {
      if (!dragging || (e && e.pointerId !== pointerId)) return;
      dragging = false;
      const v = tracker.get();
      const projected = spring.value + project(v);
      // Odluka po *smjeru* i projekciji zamaha, ne po goloj poziciji
      if (projected > width * 0.4) close(v);
      else { isOpen = true; spring.to(0, { velocity: v, damping: 0.86, response: 0.34 }); }
    };
    sheet.addEventListener('pointerup', endDrag, { passive: true });
    sheet.addEventListener('pointercancel', endDrag, { passive: true });

    window.addEventListener('resize', () => {
      width = sheet.getBoundingClientRect().width || width;
      if (!isOpen) spring.set(width);
    });
  }

  /* ------------------------------------------------------------------------
     6. Lightbox galerije — listanje prstom, povlačenje prema dolje zatvara
     ---------------------------------------------------------------------- */
  const shots = [...document.querySelectorAll('.shot[data-full]')];
  const lightbox = document.querySelector('.lightbox');

  if (shots.length && lightbox) {
    const stage = lightbox.querySelector('.lightbox__stage');
    const track = lightbox.querySelector('.lightbox__track');
    const counter = lightbox.querySelector('[data-lb-counter]');
    const caption = lightbox.querySelector('[data-lb-caption]');
    const btnPrev = lightbox.querySelector('[data-lb-prev]');
    const btnNext = lightbox.querySelector('[data-lb-next]');
    const btnClose = lightbox.querySelector('.lightbox__close');

    const items = shots.map((el) => ({
      src: el.dataset.full,
      alt: el.querySelector('img') ? el.querySelector('img').alt : '',
      caption: el.dataset.caption || ''
    }));

    track.innerHTML = items.map((it) => `
      <div class="lightbox__slide"><img src="${it.src}" alt="${it.alt.replace(/"/g, '&quot;')}" draggable="false"></div>
    `).join('');

    let index = 0;
    let stageW = 0;
    let open = false;
    let returnFocus = null;

    /* Opruge samo za ono što prst doista vuče; prozirnost ide preko CSS-a. */
    const x = new Spring({ response: 0.4, damping: 1, onUpdate: render });
    const y = new Spring({ response: 0.34, damping: 1, onUpdate: render });

    function render() {
      const dismiss = Math.min(Math.abs(y.value) / 260, 1);
      const scale = 1 - dismiss * 0.14;
      track.style.transform = `translate3d(${x.value}px, ${y.value}px, 0) scale(${scale})`;
      lightbox.style.setProperty('--dismiss', dismiss.toFixed(4));
    }

    function measure() {
      const w = stage.getBoundingClientRect().width;
      stageW = w > 1 ? w : (window.innerWidth || 1);
    }

    function syncMeta() {
      counter.textContent = `${index + 1} / ${items.length}`;
      caption.textContent = items[index].caption;
      btnPrev.disabled = index === 0;
      btnNext.disabled = index === items.length - 1;
    }

    function goTo(i, velocity = 0) {
      index = Math.min(Math.max(i, 0), items.length - 1);
      syncMeta();
      // Zamah je prethodio — mali overshoot je ovdje prirodan
      x.to(-index * stageW, { velocity, damping: velocity ? 0.82 : 1, response: 0.4 });
    }

    function openAt(i, source) {
      open = true;
      returnFocus = source || document.activeElement;
      document.body.classList.add('is-locked');
      index = Math.min(Math.max(i, 0), items.length - 1);
      syncMeta();
      lightbox.setAttribute('data-open', '');
      measure();                       // izmjeri tek kad je element vidljiv
      x.set(-index * stageW);
      y.set(0);
      render();
      requestAnimationFrame(() => {
        measure();                     // ponovo izmjeri kad je raspored gotov
        x.set(-index * stageW);
        render();
        btnClose.focus({ preventScroll: true });
      });
    }

    function closeLb() {
      if (!open) return;
      open = false;
      lightbox.removeAttribute('data-open');
      lightbox.removeAttribute('data-dragging');
      document.body.classList.remove('is-locked');
      x.stop(); y.stop();
      // Ne vraćaj kadar na mjesto dok se sloj još gasi
      setTimeout(() => { if (!open) { y.set(0); render(); } }, 320);
      if (returnFocus) { returnFocus.focus({ preventScroll: true }); returnFocus = null; }
    }

    shots.forEach((el, i) => {
      el.addEventListener('click', () => openAt(i, el));
    });

    btnClose.addEventListener('click', () => closeLb());
    btnPrev.addEventListener('click', () => goTo(index - 1));
    btnNext.addEventListener('click', () => goTo(index + 1));

    document.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
      else if (e.key === 'Tab') {
        const items2 = [...lightbox.querySelectorAll('button:not([disabled])')];
        const first = items2[0], last = items2[items2.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    window.addEventListener('resize', () => {
      if (!open) return;
      measure();
      x.set(-index * stageW);
    });

    /* Gesta: prepoznaj obje osi paralelno, pa odluči kad je namjera jasna */
    let drag = null;
    const tx = VelocityTracker();
    const ty = VelocityTracker();

    stage.addEventListener('pointerdown', (e) => {
      if (!open) return;
      stage.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: x.value, y0: y.value, axis: null };
      x.stop(); y.stop();
      lightbox.setAttribute('data-dragging', '');
      tx.reset(); ty.reset();
      tx.add(e.clientX); ty.add(e.clientY);
    });

    stage.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      if (!drag.axis) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; // histereza prije odluke
        drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      tx.add(e.clientX); ty.add(e.clientY);

      if (drag.axis === 'x') {
        let next = drag.x0 + dx;
        const min = -(items.length - 1) * stageW, max = 0;
        if (next > max) next = max + rubberband(next - max, stageW);
        else if (next < min) next = min - rubberband(min - next, stageW);
        x.track(next);
      } else {
        y.track(drag.y0 + dy);
      }
    });

    const endLbDrag = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const axis = drag.axis;
      drag = null;
      lightbox.removeAttribute('data-dragging');
      if (!axis) return;

      if (axis === 'x') {
        const v = tx.get();
        const projected = x.value + project(v);           // gdje bi gesta stala
        const target = Math.round(-projected / stageW);   // najbliži kadar toj točki
        goTo(target, v);
      } else {
        const v = ty.get();
        const projected = y.value + project(v);
        if (Math.abs(projected) > 180) closeLb();
        else y.to(0, { velocity: v, damping: 0.82, response: 0.34 });
      }
    };
    stage.addEventListener('pointerup', endLbDrag);
    stage.addEventListener('pointercancel', endLbDrag);
  }

  /* ------------------------------------------------------------------------
     7. Kontakt obrazac → priprema e-mail poruke
        (statična stranica; za slanje sa servera vidi PLACEHOLDERS.md)
     ---------------------------------------------------------------------- */
  const form = document.querySelector('[data-mail-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const get = (k) => (data.get(k) || '').toString().trim();
      const body = [
        `Ime i prezime: ${get('ime')}`,
        `E-mail: ${get('email')}`,
        `Telefon: ${get('telefon') || 'nije upisan'}`,
        `Usluga: ${get('usluga') || 'nije odabrana'}`,
        `Lokacija: ${get('lokacija') || 'nije upisana'}`,
        '',
        'Poruka:',
        get('poruka')
      ].join('\n');
      const to = form.dataset.mailForm;
      const subject = `Upit s web stranice: ${get('usluga') || 'općenito'}`;
      window.location.href =
        `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const note = form.querySelector('[data-form-status]');
      if (note) note.hidden = false;
    });
  }

  /* ------------------------------------------------------------------------
     8. Kalkulator cijene
     ---------------------------------------------------------------------- */
  const calc = document.querySelector('.calc');
  if (calc) {

    /* ====================================================================
       CJENIK — jedino mjesto koje treba mijenjati. Sve u eurima.

       Pojasevi za travnjak obračunavaju se PROGRESIVNO, kao porezni razredi:
       svaki pojas po svojoj cijeni, ne cijela površina po jednoj. Time cijena
       uvijek raste s površinom. (Ravan obračun po pojasu dao bi pad na
       granicama — 1000 m² = 250 €, a 1001 m² = 200 €.)
       ==================================================================== */
    const CJENIK = {
      travnjak: [
        { do: 1000,     cijena: 0.25 },
        { do: 2000,     cijena: 0.20 },
        { do: 3000,     cijena: 0.15 },
        { do: Infinity, cijena: 0.10 }
      ],
      nagibMnozitelj: 2,          // kosi teren — odnosi se samo na travnjak
      zivica: [                   // €/m dužni, prema visini
        { naziv: 'do 1 m',     cijena: 2 },
        { naziv: '1 do 2 m',   cijena: 4 },
        { naziv: '2 do 3 m',   cijena: 6 },
        { naziv: '3 m i više', cijena: 9 }
      ],
      zone: [                     // PLACEHOLDER: granice zona, ne iznosi
        { naziv: 'Zagreb (grad)',              dolazak: 20 },
        { naziv: 'Okolica Zagreba, do 15 km',  dolazak: 30 },
        { naziv: '15 do 30 km od Zagreba',     dolazak: 40 },
        { naziv: 'Više od 30 km',              dolazak: 50 }
      ]
    };
    /* ================================================================== */

    function cijenaTravnjaka(m2) {
      let ostatak = m2, donja = 0, ukupno = 0;
      for (const p of CJENIK.travnjak) {
        const uPojasu = Math.min(ostatak, p.do - donja);
        if (uPojasu <= 0) break;
        ukupno += uPojasu * p.cijena;
        ostatak -= uPojasu;
        donja = p.do;
      }
      return ukupno;
    }

    const WA_BROJ = '385994105644';

    const rasponPovrsina = calc.querySelector('#povrsina');
    const rasponDuljina = calc.querySelector('#duljina');
    const odabirVisine = calc.querySelector('#visina');
    const odabirZone = calc.querySelector('#zona');
    const prekidacTravnjak = calc.querySelector('#usluga-travnjak');
    const prekidacZivica = calc.querySelector('#usluga-zivica');
    const potvrdaNagib = calc.querySelector('#nagib');

    const karticaTravnjak = calc.querySelector('[data-usluga="travnjak"]');
    const karticaZivica = calc.querySelector('[data-usluga="zivica"]');

    const izlazUkupno = calc.querySelector('[data-out-ukupno]');
    const izlazZona = calc.querySelector('[data-out-zona]');
    const izlazDolazak = calc.querySelector('[data-out-dolazak]');
    const izlazPodzbrojTravnjak = calc.querySelector('[data-podzbroj="travnjak"]');
    const izlazPodzbrojZivica = calc.querySelector('[data-podzbroj="zivica"]');
    const poljaPovrsina = calc.querySelectorAll('[data-out-povrsina]');
    const poljaDuljina = calc.querySelectorAll('[data-out-duljina]');
    const poljaStopaZivice = calc.querySelectorAll('[data-out-stopa-zivice]');
    const waLink = calc.querySelector('[data-wa-link]');
    const izlazPrazno = calc.querySelector('[data-prazno]');

    const redTravnjak = calc.querySelector('[data-red="travnjak"]');
    const redNagib = calc.querySelector('[data-red="nagib"]');
    const redZivica = calc.querySelector('[data-red="zivica"]');
    const redDolazak = calc.querySelector('[data-red="dolazak"]');
    const izlazRedTravnjak = calc.querySelector('[data-out-travnjak]');
    const izlazRedZivica = calc.querySelector('[data-out-zivica]');

    const eur = new Intl.NumberFormat('hr-HR', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0
    });
    const eurTocno = new Intl.NumberFormat('hr-HR', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2
    });
    const broj = new Intl.NumberFormat('hr-HR');

    function izracun() {
      const naTravnjak = prekidacTravnjak.checked;
      const naZivicu = prekidacZivica.checked;
      const nagib = potvrdaNagib.checked;

      const m2 = Number(rasponPovrsina.value);
      const duljina = Number(rasponDuljina.value);
      const visina = CJENIK.zivica[Number(odabirVisine.value)] || CJENIK.zivica[0];
      const zona = CJENIK.zone[Number(odabirZone.value)] || CJENIK.zone[0];

      const osnovicaTravnjak = naTravnjak ? cijenaTravnjaka(m2) : 0;
      const travnjak = nagib ? osnovicaTravnjak * CJENIK.nagibMnozitelj : osnovicaTravnjak;
      const zivica = naZivicu ? duljina * visina.cijena : 0;

      // Dolazak se naplaćuje samo ako je uopće nešto naručeno
      const nesto = naTravnjak || naZivicu;
      const dolazak = nesto ? zona.dolazak : 0;

      return {
        naTravnjak, naZivicu, nagib, m2, duljina, visina, zona,
        osnovicaTravnjak, travnjak, zivica, dolazak, nesto,
        ukupno: travnjak + zivica + dolazak
      };
    }

    /* Ukupan iznos prati klizač oprugom — dok prst vuče, broj se slijeva
       za njim umjesto da poskakuje. Postavljena je na kritično prigušenje
       pa nikad ne prebaci preko konačne vrijednosti. */
    const oprugaIznosa = new Spring({
      response: 0.32,
      damping: 1,
      onUpdate: (v) => { izlazUkupno.textContent = eur.format(Math.round(v)); }
    });

    // ispuna trake klizača (WebKit nema ::-moz-range-progress)
    function ispuna(el) {
      const p = ((el.value - el.min) / (el.max - el.min)) * 100;
      el.style.setProperty('--fill', p + '%');
    }

    function osvjezi(animiraj) {
      const r = izracun();

      poljaPovrsina.forEach((el) => { el.textContent = broj.format(r.m2); });
      poljaDuljina.forEach((el) => { el.textContent = broj.format(r.duljina); });
      poljaStopaZivice.forEach((el) => { el.textContent = eur.format(r.visina.cijena) + '/m'; });

      // Isključena usluga: unosi se onemogućuju, kartica se prigušuje
      karticaTravnjak.toggleAttribute('data-off', !r.naTravnjak);
      karticaZivica.toggleAttribute('data-off', !r.naZivicu);
      rasponPovrsina.disabled = !r.naTravnjak;
      potvrdaNagib.disabled = !r.naTravnjak;
      rasponDuljina.disabled = !r.naZivicu;
      odabirVisine.disabled = !r.naZivicu;

      izlazPodzbrojTravnjak.textContent = r.naTravnjak ? eur.format(Math.round(r.travnjak)) : '';
      izlazPodzbrojZivica.textContent = r.naZivicu ? eur.format(Math.round(r.zivica)) : '';

      // Raščlamba — prikazuje se samo ono što je stvarno naručeno
      redTravnjak.hidden = !r.naTravnjak;
      redNagib.hidden = !(r.naTravnjak && r.nagib);
      redZivica.hidden = !r.naZivicu;
      redDolazak.hidden = !r.nesto;
      izlazPrazno.hidden = r.nesto;

      izlazRedTravnjak.textContent = eur.format(Math.round(r.osnovicaTravnjak));
      izlazRedZivica.textContent = eur.format(Math.round(r.zivica));
      izlazZona.textContent = r.zona.naziv;
      izlazDolazak.textContent = eur.format(r.dolazak);

      waLink.classList.toggle('is-disabled', !r.nesto);
      waLink.setAttribute('aria-disabled', String(!r.nesto));

      ispuna(rasponPovrsina);
      ispuna(rasponDuljina);

      if (animiraj) oprugaIznosa.to(r.ukupno);
      else oprugaIznosa.set(r.ukupno);

      const stavke = [];
      if (r.naTravnjak) {
        stavke.push(`Košnja travnjaka: ${broj.format(r.m2)} m²` + (r.nagib ? ' (kosi teren)' : ''));
      }
      if (r.naZivicu) {
        stavke.push(`Orezivanje živice: ${broj.format(r.duljina)} m, visina ${r.visina.naziv}`);
      }
      const poruka =
        `Pozdrav, zanima me ponuda za uređenje vrta.\n\n` +
        stavke.map((s) => '• ' + s).join('\n') + '\n' +
        `Lokacija: ${r.zona.naziv}\n` +
        `Procjena sa stranice: ${eur.format(Math.round(r.ukupno))}`;
      waLink.href = `https://wa.me/${WA_BROJ}?text=${encodeURIComponent(poruka)}`;
    }

    /* Sažetak za čitače ekrana — samo kad je gesta gotova, ne na svaki pomak */
    const izlazSazetak = calc.querySelector('[data-out-sazetak]');
    function objavi() {
      const r = izracun();
      if (!r.nesto) {
        izlazSazetak.textContent = 'Nijedna usluga nije odabrana.';
        return;
      }
      const dijelovi = [];
      if (r.naTravnjak) dijelovi.push(`travnjak ${broj.format(r.m2)} m²` + (r.nagib ? ', kosi teren' : ''));
      if (r.naZivicu) dijelovi.push(`živica ${broj.format(r.duljina)} m, visina ${r.visina.naziv}`);
      izlazSazetak.textContent =
        `${dijelovi.join('; ')}. ${r.zona.naziv}. Približna cijena ${eur.format(Math.round(r.ukupno))}.`;
    }

    /* Neprekidna povratna informacija tijekom povlačenja, ne tek na kraju */
    [rasponPovrsina, rasponDuljina].forEach((el) => {
      el.addEventListener('input', () => osvjezi(true));
      el.addEventListener('change', objavi);
    });
    [odabirVisine, odabirZone, prekidacTravnjak, prekidacZivica, potvrdaNagib].forEach((el) => {
      el.addEventListener('change', () => { osvjezi(true); objavi(); });
    });

    /* Onemogućen gumb ne smije voditi na WhatsApp */
    waLink.addEventListener('click', (e) => {
      if (waLink.classList.contains('is-disabled')) e.preventDefault();
    });

    osvjezi(false);
    objavi();
  }

  /* Označi trenutnu stranicu u navigaciji ako to nije već učinjeno u HTML-u */
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a, .sheet nav a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href === here) a.setAttribute('aria-current', 'page');
  });
})();
