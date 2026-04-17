/**
 * Sesión: /api/auth/me + menú perfil (avatar letra o foto local) y logout.
 * Foto de perfil: localStorage por usuario (mmdr_avatar_<id>), sin backend.
 */
(function () {
    'use strict';

    const AVATAR_KEY_PREFIX = 'mmdr_avatar_';
    const MAX_CANVAS_EDGE = 160;
    const MAX_DATA_URL_CHARS = 1200000;

    function apiUrl() {
        if (typeof window === 'undefined') return 'http://localhost:4000';
        if (window.MMDR_API_BASE) return window.MMDR_API_BASE;
        const h = window.location.hostname;
        return h ? `http://${h}:4000` : 'http://localhost:4000';
    }

    function loginPageHref() {
        try {
            return new URL('Login.html', window.location.href).href;
        } catch {
            return 'Login.html';
        }
    }

    function avatarStorageKey(userId) {
        return AVATAR_KEY_PREFIX + String(userId);
    }

    function loadStoredAvatar(userId) {
        if (!userId) return null;
        try {
            return localStorage.getItem(avatarStorageKey(userId));
        } catch {
            return null;
        }
    }

    function saveStoredAvatar(userId, dataUrl) {
        try {
            localStorage.setItem(avatarStorageKey(userId), dataUrl);
        } catch (e) {
            console.warn('Avatar: no se pudo guardar', e);
            throw e;
        }
    }

    function removeStoredAvatar(userId) {
        try {
            localStorage.removeItem(avatarStorageKey(userId));
        } catch {
            /* vacío */
        }
    }

    function setNavLoggedIn(loggedIn) {
        const loginEl = document.getElementById('nav-auth-login');
        const userEl = document.getElementById('nav-auth-user');
        if (loginEl) loginEl.classList.toggle('nav-auth-hidden', loggedIn);
        if (userEl) userEl.classList.toggle('nav-auth-hidden', !loggedIn);
        if (!loggedIn) closeDropdown();
    }

    function letterAvatar(name, email) {
        const s = ((name && String(name).trim()) || (email && String(email).trim()) || '?').charAt(0);
        return s.toUpperCase() || '?';
    }

    function closeDropdown() {
        const drop = document.getElementById('nav-auth-dropdown');
        const trig = document.getElementById('nav-auth-trigger');
        if (drop) drop.classList.remove('nav-auth-dropdown-open');
        if (trig) trig.setAttribute('aria-expanded', 'false');
    }

    function toggleDropdown() {
        const drop = document.getElementById('nav-auth-dropdown');
        const trig = document.getElementById('nav-auth-trigger');
        if (!drop || !trig) return;
        const open = drop.classList.toggle('nav-auth-dropdown-open');
        trig.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    /**
     * Muestra foto guardada o iniciales. Compatible con páginas sin <img> (solo span).
     */
    function applyAvatarVisual(userId, name, email) {
        const dataUrl = loadStoredAvatar(userId);
        const L = letterAvatar(name, email);
        const smImg = document.getElementById('nav-auth-avatar-sm-img');
        const lgImg = document.getElementById('nav-auth-avatar-lg-img');
        const smLet = document.getElementById('nav-auth-avatar-sm');
        const lgLet = document.getElementById('nav-auth-avatar-lg');
        const removeBtn = document.getElementById('nav-auth-avatar-remove-btn');

        if (dataUrl && smImg && lgImg) {
            smImg.src = dataUrl;
            lgImg.src = dataUrl;
            smImg.classList.remove('nav-auth-hidden');
            lgImg.classList.remove('nav-auth-hidden');
            if (smLet) smLet.classList.add('nav-auth-hidden');
            if (lgLet) lgLet.classList.add('nav-auth-hidden');
            if (removeBtn) removeBtn.classList.remove('nav-auth-hidden');
        } else {
            if (smImg) {
                smImg.removeAttribute('src');
                smImg.classList.add('nav-auth-hidden');
            }
            if (lgImg) {
                lgImg.removeAttribute('src');
                lgImg.classList.add('nav-auth-hidden');
            }
            if (smLet) {
                smLet.classList.remove('nav-auth-hidden');
                smLet.textContent = L;
            }
            if (lgLet) {
                lgLet.classList.remove('nav-auth-hidden');
                lgLet.textContent = L;
            }
            if (removeBtn) removeBtn.classList.add('nav-auth-hidden');
        }
    }

    function fileToResizedDataUrl(file) {
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload = function () {
                const img = new Image();
                img.onload = function () {
                    try {
                        let w = img.naturalWidth;
                        let h = img.naturalHeight;
                        const scale = Math.min(MAX_CANVAS_EDGE / w, MAX_CANVAS_EDGE / h, 1);
                        w = Math.max(1, Math.round(w * scale));
                        h = Math.max(1, Math.round(h * scale));
                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        let q = 0.88;
                        let url = canvas.toDataURL('image/jpeg', q);
                        while (url.length > MAX_DATA_URL_CHARS && q > 0.45) {
                            q -= 0.08;
                            url = canvas.toDataURL('image/jpeg', q);
                        }
                        if (url.length > MAX_DATA_URL_CHARS) {
                            reject(new Error('Grande'));
                            return;
                        }
                        resolve(url);
                    } catch (err) {
                        reject(err);
                    }
                };
                img.onerror = function () {
                    reject(new Error('img'));
                };
                img.src = reader.result;
            };
            reader.onerror = function () {
                reject(new Error('read'));
            };
            reader.readAsDataURL(file);
        });
    }

    function wireAvatarUploads(user, name, email) {
        const input = document.getElementById('nav-auth-avatar-input');
        const removeBtn = document.getElementById('nav-auth-avatar-remove-btn');
        const uid = user && user._id;

        if (input && !input.dataset.mmdrAvatarWired) {
            input.dataset.mmdrAvatarWired = '1';
            input.addEventListener('change', function () {
                const f = input.files && input.files[0];
                input.value = '';
                if (!f || !uid) return;
                if (!f.type || !f.type.startsWith('image/')) {
                    window.alert('Elegí un archivo de imagen (JPG, PNG, WebP o GIF).');
                    return;
                }
                void fileToResizedDataUrl(f)
                    .then(function (url) {
                        saveStoredAvatar(uid, url);
                        applyAvatarVisual(uid, name, email);
                    })
                    .catch(function () {
                        window.alert(
                            'No se pudo guardar la imagen. Probá con un archivo más chico o otro formato.'
                        );
                    });
            });
        }

        if (removeBtn && !removeBtn.dataset.mmdrAvatarWired) {
            removeBtn.dataset.mmdrAvatarWired = '1';
            removeBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (!uid) return;
                removeStoredAvatar(uid);
                applyAvatarVisual(uid, name, email);
            });
        }
    }

    function persistUserFromServer(user) {
        if (!user || !user._id) return;
        const payload = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role === 'admin' ? 'admin' : 'user'
        };
        localStorage.setItem('usuario', JSON.stringify(payload));
    }

    function wireLoginLink(loginEl) {
        if (!loginEl) return;
        loginEl.href = loginPageHref();
        loginEl.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.assign(loginPageHref());
        });
    }

    async function initAuthHeader() {
        const loginEl = document.getElementById('nav-auth-login');
        const userEl = document.getElementById('nav-auth-user');
        const nameEl = document.getElementById('nav-auth-user-name');
        const emailEl = document.getElementById('nav-auth-user-email');
        const logoutBtn = document.getElementById('nav-auth-logout');
        const trigger = document.getElementById('nav-auth-trigger');

        wireLoginLink(loginEl);

        if (!loginEl && !userEl) return;

        try {
            const res = await fetch(`${apiUrl()}/api/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const user = await res.json();
                persistUserFromServer(user);
                const name = user.name || '';
                const email = user.email || '';
                if (nameEl) nameEl.textContent = name || email || 'Tu cuenta';
                if (emailEl) emailEl.textContent = email || '';
                applyAvatarVisual(user._id, name, email);
                wireAvatarUploads(user, name, email);
                setNavLoggedIn(true);
            } else {
                localStorage.removeItem('usuario');
                setNavLoggedIn(false);
            }
        } catch {
            setNavLoggedIn(false);
        }

        if (trigger) {
            trigger.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleDropdown();
            });
        }

        document.addEventListener('click', function () {
            closeDropdown();
        });
        if (userEl) {
            userEl.addEventListener('click', function (e) {
                e.stopPropagation();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeDropdown();
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function (e) {
                e.preventDefault();
                e.stopPropagation();
                closeDropdown();
                try {
                    await fetch(`${apiUrl()}/api/auth/logout`, {
                        method: 'POST',
                        credentials: 'include'
                    });
                } catch (err) {
                    console.warn('logout', err);
                }
                localStorage.removeItem('usuario');
                window.location.href = 'inicio.html';
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuthHeader);
    } else {
        initAuthHeader();
    }
})();
