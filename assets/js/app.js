/* ==================================================================
   Guía JSON & YAML — interacción
   Cada bloque init* es independiente y se degrada sin errores si su
   marcado no existe.
   ================================================================== */
(function () {
  'use strict';

  var Guide = window.Guide || {};
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  var ICONS = {
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>'
  };

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* almacenamiento no disponible */ } }
  };

  function debounce(fn, ms) {
    var t;
    return function () { var args = arguments, ctx = this; clearTimeout(t); t = setTimeout(function () { fn.apply(ctx, args); }, ms); };
  }

  function normalize(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  /* ---------- Toasts ---------- */
  function toast(message, type) {
    var host = $('[data-toasts]');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'info' ? ' toast--info' : '');
    el.innerHTML = '<span class="toast__icon">' + (type === 'info' ? ICONS.info : ICONS.check) + '</span>';
    el.appendChild(document.createTextNode(message));
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-leaving');
      el.addEventListener('animationend', function () { el.remove(); }, { once: true });
      setTimeout(function () { el.remove(); }, 600);
    }, type === 'info' ? 5200 : 2200);
  }

  /* ---------- Portapapeles ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      ta.remove();
    });
  }

  function flashButton(btn, label) {
    var original = btn.innerHTML;
    btn.classList.add('is-success');
    btn.innerHTML = (btn.classList.contains('copy-btn') ? ICONS.check : '') + label;
    clearTimeout(btn._flash);
    btn._flash = setTimeout(function () { btn.classList.remove('is-success'); btn.innerHTML = original; }, 1600);
  }

  /* ---------- Tema ---------- */
  function currentTheme() {
    var forced = document.documentElement.getAttribute('data-theme');
    if (forced) return forced;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function setTheme(theme, origin) {
    var root = document.documentElement;
    var apply = function () { root.setAttribute('data-theme', theme); store.set('guide-theme', theme); };

    if (!document.startViewTransition || reduceMotion.matches) { apply(); return; }

    // Revelado circular desde el botón (transición cinematográfica)
    var x = origin ? origin.x : innerWidth / 2, y = origin ? origin.y : 0;
    var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('theme-vt');
    var vt = document.startViewTransition(apply);
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
    vt.finished.finally(function () { root.classList.remove('theme-vt'); });
  }

  function toggleTheme(origin) { setTheme(currentTheme() === 'dark' ? 'light' : 'dark', origin); }

  function initTheme() {
    $$('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var r = btn.getBoundingClientRect();
        toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      });
    });
  }

  /* ---------- Navegación: barra, progreso, sección activa, menú móvil ---------- */
  function initNav() {
    var nav = $('[data-nav]');
    var bar = $('.scroll-progress span');
    var navLinks = $$('[data-nav-link]');
    var tocLinks = $$('[data-toc]');
    var targets = navLinks.map(function (a) { return a.getAttribute('data-nav-link'); })
      .concat(tocLinks.map(function (a) { return a.getAttribute('data-toc'); }))
      .filter(function (id, i, arr) { return arr.indexOf(id) === i; })
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean)
      .sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });

    var ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - innerHeight;
      if (nav) nav.classList.toggle('is-scrolled', y > 8);
      if (bar) bar.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);

      // Sección activa = último destino cuyo inicio ha superado el 35% del viewport
      var line = innerHeight * 0.35, active = null;
      targets.forEach(function (el) { if (el.getBoundingClientRect().top <= line) active = el; });
      var activeIds = [];
      if (active) {
        activeIds.push(active.id);
        // Marca también el capítulo padre
        var chapter = active.closest('section[id]');
        if (chapter && chapter.id !== active.id) activeIds.push(chapter.id);
      }
      navLinks.forEach(function (a) { setCurrent(a, activeIds.indexOf(a.getAttribute('data-nav-link')) > -1); });
      tocLinks.forEach(function (a) { setCurrent(a, activeIds.indexOf(a.getAttribute('data-toc')) > -1); });
    }
    function setCurrent(a, on) { on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); }

    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', debounce(update, 120));
    update();

    // Menú móvil
    var toggle = $('[data-menu-toggle]'), menu = $('[data-mobile-menu]');
    if (!toggle || !menu) return;
    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.hidden = !open;
    }
    toggle.addEventListener('click', function () { setOpen(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); } });
    window.addEventListener('resize', debounce(function () { if (innerWidth > 960) setOpen(false); }, 150));
  }

  /* ---------- Revelado al hacer scroll ---------- */
  function initReveal() {
    var items = $$('.reveal, .timeline');
    if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-visible'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Código: resaltado + botón copiar ---------- */
  function initCode() {
    if (!Guide.highlight) return;
    $$('code[data-lang]').forEach(function (code) {
      if (code.hasAttribute('data-output')) return;
      code.innerHTML = Guide.highlight.highlight(code.textContent, code.getAttribute('data-lang'));
    });

    $$('.code-card').forEach(function (card) {
      var head = $('.code-card__head', card);
      if (!head) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.setAttribute('aria-label', 'Copiar código');
      btn.innerHTML = ICONS.copy + 'Copiar';
      btn.addEventListener('click', function () {
        var visible = $$('pre', card).filter(function (p) { return !p.hidden; })[0];
        if (!visible) return;
        copyText(visible.textContent).then(function () { flashButton(btn, 'Copiado'); }, function () { toast('No se pudo copiar', 'info'); });
      });
      head.appendChild(btn);
    });

    $$('[data-copy-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = $(btn.getAttribute('data-copy-target'));
        if (!target || !target.textContent.trim()) { toast('No hay nada que copiar', 'info'); return; }
        copyText(target.textContent).then(function () { flashButton(btn, '¡Copiado!'); toast('YAML copiado al portapapeles'); });
      });
    });
  }

  /* ---------- Tabs segmentadas (roving tabindex) ---------- */
  function selectTab(tablist, tab, focus) {
    var tabs = $$('[role="tab"]', tablist);
    var index = tabs.indexOf(tab);
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    tablist.style.setProperty('--seg-index', index);
    if (focus) tab.focus();
  }

  function initTabs() {
    $$('.segmented[role="tablist"]').forEach(function (tablist) {
      var tabs = $$('[role="tab"]', tablist);
      tablist.style.setProperty('--seg-count', tabs.length);
      tablist.addEventListener('click', function (e) {
        var tab = e.target.closest('[role="tab"]');
        if (tab) { selectTab(tablist, tab); tablist.dispatchEvent(new CustomEvent('tabchange', { bubbles: true })); }
      });
      tablist.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        var next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        selectTab(tablist, tabs[(next + tabs.length) % tabs.length], true);
        tablist.dispatchEvent(new CustomEvent('tabchange', { bubbles: true }));
      });
    });

    // Ventana del hero: alterna YAML/JSON automáticamente, pausa al interactuar
    var win = $('[data-hero-window]');
    if (!win || reduceMotion.matches) return;
    var list = $('[role="tablist"]', win), tabs = $$('[role="tab"]', win), paused = false, timer;
    function cycle() {
      timer = setTimeout(function () {
        if (!paused && !document.hidden) {
          var current = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; });
          selectTab(list, tabs[(current + 1) % tabs.length]);
        }
        cycle();
      }, 3800);
    }
    win.addEventListener('mouseenter', function () { paused = true; });
    win.addEventListener('mouseleave', function () { paused = false; });
    win.addEventListener('focusin', function () { paused = true; });
    list.addEventListener('tabchange', function () { clearTimeout(timer); paused = true; });
    cycle();
  }

  /* ---------- Spotlight que sigue al cursor ---------- */
  function initSpotlight() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.card--spotlight');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------- Imágenes con skeleton y fallback ---------- */
  function initMedia() {
    $$('[data-skeleton] img').forEach(function (img) {
      var frame = img.closest('[data-skeleton]');
      function done() { frame.classList.remove('is-loading'); img.classList.add('is-loaded'); }
      function fail() {
        frame.classList.remove('is-loading');
        img.remove();
        var p = document.createElement('p');
        p.className = 'media__fallback';
        p.textContent = 'Imagen no disponible: ' + (img.alt || 'recurso externo');
        frame.appendChild(p);
      }
      if (img.complete && img.naturalWidth) { done(); return; }
      if (img.complete) { fail(); return; }
      frame.classList.add('is-loading');
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', fail, { once: true });
    });
  }

  /* ---------- Playground JSON → YAML ---------- */
  var SAMPLES = [
    '{\n  "servicio": "api",\n  "puerto": 8080,\n  "debug": false,\n  "origenes": ["https://ejemplo.com", "http://localhost:3000"],\n  "base_de_datos": {\n    "host": "db.interna",\n    "pool": 10,\n    "credenciales": null\n  }\n}',
    '{\n  "version": "3.9",\n  "services": {\n    "web": {\n      "image": "nginx:alpine",\n      "ports": ["80:80"],\n      "depends_on": ["app"]\n    },\n    "app": {\n      "build": ".",\n      "environment": { "NODE_ENV": "production" }\n    }\n  }\n}'
  ];

  function initPlayground() {
    var root = $('[data-playground]');
    if (!root || !Guide.convert) return;
    var input = $('[data-input]', root), output = $('[data-output]', root), wrap = $('[data-output-wrap]', root);
    var status = $('[data-status]', root), statusText = $('[data-status-text]', root);
    var errorBox = $('[data-error]', root), stats = $('[data-stats]', root), inputPane = input.closest('.pane');
    var sampleIndex = 0, lastData = null, isValid = false;

    function setStatus(state, text) { status.setAttribute('data-state', state); statusText.textContent = text; }

    function run() {
      wrap.classList.remove('is-loading');
      var src = input.value;
      if (!src.trim()) {
        lastData = null; isValid = false;
        setStatus('processing', 'Esperando JSON…');
        output.textContent = ''; stats.textContent = ''; errorBox.hidden = true; inputPane.classList.remove('is-invalid');
        return;
      }
      var result = Guide.convert.convert(src);
      if (result.ok) {
        lastData = result.data; isValid = true;
        setStatus('valid', 'JSON válido');
        errorBox.hidden = true;
        inputPane.classList.remove('is-invalid');
        output.innerHTML = Guide.highlight.yaml(result.yaml);
        var lines = result.yaml.split('\n').length;
        var saved = Math.round((1 - result.yaml.length / src.length) * 100);
        stats.textContent = lines + ' líneas · ' + (saved >= 0 ? '−' + saved : '+' + Math.abs(saved)) + '% caracteres';
      } else {
        lastData = null; isValid = false;
        setStatus('invalid', 'JSON inválido');
        inputPane.classList.add('is-invalid');
        var where = result.position ? 'Línea ' + result.position.line + ', columna ' + result.position.column + ' · ' : '';
        errorBox.textContent = where + (result.position ? result.error.replace(/\s*\(line \d+ column \d+\)|\s+at position \d+/gi, '') : result.error);
        errorBox.hidden = false;
      }
    }

    var schedule = debounce(run, 320);
    input.addEventListener('input', function () {
      setStatus('processing', 'Analizando…');
      wrap.classList.add('is-loading');
      schedule();
    });

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      if (action === 'sample') {
        input.value = SAMPLES[sampleIndex++ % SAMPLES.length];
        run();
        flashButton(btn, 'Cargado');
        return;
      }
      run();
      if (!isValid) { toast('Corrige el JSON antes de ' + (action === 'format' ? 'formatearlo' : 'minificarlo'), 'info'); return; }
      input.value = action === 'format' ? JSON.stringify(lastData, null, 2) : JSON.stringify(lastData);
      run();
      flashButton(btn, action === 'format' ? 'Formateado' : 'Minificado');
    });

    run();
  }

  /* ---------- Quiz ---------- */
  var QUESTIONS = [
    { q: '¿Qué significa el acrónimo YAML?', options: ["YAML Ain't Markup Language", 'Yet Another Modeling Language', 'Your Advanced Markup Logic'], answer: 0, explain: 'Es un acrónimo recursivo: YAML no es un lenguaje de marcado, sino de serialización de datos.' },
    { q: '¿Cómo deben escribirse los nombres de las parejas en un objeto JSON?', options: ['Sin comillas', 'Entre comillas simples', 'Entre comillas dobles'], answer: 2, explain: 'JSON exige comillas dobles en los nombres: {"nombre": "Pepito"}.' },
    { q: '¿Qué carácter inicia un comentario en YAML?', options: ['//', '#', '<!--'], answer: 1, explain: 'El octothorpe (#) inicia comentarios en YAML. JSON, en cambio, no admite comentarios.' },
    { q: '¿Qué define el alcance de las colecciones de bloque en YAML?', options: ['Las llaves { }', 'El punto y coma', 'La sangría'], answer: 2, explain: 'YAML usa la sangría (con espacios) para indicar la jerarquía.' }
  ];

  function initQuiz() {
    var root = $('[data-quiz]');
    if (!root) return;
    var body = $('[data-quiz-body]', root), bar = $('[data-quiz-bar]', root);
    var index = 0, score = 0;
    var LETTERS = ['A', 'B', 'C', 'D'];

    function progress(v) { bar.style.setProperty('--p', v); }

    function render() {
      progress(index / QUESTIONS.length);
      var item = QUESTIONS[index];
      var html = '<div class="quiz__step">' +
        '<p class="quiz__meta">Pregunta ' + (index + 1) + ' de ' + QUESTIONS.length + '</p>' +
        '<h3 class="quiz__question" id="quiz-q" tabindex="-1">' + Guide.highlight.escape(item.q) + '</h3>' +
        '<div class="quiz__options" role="group" aria-labelledby="quiz-q">' +
        item.options.map(function (opt, i) {
          return '<button type="button" class="quiz__option" data-option="' + i + '"><span class="quiz__letter" aria-hidden="true">' + LETTERS[i] + '</span>' + Guide.highlight.escape(opt) + '</button>';
        }).join('') +
        '</div><div data-quiz-feedback aria-live="polite"></div></div>';
      body.innerHTML = html;
    }

    function answer(btn) {
      var item = QUESTIONS[index], chosen = +btn.getAttribute('data-option'), correct = chosen === item.answer;
      if (correct) score++;
      $$('.quiz__option', body).forEach(function (b) {
        b.disabled = true;
        if (+b.getAttribute('data-option') === item.answer) b.classList.add('is-correct');
      });
      if (!correct) btn.classList.add('is-wrong');
      progress((index + 1) / QUESTIONS.length);
      var last = index === QUESTIONS.length - 1;
      $('[data-quiz-feedback]', body).innerHTML =
        '<p class="quiz__feedback"><strong>' + (correct ? '¡Correcto! ' : 'No exactamente. ') + '</strong>' + Guide.highlight.escape(item.explain) + '</p>' +
        '<div class="quiz__footer"><button type="button" class="btn btn--primary" data-quiz-next>' + (last ? 'Ver resultado' : 'Siguiente') +
        ' <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>';
      $('[data-quiz-next]', body).focus({ preventScroll: true });
    }

    function result() {
      progress(1);
      var msg = score === QUESTIONS.length ? '¡Perfecto! Dominas lo esencial de JSON y YAML.' : score >= QUESTIONS.length / 2 ? 'Buen trabajo. Repasa las secciones donde fallaste.' : 'Vuelve a leer la guía y prueba de nuevo.';
      body.innerHTML = '<div class="quiz__step quiz__result">' +
        '<p class="quiz__meta">Resultado</p>' +
        '<p class="quiz__score text-gradient" tabindex="-1">' + score + '/' + QUESTIONS.length + '</p>' +
        '<p>' + msg + '</p>' +
        '<button type="button" class="btn btn--secondary" data-quiz-retry>Repetir el quiz</button></div>';
      $('.quiz__score', body).focus({ preventScroll: true });
      if (score === QUESTIONS.length) toast('¡Puntuación perfecta!');
    }

    body.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-option]');
      if (opt && !opt.disabled) { answer(opt); return; }
      if (e.target.closest('[data-quiz-next]')) {
        index++;
        if (index < QUESTIONS.length) { render(); $('#quiz-q', body).focus({ preventScroll: true }); } else result();
        return;
      }
      if (e.target.closest('[data-quiz-retry]')) { index = 0; score = 0; render(); $('#quiz-q', body).focus({ preventScroll: true }); }
    });

    render();
  }

  /* ---------- Command palette (Ctrl/⌘ + K) ---------- */
  function initPalette() {
    var root = $('[data-palette]');
    if (!root) return;
    var input = $('[data-palette-input]', root), list = $('[data-palette-list]', root);
    var lastFocus = null, results = [], active = 0;

    var ITEMS = [
      { group: 'Secciones', label: 'Empieza aquí', icon: '01', href: '#ruta', keys: 'inicio onboarding ruta pasos' },
      { group: 'Secciones', label: 'YAML', icon: 'Y', href: '#yaml', keys: 'yaml introduccion clark evans' },
      { group: 'Secciones', label: 'Historia y versiones de YAML', icon: 'Y', href: '#yaml-historia', keys: 'timeline 1.0 1.1 1.2' },
      { group: 'Secciones', label: 'Colecciones YAML', icon: 'Y', href: '#yaml-colecciones', keys: 'secuencias mapas comentarios sangria' },
      { group: 'Secciones', label: 'JSON', icon: '{}', href: '#json', keys: 'json javascript object notation' },
      { group: 'Secciones', label: 'Reglas sintácticas de JSON', icon: '{}', href: '#json-reglas', keys: 'arrays objetos matrices' },
      { group: 'Secciones', label: 'Tipos de datos JSON', icon: '{}', href: '#json-tipos', keys: 'string number boolean null' },
      { group: 'Secciones', label: 'Ejemplos prácticos de JSON', icon: '{}', href: '#json-ejemplos', keys: 'pepito conejo ana' },
      { group: 'Secciones', label: 'Comparativa YAML vs JSON', icon: '⇄', href: '#comparativa', keys: 'diferencias tabla' },
      { group: 'Secciones', label: 'Playground: conversor JSON → YAML', icon: '▶', href: '#playground', keys: 'convertir conversor editor' },
      { group: 'Secciones', label: 'Quiz de autoevaluación', icon: '?', href: '#quiz', keys: 'test preguntas examen' },
      { group: 'Secciones', label: 'Chuleta / referencia rápida', icon: '≡', href: '#chuleta', keys: 'cheatsheet resumen' },
      { group: 'Acciones', label: 'Cambiar tema claro/oscuro', icon: '◐', run: function () { toggleTheme(); }, keys: 'dark light modo tema' },
      { group: 'Acciones', label: 'Copiar enlace a la guía', icon: '⧉', run: function () { copyText(location.href.split('#')[0]).then(function () { toast('Enlace copiado'); }); }, keys: 'url compartir link' },
      { group: 'Acciones', label: 'Volver arriba', icon: '↑', href: '#inicio', keys: 'top inicio' }
    ];

    function filter(q) {
      var n = normalize(q.trim());
      return ITEMS.filter(function (it) { return !n || normalize(it.label + ' ' + it.keys).indexOf(n) > -1; });
    }

    function render() {
      results = filter(input.value);
      active = Math.min(active, Math.max(results.length - 1, 0));
      if (!results.length) {
        list.innerHTML = '<li class="palette__empty" role="presentation">Sin resultados para “' + Guide.highlight.escape(input.value) + '”</li>';
        input.removeAttribute('aria-activedescendant');
        return;
      }
      var html = '', group = null;
      results.forEach(function (it, i) {
        if (it.group !== group) { group = it.group; html += '<li class="palette__group" role="presentation">' + group + '</li>'; }
        html += '<li class="palette__item" role="option" id="pal-' + i + '" data-index="' + i + '" aria-selected="' + (i === active) + '">' +
          '<span class="palette__item-icon" aria-hidden="true">' + it.icon + '</span>' + Guide.highlight.escape(it.label) +
          (it.href ? '<span class="palette__item-hint">Ir</span>' : '<span class="palette__item-hint">Acción</span>') + '</li>';
      });
      list.innerHTML = html;
      input.setAttribute('aria-activedescendant', 'pal-' + active);
      var el = document.getElementById('pal-' + active);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }

    function open() {
      if (!root.hidden) return;
      lastFocus = document.activeElement;
      root.hidden = false; root.classList.remove('is-closing');
      input.value = ''; active = 0; render();
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { input.focus(); });
    }

    function close(restore) {
      if (root.hidden) return;
      root.classList.add('is-closing');
      document.body.style.overflow = '';
      setTimeout(function () { root.hidden = true; root.classList.remove('is-closing'); }, reduceMotion.matches ? 0 : 150);
      if (restore !== false && lastFocus) lastFocus.focus({ preventScroll: true });
    }

    function execute(item) {
      if (!item) return;
      close(!item.href);
      if (item.href) {
        var target = document.querySelector(item.href);
        history.pushState(null, '', item.href);
        if (target) {
          target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
          var focusable = target.matches('section, article, div') ? target : null;
          if (focusable) { focusable.setAttribute('tabindex', '-1'); focusable.focus({ preventScroll: true }); }
        }
      } else {
        item.run();
      }
    }

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); root.hidden ? open() : close(); return; }
      if (e.key === '/' && root.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
    });
    $$('[data-palette-open]').forEach(function (b) { b.addEventListener('click', open); });
    $$('[data-palette-close]', root).forEach(function (b) { b.addEventListener('click', function () { close(); }); });

    input.addEventListener('input', function () { active = 0; render(); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (results.length) { active = (active + 1) % results.length; render(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (results.length) { active = (active - 1 + results.length) % results.length; render(); } }
      else if (e.key === 'Enter') { e.preventDefault(); execute(results[active]); }
      else if (e.key === 'Tab') { e.preventDefault(); input.focus(); } // focus trap: el input es el único control
    });
    list.addEventListener('mousemove', function (e) {
      var li = e.target.closest('[data-index]');
      if (li && +li.getAttribute('data-index') !== active) { active = +li.getAttribute('data-index'); render(); }
    });
    list.addEventListener('click', function (e) {
      var li = e.target.closest('[data-index]');
      if (li) execute(results[+li.getAttribute('data-index')]);
    });
  }

  /* ---------- Onboarding: pista en la primera visita ---------- */
  function initOnboarding() {
    if (isMac) $$('[data-kbd-mod]').forEach(function (k) { k.textContent = '⌘'; });
    if (store.get('guide-onboarded')) return;
    setTimeout(function () {
      toast('Consejo: pulsa ' + (isMac ? '⌘' : 'Ctrl') + ' + K para buscar en la guía', 'info');
      store.set('guide-onboarded', '1');
    }, 2500);
  }

  function init() {
    initTheme();
    initCode();
    initTabs();
    initNav();
    initReveal();
    initSpotlight();
    initMedia();
    initPlayground();
    initQuiz();
    initPalette();
    initOnboarding();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
