/**
 * Bloquea la carga del panel hasta validar sesión + rol admin en el servidor.
 * Inyecta admin-scripts.js solo si /api/auth/me responde OK con role admin.
 */
(function () {
    function apiBase() {
        if (typeof window.MMDR_API_BASE === 'string' && window.MMDR_API_BASE) {
            return window.MMDR_API_BASE;
        }
        var h = window.location.hostname;
        return h ? 'http://' + h + ':4000' : 'http://localhost:4000';
    }

    function go(url) {
        window.location.replace(url);
    }

    function loadAdminScripts() {
        var s = document.createElement('script');
        s.src = 'admin-scripts.js';
        s.async = false;
        document.body.appendChild(s);
    }

    var usuario;
    try {
        usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
    } catch (e) {
        go('Login.html');
        return;
    }

    if (!usuario || !usuario.id) {
        go('Login.html');
        return;
    }

    if (usuario.role !== 'admin') {
        go('inicio.html');
        return;
    }

    fetch(apiBase() + '/api/auth/me', { credentials: 'include' })
        .then(function (r) {
            return r.ok ? r.json() : Promise.reject(new Error('auth'));
        })
        .then(function (me) {
            if (!me || me.role !== 'admin') {
                go('inicio.html');
                return;
            }
            localStorage.setItem(
                'usuario',
                JSON.stringify({
                    id: me._id,
                    email: me.email,
                    name: me.name,
                    role: 'admin'
                })
            );
            loadAdminScripts();
        })
        .catch(function () {
            go('Login.html');
        });
})();
