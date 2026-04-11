/**
 * NEXUM — Landing Page Script
 * Handles: navbar, hero slideshow, scroll reveals,
 * animated counters, 3D globe (Three.js), region tabs,
 * review carousel, custom cursor.
 */

'use strict';

/* ============================================
   CUSTOM CURSOR
   ============================================ */
(function initCursor() {
  const root = document.documentElement;

  document.addEventListener('mousemove', (e) => {
    root.style.setProperty('--cx', e.clientX + 'px');
    root.style.setProperty('--cy', e.clientY + 'px');
  });

  // Scale up cursor on links/buttons
  document.querySelectorAll('a, button, .service-card, .video-thumb').forEach(el => {
    el.addEventListener('mouseenter', () => {
      document.body.style.setProperty('--cursor-scale', '1.5');
    });
    el.addEventListener('mouseleave', () => {
      document.body.style.setProperty('--cursor-scale', '1');
    });
  });
})();

/* ============================================
   NAVBAR
   ============================================ */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');

  // Scroll effect
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);

    // Active link
    const sections = document.querySelectorAll('section[id]');
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  // Hamburger
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    const isOpen = navLinks.classList.contains('open');
    spans[0].style.transform = isOpen ? 'rotate(45deg) translate(4px, 4px)' : '';
    spans[1].style.opacity = isOpen ? '0' : '';
    spans[2].style.transform = isOpen ? 'rotate(-45deg) translate(4px, -4px)' : '';
  });

  // Close menu on link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.querySelectorAll('span').forEach(s => {
        s.style.transform = '';
        s.style.opacity = '';
      });
    });
  });
})();

/* ============================================
   HERO SLIDESHOW
   ============================================ */
(function initHeroSlideshow() {
  const slides = document.querySelectorAll('.hero-slide');
  const indicators = document.querySelectorAll('.indicator');
  let current = 0;
  let timer;

  function goTo(index) {
    slides[current].classList.remove('active');
    indicators[current].classList.remove('active', 'active-line');

    current = (index + slides.length) % slides.length;

    slides[current].classList.add('active');
    indicators[current].classList.add('active');
    // Keep active-line on the middle-ish indicator
    indicators[current].classList.toggle('active-line', current === 2);
  }

  function autoPlay() {
    timer = setInterval(() => goTo(current + 1), 5500);
  }

  // Click indicators
  indicators.forEach((ind, i) => {
    ind.addEventListener('click', () => {
      clearInterval(timer);
      goTo(i);
      autoPlay();
    });
  });

  autoPlay();
})();

/* ============================================
   SCROLL REVEAL
   ============================================ */
(function initReveal() {
  const revealEls = document.querySelectorAll(
    '.reveal-up, .reveal-left, .reveal-right, .reveal-fade'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.dataset.delay ? parseInt(el.dataset.delay) : 0;
        setTimeout(() => el.classList.add('revealed'), delay);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  revealEls.forEach(el => observer.observe(el));
})();

/* ============================================
   ANIMATED COUNTERS
   ============================================ */
(function initCounters() {
  const counters = document.querySelectorAll('.stat-number');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      const duration = 1800;
      const start = performance.now();

      const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        el.textContent = Math.floor(ease(progress) * target);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }

      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
})();

/* ============================================
   REGION TABS
   ============================================ */
(function initRegionTabs() {
  const tabs = document.querySelectorAll('.region-tab');
  const panels = document.querySelectorAll('.region-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const target = document.querySelector(`[data-panel="${tab.dataset.region}"]`);
      if (target) target.classList.add('active');
    });
  });
})();

/* ============================================
   REVIEW CAROUSEL
   ============================================ */
(function initReviews() {
  const track = document.getElementById('reviewsTrack');
  const dotsContainer = document.getElementById('reviewsDots');
  if (!track) return;

  const cards = track.querySelectorAll('.review-card');
  const total = cards.length;
  // Show 3 on desktop, 1 on mobile
  let perView = window.innerWidth < 768 ? 1 : 3;
  let currentSlide = 0;

  function getPerView() {
    return window.innerWidth < 768 ? 1 : (window.innerWidth < 1024 ? 2 : 3);
  }

  function buildDots() {
    dotsContainer.innerHTML = '';
    const count = Math.ceil(total / getPerView());
    for (let i = 0; i < count; i++) {
      const btn = document.createElement('button');
      btn.className = 'review-dot' + (i === 0 ? ' active' : '');
      btn.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(btn);
    }
  }

  function goTo(index) {
    perView = getPerView();
    const maxSlide = Math.ceil(total / perView) - 1;
    currentSlide = Math.max(0, Math.min(index, maxSlide));

    const cardWidth = track.parentElement.offsetWidth;
    const offset = currentSlide * cardWidth;
    track.style.transform = `translateX(-${offset}px)`;

    document.querySelectorAll('.review-dot').forEach((d, i) => {
      d.classList.toggle('active', i === currentSlide);
    });
  }

  // Auto advance
  let interval = setInterval(() => {
    const maxSlide = Math.ceil(total / getPerView()) - 1;
    goTo(currentSlide >= maxSlide ? 0 : currentSlide + 1);
  }, 4500);

  // Swipe support
  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      clearInterval(interval);
      goTo(diff > 0 ? currentSlide + 1 : currentSlide - 1);
    }
  });

  window.addEventListener('resize', () => {
    buildDots();
    goTo(0);
  });

  buildDots();
})();

/* ============================================
   3D GLOBE — Three.js
   ============================================ */
(function initGlobe() {
  const canvas = document.getElementById('globeCanvas');
  if (!canvas || typeof THREE === 'undefined') {
    // Fallback: show placeholder if Three.js not loaded
    setTimeout(initGlobe, 500);
    return;
  }

  const wrapper = canvas.parentElement;
  const W = wrapper.offsetWidth;
  const H = wrapper.offsetHeight;

  // Scene setup
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
  camera.position.z = 2.8;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);

  // === SPHERE (Globe) ===
  const radius = 1;
  const geo = new THREE.SphereGeometry(radius, 64, 64);

  // Custom shader material for a stylized teal globe (like AWS)
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAtmColor1: { value: new THREE.Color(0x00c4b4) },
      uAtmColor2: { value: new THREE.Color(0x009688) },
      uDarkColor: { value: new THREE.Color(0x004d40) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uAtmColor1;
      uniform vec3 uAtmColor2;
      uniform vec3 uDarkColor;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec2 vUv;

      // Simple land/ocean pattern using noise-like math
      float pattern(vec2 uv) {
        vec2 p = uv * 6.28318;
        float v = sin(p.x * 3.0 + uTime * 0.05) * cos(p.y * 2.5) * 0.5 + 0.5;
        v += sin(p.x * 1.5 + 0.3) * sin(p.y * 4.0) * 0.3;
        v += cos(p.x * 2.0) * cos(p.y * 2.0 + uTime * 0.02) * 0.2;
        return clamp(v, 0.0, 1.0);
      }

      void main() {
        float p = pattern(vUv);
        // land vs ocean
        float isLand = step(0.52, p);
        vec3 col = mix(uDarkColor, uAtmColor1, isLand);

        // Edge glow (atmosphere)
        float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
        rim = pow(rim, 2.5);
        col = mix(col, uAtmColor2, rim * 0.6);

        // Top light
        float light = dot(vNormal, normalize(vec3(0.5, 0.8, 1.0)));
        light = clamp(light, 0.0, 1.0);
        col *= 0.6 + light * 0.5;

        gl_FragColor = vec4(col, 0.92);
      }
    `,
    transparent: true,
  });

  const globe = new THREE.Mesh(geo, mat);
  scene.add(globe);

  // === ATMOSPHERE GLOW ===
  const atmGeo = new THREE.SphereGeometry(radius * 1.08, 32, 32);
  const atmMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x26c6da) } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormal;
      void main() {
        float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
        rim = pow(rim, 3.0);
        gl_FragColor = vec4(uColor, rim * 0.35);
      }
    `,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
  });
  const atmosphere = new THREE.Mesh(atmGeo, atmMat);
  scene.add(atmosphere);

  // === ARGENTINA PIN — lat: -29.15, lon: -67.5 (Chilecito) ===
  function latLonToXYZ(lat, lon, r) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -(r * Math.sin(phi) * Math.cos(theta)),
       (r * Math.cos(phi)),
       (r * Math.sin(phi) * Math.sin(theta))
    );
  }

  // Pin marker
  const pinPos = latLonToXYZ(-29.15, -67.5, radius + 0.015);
  const pinGeo = new THREE.SphereGeometry(0.028, 16, 16);
  const pinMat = new THREE.MeshBasicMaterial({ color: 0xe63030 });
  const pin = new THREE.Mesh(pinGeo, pinMat);
  pin.position.copy(pinPos);
  globe.add(pin);

  // Ping ring (animated)
  const ringGeo = new THREE.RingGeometry(0.04, 0.055, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xe63030,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(pinPos);
  ring.lookAt(new THREE.Vector3(0, 0, 0));
  globe.add(ring);

  // Dots on equator (latitude lines suggestion)
  const dotsMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dotsGeo = new THREE.SphereGeometry(0.008, 8, 8);

  // Sample dots for visual flair
  const dotPositions = [
    latLonToXYZ(51.5, -0.1, radius + 0.01),  // London
    latLonToXYZ(40.7, -74.0, radius + 0.01), // New York
    latLonToXYZ(35.7, 139.7, radius + 0.01), // Tokyo
    latLonToXYZ(-33.9, 18.4, radius + 0.01), // Cape Town
    latLonToXYZ(-23.5, -46.6, radius + 0.01),// São Paulo
  ];

  dotPositions.forEach(pos => {
    const dot = new THREE.Mesh(dotsGeo, dotsMat);
    dot.position.copy(pos);
    globe.add(dot);
  });

  // === GRID LINES ===
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x26c6da,
    transparent: true,
    opacity: 0.12,
  });

  function createLatLine(lat) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 4) {
      pts.push(latLonToXYZ(lat, lon, radius + 0.002));
    }
    const geo2 = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo2, lineMat);
  }

  function createLonLine(lon) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 4) {
      pts.push(latLonToXYZ(lat, lon, radius + 0.002));
    }
    const geo2 = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo2, lineMat);
  }

  [-60, -30, 0, 30, 60].forEach(lat => globe.add(createLatLine(lat)));
  for (let lon = -180; lon < 180; lon += 30) {
    globe.add(createLonLine(lon));
  }

  // === LIGHTS ===
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(2, 2, 3);
  scene.add(dirLight);

  // === MOUSE DRAG ===
  let isDragging = false;
  let prevMouse = { x: 0, y: 0 };
  let rotVel = { x: 0, y: 0 };
  let autoRotate = true;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    autoRotate = false;
    prevMouse = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    rotVel.x = dy * 0.004;
    rotVel.y = dx * 0.004;
    globe.rotation.x += rotVel.x;
    globe.rotation.y += rotVel.y;
    prevMouse = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
    // Resume auto after 3s
    setTimeout(() => { autoRotate = true; }, 3000);
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.style.cursor = 'grab';

  // Touch
  let touchStart = null;
  canvas.addEventListener('touchstart', e => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    autoRotate = false;
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (!touchStart) return;
    const dx = e.touches[0].clientX - touchStart.x;
    const dy = e.touches[0].clientY - touchStart.y;
    globe.rotation.x += dy * 0.004;
    globe.rotation.y += dx * 0.004;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    touchStart = null;
    setTimeout(() => { autoRotate = true; }, 3000);
  });

  // Rotate to show South America on init
  globe.rotation.y = -Math.PI * 0.6;
  globe.rotation.x = 0.3;

  // === ANIMATE ===
  let time = 0;
  let pingScale = 1;
  let pingDir = 1;

  function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    mat.uniforms.uTime.value = time;

    if (autoRotate) {
      globe.rotation.y += 0.002;
    } else {
      // Dampen velocity
      rotVel.x *= 0.92;
      rotVel.y *= 0.92;
      if (!isDragging) {
        globe.rotation.x += rotVel.x;
        globe.rotation.y += rotVel.y;
      }
    }

    // Ping ring animation
    pingScale += 0.025 * pingDir;
    if (pingScale > 2.2) { pingDir = -1; }
    if (pingScale < 1.0) { pingDir = 1; pingScale = 1; }
    ring.scale.setScalar(pingScale);
    ringMat.opacity = (2.2 - pingScale) / 1.2 * 0.7;

    // Pin pulse
    const pinPulse = 1 + Math.sin(time * 3) * 0.15;
    pin.scale.setScalar(pinPulse);

    renderer.render(scene, camera);
  }

  animate();

  // Resize
  window.addEventListener('resize', () => {
    const W2 = wrapper.offsetWidth;
    const H2 = wrapper.offsetHeight;
    camera.aspect = W2 / H2;
    camera.updateProjectionMatrix();
    renderer.setSize(W2, H2);
  });
})();

/* ============================================
   PARALLAX on HERO (subtle depth)
   ============================================ */
(function initParallax() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight) {
      const slides = hero.querySelectorAll('.hero-slide.active');
      slides.forEach(s => {
        s.style.transform = `translateY(${scrollY * 0.25}px) scale(1)`;
      });
    }
  }, { passive: true });
})();

/* ============================================
   SMOOTH SCROLL for anchor links
   ============================================ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ============================================
   PAGE LOAD ENTRANCE ANIMATION
   ============================================ */
window.addEventListener('load', () => {
  // Trigger hero reveals after page load
  document.querySelectorAll('.hero .reveal-up').forEach((el, i) => {
    setTimeout(() => el.classList.add('revealed'), 300 + i * 200);
  });
  document.querySelectorAll('.hero .reveal-fade').forEach((el, i) => {
    setTimeout(() => el.classList.add('revealed'), 600 + i * 150);
  });
});

/* ============================================
   SECTION PROGRESS INDICATOR (subtle line on sides)
   ============================================ */
(function initProgress() {
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0%;
    height: 2px;
    background: linear-gradient(to right, #e63030, #ff6b6b);
    z-index: 2000;
    transition: width 0.1s linear;
    pointer-events: none;
  `;
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = (scrollTop / docHeight) * 100;
    progressBar.style.width = pct + '%';
  }, { passive: true });
})();

console.log('%c NEXUM ', 'background:#e63030;color:#fff;font-size:18px;padding:6px 12px;font-weight:bold;border-radius:2px;');
console.log('%c Landing Page cargada ✓', 'color:#e63030;font-size:12px;');
