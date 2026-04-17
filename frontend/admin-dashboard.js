// ============================================================
//  admin-dashboard.js  →  Animaciones e interacciones del
//  apartado "Inicio" del panel de administrador
//  ────────────────────────────────────────────────────────────
//  INSTRUCCIÓN: Coloca este archivo como:
//    <script src="admin-dashboard.js" defer></script>
//  al final de tu <body> o en tu <head> con defer.
//  No depende de frameworks externos.
// ============================================================

(function () {
    'use strict';
  
    /* ──────────────────────────────────────────────
       UTILIDADES
    ────────────────────────────────────────────── */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  
    const easeOut = t => 1 - Math.pow(1 - t, 3);
  
    /* ──────────────────────────────────────────────
       1. FECHA DE HOY
    ────────────────────────────────────────────── */
    function initDate () {
      const el = $('#dash-today-date');
      if (!el) return;
      const now = new Date();
      el.textContent = now.toLocaleDateString('es-ES', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
      });
    }
  
    /* ──────────────────────────────────────────────
       2. CONTADORES ANIMADOS
    ────────────────────────────────────────────── */
    function animateCounter (el, target, prefix = '', suffix = '') {
      const duration = 1800;
      const start    = performance.now();
      const fmt = n => {
        if (n >= 1_000_000) return prefix + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M' + suffix;
        if (n >= 1_000)     return prefix + n.toLocaleString('es-ES') + suffix;
        return prefix + n + suffix;
      };
      function step (now) {
        const t = Math.min((now - start) / duration, 1);
        el.textContent = fmt(Math.round(easeOut(t) * target));
        if (t < 1) requestAnimationFrame(step);
        else        el.textContent = fmt(target);
      }
      requestAnimationFrame(step);
    }
  
    function initCounters () {
      $$('[data-counter]').forEach(el => {
        const target = parseInt(el.dataset.counter, 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        // Dispara cuando el elemento es visible
        const obs = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            animateCounter(el, target, prefix, suffix);
            obs.disconnect();
          }
        }, { threshold: 0.3 });
        obs.observe(el);
      });
    }
  
    /* ──────────────────────────────────────────────
       3. GAUGE (semicírculo - objetivo trimestral)
    ────────────────────────────────────────────── */
    function drawGauge (canvas, value) {
      const ctx  = canvas.getContext('2d');
      const W    = canvas.width;
      const H    = canvas.height;
      const cx   = W / 2;
      const cy   = H * 0.95;
      const r    = W * 0.42;
      const start = Math.PI;
      const end   = Math.PI + (Math.PI * value / 100);
  
      ctx.clearRect(0, 0, W, H);
  
      // Track
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      ctx.lineWidth   = 7;
      ctx.lineCap     = 'round';
      ctx.stroke();
  
      // Fill animado
      function animate (progress) {
        const currentEnd = Math.PI + (Math.PI * value / 100) * progress;
        ctx.clearRect(0, 0, W, H);
  
        // Track
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,.08)';
        ctx.lineWidth   = 7;
        ctx.lineCap     = 'round';
        ctx.stroke();
  
        // Filled arc
        const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
        grad.addColorStop(0,   '#1e6b1e');
        grad.addColorStop(1,   '#3dba3d');
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, currentEnd);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 7;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }
  
      const dur   = 1400;
      const t0    = performance.now();
      const obs   = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        (function tick (now) {
          const p = Math.min(easeOut((now - t0) / dur), 1);
          animate(p);
          if (p < 1) requestAnimationFrame(tick);
        })(performance.now());
      }, { threshold: 0.3 });
      obs.observe(canvas);
    }
  
    function initGauge () {
      const canvas = $('#dash-gauge-canvas');
      if (!canvas) return;
      drawGauge(canvas, 71);
    }
  
    /* ──────────────────────────────────────────────
       4. DONUT CHART (resumen de ventas)
    ────────────────────────────────────────────── */
    function drawDonut (canvas) {
      const ctx    = canvas.getContext('2d');
      const W      = canvas.width;
      const H      = canvas.height;
      const cx     = W / 2;
      const cy     = H / 2;
      const R      = W * 0.44;
      const R_in   = W * 0.28;
      const COLORS = ['#3dba3d', '#5be05b', '#1a2e1a', '#1e6b1e'];
      const DATA   = [55640, 11420, 1840, 2120];
      const total  = DATA.reduce((a, b) => a + b, 0);
  
      let angles = [];
      DATA.forEach((v, i) => {
        angles.push({
          start : i === 0 ? -Math.PI / 2 : angles[i - 1].end,
          end   : (i === 0 ? -Math.PI / 2 : angles[i - 1].end) + (v / total) * 2 * Math.PI,
          color : COLORS[i]
        });
      });
  
      function render (progress) {
        ctx.clearRect(0, 0, W, H);
  
        // Glow ring
        const glow = ctx.createRadialGradient(cx, cy, R_in, cx, cy, R + 10);
        glow.addColorStop(0,   'rgba(61,186,61,.04)');
        glow.addColorStop(0.7, 'rgba(61,186,61,.1)');
        glow.addColorStop(1,   'transparent');
        ctx.beginPath();
        ctx.arc(cx, cy, R + 10, 0, 2 * Math.PI);
        ctx.fillStyle = glow;
        ctx.fill();
  
        angles.forEach(({ start, end, color }) => {
          const currentEnd = start + (end - start) * progress;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, R, start, currentEnd);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
        });
  
        // Hollow center
        ctx.beginPath();
        ctx.arc(cx, cy, R_in, 0, 2 * Math.PI);
        ctx.fillStyle = getComputedStyle(canvas.closest('.dash-inicio-wrapper') || document.body)
                          .getPropertyValue('--dash-card') || '#1e2422';
        ctx.fill();
  
        // Inner ring
        ctx.beginPath();
        ctx.arc(cx, cy, R_in + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,.06)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }
  
      const dur = 1200;
      const obs = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const t0 = performance.now();
        (function tick (now) {
          const p = Math.min(easeOut((now - t0) / dur), 1);
          render(p);
          if (p < 1) requestAnimationFrame(tick);
        })(performance.now());
      }, { threshold: 0.3 });
      obs.observe(canvas);
    }
  
    function initDonut () {
      const canvas = $('#dash-donut-canvas');
      if (!canvas) return;
      drawDonut(canvas);
    }
  
    /* ──────────────────────────────────────────────
       5. LINE CHART (beneficio total)
    ────────────────────────────────────────────── */
    function drawLineChart (canvas) {
      const ctx = canvas.getContext('2d');
      // Data simulada de 12 puntos
      const RAW = [42, 65, 38, 80, 55, 95, 70, 110, 88, 130, 105, 136];
      const PAD = { top: 10, right: 8, bottom: 8, left: 8 };
  
      function draw (progress) {
        const W = canvas.parentElement.clientWidth || 400;
        canvas.width  = W;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);
  
        const dW = W - PAD.left - PAD.right;
        const dH = H - PAD.top  - PAD.bottom;
        const max = Math.max(...RAW) * 1.1;
        const min = Math.min(...RAW) * 0.8;
  
        const pts = RAW.map((v, i) => ({
          x: PAD.left + (i / (RAW.length - 1)) * dW,
          y: PAD.top  + dH - ((v - min) / (max - min)) * dH
        }));
  
        // Clip to progress
        const clipX = PAD.left + progress * dW;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, clipX, H);
        ctx.clip();
  
        // Fill gradient
        ctx.beginPath();
        ctx.moveTo(pts[0].x, PAD.top + dH);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, PAD.top + dH);
        ctx.closePath();
        const fillGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + dH);
        fillGrad.addColorStop(0,   'rgba(61,186,61,.35)');
        fillGrad.addColorStop(0.6, 'rgba(61,186,61,.06)');
        fillGrad.addColorStop(1,   'rgba(61,186,61,0)');
        ctx.fillStyle = fillGrad;
        ctx.fill();
  
        // Line
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const cp1x = (pts[i - 1].x + pts[i].x) / 2;
          ctx.bezierCurveTo(cp1x, pts[i - 1].y, cp1x, pts[i].y, pts[i].x, pts[i].y);
        }
        ctx.strokeStyle = '#3dba3d';
        ctx.lineWidth   = 2.5;
        ctx.lineJoin    = 'round';
        ctx.stroke();
  
        // Last visible dot
        const lastIdx = Math.min(
          Math.floor(progress * (RAW.length - 1)),
          RAW.length - 1
        );
        const lp = pts[lastIdx];
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#3dba3d';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(61,186,61,.25)';
        ctx.fill();
  
        ctx.restore();
      }
  
      const dur = 1600;
      const obs = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const t0 = performance.now();
        (function tick (now) {
          const p = Math.min(easeOut((now - t0) / dur), 1);
          draw(p);
          if (p < 1) requestAnimationFrame(tick);
        })(performance.now());
      }, { threshold: 0.2 });
      obs.observe(canvas);
    }
  
    function initLineChart () {
      const canvas = $('#dash-line-canvas');
      if (!canvas) return;
      drawLineChart(canvas);
      // Re-draw on resize
      window.addEventListener('resize', () => drawLineChart(canvas));
    }
  
    /* ──────────────────────────────────────────────
       6. HOVER RIPPLE EN CARDS
    ────────────────────────────────────────────── */
    function initCardRipple () {
      $$('.dash-card').forEach(card => {
        card.addEventListener('mousemove', e => {
          const rect = card.getBoundingClientRect();
          const x    = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
          const y    = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
          card.style.setProperty('--mx', x + '%');
          card.style.setProperty('--my', y + '%');
        });
      });
    }
  
    /* ──────────────────────────────────────────────
       7. FILAS DE TABLA: hover highlight
    ────────────────────────────────────────────── */
    function initTableRows () {
      $$('.dash-tr').forEach(row => {
        row.addEventListener('click', () => {
          $$('.dash-tr').forEach(r => r.classList.remove('dash-tr--selected'));
          row.classList.add('dash-tr--selected');
        });
      });
    }
  
    /* ──────────────────────────────────────────────
       8. NOTIFICACIONES: marcar como leídas al click
    ────────────────────────────────────────────── */
    function initNotifications () {
      const badge = $('.dash-icon-btn__badge');
      $$('.dash-notif-item').forEach(item => {
        item.addEventListener('click', () => {
          item.style.opacity = '.5';
          if (badge) {
            const n = parseInt(badge.textContent, 10) - 1;
            badge.textContent = Math.max(0, n);
            if (n <= 0) badge.style.display = 'none';
          }
        });
      });
    }
  
    /* ──────────────────────────────────────────────
       9. MICRO EFECTO EN BOTONES
    ────────────────────────────────────────────── */
    function initButtonEffects () {
      $$('.dash-btn-primary').forEach(btn => {
        btn.addEventListener('click', e => {
          btn.style.transform = 'scale(.95)';
          setTimeout(() => (btn.style.transform = ''), 150);
        });
      });
    }
  
    /* ──────────────────────────────────────────────
       10. FADE-IN SCROLL OBSERVER (refuerzo para
           elementos que pueden no animarse por CSS)
    ────────────────────────────────────────────── */
    function initScrollReveal () {
      if (!('IntersectionObserver' in window)) return;
      const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
          }
        });
      }, { threshold: 0.1 });
      $$('.dash-fade-in').forEach(el => {
        el.style.animationPlayState = 'paused';
        obs.observe(el);
      });
    }
  
    /* ──────────────────────────────────────────────
       INIT — espera al DOM
    ────────────────────────────────────────────── */
    function init () {
      initDate();
      initCounters();
      initGauge();
      initDonut();
      initLineChart();
      initCardRipple();
      initTableRows();
      initNotifications();
      initButtonEffects();
      initScrollReveal();
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
  })();
  