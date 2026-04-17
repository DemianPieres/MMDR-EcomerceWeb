// Login + Register: validación, UI y misma API de sesión que el resto del sitio (scripts.js).

function resolveApiBaseUrl() {
    if (typeof window === 'undefined') return 'http://localhost:4000';
    if (window.MMDR_API_BASE) return window.MMDR_API_BASE;
    const h = window.location.hostname;
    if (h) return `http://${h}:4000`;
    return 'http://localhost:4000';
}

const API_BASE_URL = resolveApiBaseUrl();
if (typeof window !== 'undefined') {
    window.MMDR_API_BASE = API_BASE_URL;
}

function ensureNotificationStyles() {
    if (document.getElementById('mmdr-auth-notification-styles')) return;
    const style = document.createElement('style');
    style.id = 'mmdr-auth-notification-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 100000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: mmdrSlideInRight 0.3s ease-out;
            max-width: 400px;
        }
        .notification.success { background-color: #4CAF50; }
        .notification.error { background-color: #f44336; }
        .notification.info { background-color: #2196F3; }
        @keyframes mmdrSlideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

function showNotification(message, type = 'info') {
    ensureNotificationStyles();
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

/**
 * Si ya hay sesión en el servidor, opcionalmente redirigir.
 * Los administradores no se envían a mode-selection al abrir Login.html:
 * así pueden ver el formulario (otra cuenta, revisar credenciales, etc.).
 * La pantalla mode-selection sigue siendo el paso tras un login exitoso.
 */
async function redirectIfAlreadyLoggedIn() {
    const loginForm = document.querySelector('#login-form');
    if (!loginForm) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
        if (!response.ok) return;
        const user = await response.json();
        const userPayload = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role === 'admin' ? 'admin' : 'user'
        };
        localStorage.setItem('usuario', JSON.stringify(userPayload));
        if (userPayload.role === 'admin') {
            return;
        }
        window.location.replace('inicio.html');
    } catch {
        /* sin servidor: dejar ver login */
    }
}

async function checkBackendStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            console.log('Backend conectado');
            return true;
        }
    } catch (error) {
        console.error('Backend no disponible:', error);
        showNotification(
            'El servidor no está disponible. Ejecutá "npm run dev" en la carpeta backend.',
            'error'
        );
        return false;
    }
    return false;
}

/* ── Password visibility toggle ─────────────────────────────────────────── */
function initPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach((btn) => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            const isText = input.type === 'text';
            input.type = isText ? 'password' : 'text';
            const eye = btn.querySelector('.icon-eye');
            const eyeOff = btn.querySelector('.icon-eye-off');
            if (eye) eye.style.display = isText ? 'block' : 'none';
            if (eyeOff) eyeOff.style.display = isText ? 'none' : 'block';
        });
    });
}

/* ── Form validation helpers ─────────────────────────────────────────────── */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const parent = field?.closest('.input-group');
    if (!parent) return;
    let err = parent.querySelector('.field-error');
    if (!err) {
        err = document.createElement('span');
        err.className = 'field-error';
        err.setAttribute('role', 'alert');
        parent.appendChild(err);
    }
    err.textContent = message;
    field.classList.add('has-error');
}

function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const parent = field?.closest('.input-group');
    if (!parent) return;
    const err = parent.querySelector('.field-error');
    if (err) err.textContent = '';
    field?.classList.remove('has-error');
}

function clearAllErrors() {
    document.querySelectorAll('.has-error').forEach((el) => el.classList.remove('has-error'));
    document.querySelectorAll('.field-error').forEach((el) => {
        el.textContent = '';
    });
}

function initLiveClear() {
    document.querySelectorAll('input').forEach((input) => {
        input.addEventListener('input', () => clearError(input.id));
    });
}

async function submitLogin() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const form = document.getElementById('login-form');
    const submitBtn = form?.querySelector('.btn-primary');
    if (!emailInput || !passwordInput || !submitBtn) return;

    submitBtn.textContent = 'Iniciando…';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: emailInput.value.toLowerCase().trim(),
                password: passwordInput.value
            })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            showNotification('¡Inicio de sesión exitoso!', 'success');
            const du = data.user || {};
            const uid = du.id != null ? String(du.id) : du._id != null ? String(du._id) : '';
            const userPayload = {
                id: uid,
                email: du.email,
                name: du.name,
                role: du.role === 'admin' ? 'admin' : 'user'
            };
            localStorage.setItem('usuario', JSON.stringify(userPayload));
            setTimeout(() => {
                if (userPayload.role === 'admin') {
                    window.location.href = 'mode-selection.html';
                } else {
                    window.location.href = 'inicio.html';
                }
            }, 800);
        } else {
            showNotification(data.error || 'Error en el inicio de sesión', 'error');
        }
    } catch (error) {
        console.error('Error en login:', error);
        showNotification(
            'Error de conexión con el servidor. Verificá que el backend esté ejecutándose.',
            'error'
        );
    } finally {
        submitBtn.textContent = 'Iniciar Sesion';
        submitBtn.disabled = false;
    }
}

async function submitRegister() {
    const nameInput = document.getElementById('fullname');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const form = document.getElementById('register-form');
    const submitBtn = form?.querySelector('.btn-primary');
    if (!nameInput || !emailInput || !passwordInput || !submitBtn) return;

    submitBtn.textContent = 'Registrando…';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                name: nameInput.value.trim(),
                email: emailInput.value.toLowerCase().trim(),
                password: passwordInput.value
            })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            showNotification('¡Cuenta creada exitosamente!', 'success');
            const raw = data.user || data;
            const userPayload = {
                id: raw.id != null ? String(raw.id) : raw._id != null ? String(raw._id) : '',
                email: raw.email,
                name: raw.name,
                role: raw.role === 'admin' ? 'admin' : 'user'
            };
            localStorage.setItem('usuario', JSON.stringify(userPayload));
            setTimeout(() => {
                window.location.href = 'inicio.html';
            }, 800);
        } else {
            showNotification(data.error || 'Error al registrar usuario', 'error');
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showNotification(
            'Error de conexión con el servidor. Verificá que el backend esté ejecutándose.',
            'error'
        );
    } finally {
        submitBtn.textContent = 'Crear Cuenta';
        submitBtn.disabled = false;
    }
}

function initRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAllErrors();
        let valid = true;

        const name = document.getElementById('fullname');
        const email = document.getElementById('email');
        const password = document.getElementById('password');

        if (!name?.value.trim()) {
            showError('fullname', 'El nombre es obligatorio.');
            valid = false;
        }
        if (!email?.value.trim()) {
            showError('email', 'El correo es obligatorio.');
            valid = false;
        } else if (!isValidEmail(email.value)) {
            showError('email', 'Ingresá un correo válido.');
            valid = false;
        }
        if (!password?.value) {
            showError('password', 'La contraseña es obligatoria.');
            valid = false;
        } else if (password.value.length < 8) {
            showError('password', 'La contraseña debe tener al menos 8 caracteres.');
            valid = false;
        } else if (!/\d/.test(password.value)) {
            showError('password', 'La contraseña debe incluir al menos un número.');
            valid = false;
        } else if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password.value)) {
            showError('password', 'La contraseña debe incluir al menos un carácter especial.');
            valid = false;
        }

        if (valid) void submitRegister();
    });
}

function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAllErrors();
        let valid = true;

        const email = document.getElementById('email');
        const password = document.getElementById('password');

        if (!email?.value.trim()) {
            showError('email', 'El correo es obligatorio.');
            valid = false;
        } else if (!isValidEmail(email.value)) {
            showError('email', 'Ingresá un correo válido.');
            valid = false;
        }
        if (!password?.value) {
            showError('password', 'La contraseña es obligatoria.');
            valid = false;
        }

        if (valid) void submitLogin();
    });
}

/* ── Lava-lamp / glow animation (canvas) ────────────────────────────────── */
function initLavaLamp() {
    const canvas = document.getElementById('lava-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W;
    let H;

    function resize() {
        W = canvas.width = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const balls = Array.from({ length: 6 }, () => ({
        x: Math.random() * 400,
        y: Math.random() * 600,
        r: 100 + Math.random() * 120,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.5 + 0.15,
        hue: 110 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2
    }));

    let t = 0;

    function draw() {
        t += 0.008;
        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = '#0b1a0e';
        ctx.fillRect(0, 0, W, H);

        balls.forEach((b) => {
            b.x += b.vx + Math.sin(t + b.phase) * 0.4;
            b.y += b.vy + Math.cos(t * 0.7 + b.phase) * 0.3;

            if (b.x < -b.r) b.x = W + b.r;
            if (b.x > W + b.r) b.x = -b.r;
            if (b.y < -b.r) b.y = H + b.r;
            if (b.y > H + b.r) b.y = -b.r;

            const alpha = 0.18 + 0.12 * Math.sin(t * 1.3 + b.phase);
            const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
            grd.addColorStop(0, `hsla(${b.hue}, 80%, 38%, ${alpha + 0.08})`);
            grd.addColorStop(0.5, `hsla(${b.hue}, 70%, 22%, ${alpha})`);
            grd.addColorStop(1, `hsla(${b.hue}, 60%, 10%, 0)`);

            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
        });

        ctx.globalCompositeOperation = 'screen';
        const bottomGlow = ctx.createRadialGradient(W / 2, H * 0.85, 0, W / 2, H * 0.85, W * 0.7);
        const glowAlpha = 0.28 + 0.1 * Math.sin(t * 0.9);
        bottomGlow.addColorStop(0, `rgba(100,255,100,${glowAlpha})`);
        bottomGlow.addColorStop(0.4, `rgba(30,180,60,${glowAlpha * 0.5})`);
        bottomGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bottomGlow;
        ctx.fillRect(0, 0, W, H);

        ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(draw);
    }

    draw();
}

document.addEventListener('DOMContentLoaded', async () => {
    await redirectIfAlreadyLoggedIn();
    await checkBackendStatus();
    initLavaLamp();
    initPasswordToggles();
    initLiveClear();
    initRegisterForm();
    initLoginForm();
});
