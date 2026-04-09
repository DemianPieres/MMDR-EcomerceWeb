/**
 * MMDR — Atención al cliente (chatbot por reglas + tickets API)
 * Solo usuarios con sesión (localStorage usuario). Inyecta el widget si no existe.
 */

(function () {
    'use strict';

    function getApiBase() {
        if (typeof window === 'undefined') return 'http://localhost:4000';
        if (window.MMDR_API_BASE) return window.MMDR_API_BASE;
        const h = window.location.hostname;
        return h ? `http://${h}:4000` : 'http://localhost:4000';
    }
    const API_BASE = getApiBase();

    const TYPING_DELAY_MS = 2800;
    const TICKET_SUCCESS_MSG = 'Un agente se pondrá en contacto con vos. Gracias por tu paciencia.';

    const NOVEDADES_HTML = `
        <ul class="chatbot-novedades-list">
            <li>Nuevo diseño responsive en catálogo y detalle de producto.</li>
            <li>Checkout con integración de pagos y seguimiento de pedidos.</li>
            <li>Panel de administración con inventario, usuarios y reportes.</li>
            <li>Chat de ayuda con derivación a agente humano y seguimiento por tickets.</li>
            <li>Mejoras de rendimiento y experiencia en favoritos y carrito.</li>
        </ul>
    `;

    const AYUDA_HTML = `
        <div class="chatbot-ayuda-inner">
            <p><strong>Menú automático:</strong> Elegí opciones con botones hasta abrir un ticket.</p>
            <p><strong>Con agente:</strong> Cuando el equipo escribe, podés responder con texto libre abajo del chat.</p>
            <p><strong>Tickets:</strong> Necesitás iniciar sesión. Consultá “Mensajes” para el historial activo.</p>
        </div>
    `;

    let pollTimer = null;
    let lastSeenAdminCount = 0;
    let activeTicketId = null;

    const FLOW_RESPONSES = {
        'como-compro': {
            text: '¡Es muy fácil! Navegá por nuestro catálogo, agregá los productos al carrito y al finalizá la compra elegí el método de pago. Aceptamos tarjetas, transferencia y efectivo.',
            nextOptions: [
                { id: 'como-pago', text: '¿Cómo pago?', type: 'dark' },
                { id: 'envios', text: '¿Cómo son los envíos?', type: 'dark' },
                { id: 'no-resolvio', text: 'No resolvió mi problema', type: 'dark' },
                { id: 'volver-menu', text: 'Ir al menú', type: 'light' }
            ]
        },
        'es-seguro': {
            text: 'Sí, es 100% seguro. Trabajamos con métodos de pago verificados y protegemos tus datos. Además, tenemos garantía de 30 días en todos nuestros productos.',
            nextOptions: [
                { id: 'como-compro', text: '¿Cómo compro en la página?', type: 'dark' },
                { id: 'hablar-agente', text: 'Quiero hablar con un agente', type: 'dark' },
                { id: 'no-resolvio', text: 'No resolvió mi problema', type: 'dark' },
                { id: 'volver-menu', text: 'Ir al menú', type: 'light' }
            ]
        },
        'pedido-no-llego': {
            text: 'Lamentamos lo ocurrido. ¿Tu pedido figura como enviado?',
            nextOptions: [
                { id: 'pedido-si-enviado', text: 'Sí', type: 'dark' },
                { id: 'pedido-no-enviado', text: 'No', type: 'dark' },
                { id: 'volver-menu', text: 'Ir al menú', type: 'light' }
            ]
        },
        'pedido-si-enviado': {
            text: 'Si ya fue enviado, podés rastrear tu pedido con el número de seguimiento que te enviamos por email. Si pasaron más de 5 días hábiles, contactá a un agente para que revise tu caso.',
            nextOptions: [
                { id: 'hablar-agente', text: 'Quiero hablar con un agente', type: 'dark' },
                { id: 'no-resolvio', text: 'No resolvió mi problema', type: 'dark' },
                { id: 'volver-menu', text: 'Ir al menú', type: 'light' }
            ]
        },
        'pedido-no-enviado': {
            text: 'Tu pedido podría estar en preparación. Te recomendamos esperar 24-48 horas. Si sigue sin actualizarse, un agente puede ayudarte a verificar el estado.',
            nextOptions: [
                { id: 'hablar-agente', text: 'Quiero hablar con un agente', type: 'dark' },
                { id: 'no-resolvio', text: 'No resolvió mi problema', type: 'dark' },
                { id: 'volver-menu', text: 'Ir al menú', type: 'light' }
            ]
        },
        'hablar-agente': {
            text: TICKET_SUCCESS_MSG,
            createTicket: true,
            tipoConsulta: 'Contacto con agente',
            nextOptions: [{ id: 'volver-menu', text: 'Ir al menú', type: 'light' }]
        },
        'no-resolvio': {
            text: TICKET_SUCCESS_MSG,
            createTicket: true,
            tipoConsulta: 'No resolvió mi problema',
            nextOptions: [{ id: 'volver-menu', text: 'Ir al menú', type: 'light' }]
        },
        'como-pago': {
            text: 'Aceptamos tarjetas de crédito/débito, transferencia bancaria y efectivo al retirar. El pago se realiza de forma segura al finalizar tu compra.',
            nextOptions: [
                { id: 'no-resolvio', text: 'No resolvió mi problema', type: 'dark' },
                { id: 'volver-menu', text: 'Ir al menú', type: 'light' }
            ]
        },
        'envios': {
            text: 'Realizamos envíos a todo el país. El envío es gratis superando $60.000. Los tiempos varían según la zona, generalmente 3-7 días hábiles.',
            nextOptions: [
                { id: 'no-resolvio', text: 'No resolvió mi problema', type: 'dark' },
                { id: 'volver-menu', text: 'Ir al menú', type: 'light' }
            ]
        },
        'volver-menu': {
            text: '¿En qué más podemos ayudarte?',
            resetToMenu: true,
            nextOptions: [
                { id: 'como-compro', text: '¿Cómo compro en la página?', type: 'dark' },
                { id: 'es-seguro', text: '¿Es seguro comprar aquí?', type: 'dark' },
                { id: 'pedido-no-llego', text: 'Mi pedido no llegó', type: 'dark' },
                { id: 'hablar-agente', text: 'Quiero hablar con un agente', type: 'dark' }
            ]
        }
    };

    const MAIN_OPTIONS = [
        { id: 'como-compro', text: '¿Cómo compro en la página?', type: 'dark' },
        { id: 'es-seguro', text: '¿Es seguro comprar aquí?', type: 'dark' },
        { id: 'pedido-no-llego', text: 'Mi pedido no llegó', type: 'dark' },
        { id: 'hablar-agente', text: 'Quiero hablar con un agente', type: 'dark' }
    ];

    function getUsuario() {
        try {
            return JSON.parse(localStorage.getItem('usuario') || '{}');
        } catch {
            return {};
        }
    }

    function isLoggedIn() {
        const u = getUsuario();
        return !!(u && (u.id || u._id));
    }

    /** Alinea localStorage con la cookie de sesión del API. Sin cookie válida, limpia usuario local. */
    async function reconcileSessionWithServer() {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const user = await res.json();
                if (user && user._id) {
                    localStorage.setItem(
                        'usuario',
                        JSON.stringify({
                            id: user._id,
                            email: user.email,
                            name: user.name,
                            role: user.role === 'admin' ? 'admin' : 'user'
                        })
                    );
                    return true;
                }
            }
        } catch (e) {
            console.warn('chatbot: sesión', e);
        }
        const u = getUsuario();
        if (u && (u.id || u._id)) {
            localStorage.removeItem('usuario');
        }
        return false;
    }

    function getUserName() {
        const u = getUsuario();
        return u.name || u.nombre || '';
    }

    function getUserId() {
        const u = getUsuario();
        return u.id || u._id || '';
    }

    function loadStoredTicketRefs() {
        activeTicketId = localStorage.getItem('chatbot_active_ticket_id') || null;
    }

    function saveTicketRefs(id) {
        activeTicketId = id || null;
        if (id) localStorage.setItem('chatbot_active_ticket_id', id);
        else localStorage.removeItem('chatbot_active_ticket_id');
    }

    function ticketPollUrl() {
        if (!activeTicketId) return null;
        return `${API_BASE}/api/tickets/${activeTicketId}`;
    }

    function adminHaIniciado(ticket) {
        return ticket && Array.isArray(t.mensajes) && ticket.mensajes.some(m => m.from === 'admin');
    }

    /** True si el agente ya tomó el caso: mensaje admin o estado "En proceso" (sincronizado con el API). */
    function conversacionConAgente(ticket) {
        if (!ticket) return false;
        if (ticket.estado === 'En proceso') return true;
        return adminHaIniciado(ticket);
    }

    function ticketEstaResuelto(ticket) {
        return ticket && (ticket.estado === 'Resuelto' || ticket.estado === 'Cerrado');
    }

    function applyConversationModeFromTicket(ticket) {
        const opts = document.getElementById('chatbot-options-container');
        const composer = document.getElementById('chatbot-user-composer');
        const live = conversacionConAgente(ticket);
        if (live) {
            if (opts) {
                opts.innerHTML = '';
                opts.style.display = 'none';
            }
            if (composer) composer.classList.add('visible');
        } else {
            if (opts) opts.style.display = '';
            if (composer) composer.classList.remove('visible');
        }
    }

    function hideLiveComposer() {
        const composer = document.getElementById('chatbot-user-composer');
        const opts = document.getElementById('chatbot-options-container');
        if (composer) composer.classList.remove('visible');
        if (opts) opts.style.display = '';
    }

    function handleTicketGoneMessage() {
        stopTicketPolling();
        saveTicketRefs(null);
        hideLiveComposer();
        const opts = document.getElementById('chatbot-options-container');
        if (opts) opts.style.display = '';
        const conv = document.getElementById('chatbot-conversation');
        const messagesContainer = document.getElementById('chatbot-messages');
        if (conv && conv.classList.contains('active') && messagesContainer) {
            messagesContainer.innerHTML = '';
            const div = document.createElement('div');
            div.className = 'chatbot-message success';
            div.textContent = 'Tu consulta fue resuelta. Gracias por contactarnos.';
            messagesContainer.appendChild(div);
            renderOptions(MAIN_OPTIONS, handleOptionSelect);
        }
        void refreshRecentCard();
    }

    async function createTicketRemote(mensajeInicial, tipoConsulta) {
        const body = {
            mensajeInicial: String(mensajeInicial).slice(0, 4000),
            tipoConsulta: String(tipoConsulta || '').slice(0, 200)
        };
        const res = await fetch(`${API_BASE}/api/tickets`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (data.success && data.ticket && data.ticket._id) {
            saveTicketRefs(data.ticket._id);
            lastSeenAdminCount = (data.ticket.mensajes || []).filter(m => m.from === 'admin').length;
        }
        return Object.assign({}, data, { _httpStatus: res.status });
    }

    function stopTicketPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    function startTicketPolling() {
        stopTicketPolling();
        loadStoredTicketRefs();
        if (!activeTicketId || !isLoggedIn()) return;
        pollTimer = setInterval(syncTicketMessages, 5000);
        syncTicketMessages();
    }

    async function syncTicketMessages() {
        const url = ticketPollUrl();
        if (!url || !isLoggedIn()) return;
        try {
            const res = await fetch(url, { credentials: 'include' });
            if (res.status === 404) {
                handleTicketGoneMessage();
                return;
            }
            if (res.status === 401 || res.status === 403) return;
            const data = await res.json();
            if (!data.success || !data.ticket || !data.ticket.mensajes) return;
            const ticket = data.ticket;
            if (ticketEstaResuelto(ticket)) {
                handleTicketGoneMessage();
                return;
            }
            applyConversationModeFromTicket(ticket);
            const adminMsgs = ticket.mensajes.filter(m => m.from === 'admin');
            const conv = document.getElementById('chatbot-conversation');
            if (!conv || !conv.classList.contains('active')) return;
            for (let i = lastSeenAdminCount; i < adminMsgs.length; i++) {
                renderMessage(adminMsgs[i].texto, 'bot');
            }
            lastSeenAdminCount = adminMsgs.length;
        } catch (e) {
            console.warn('chatbot poll', e);
        }
    }

    function getOptionText(optionId) {
        const opt = MAIN_OPTIONS.find(o => o.id === optionId);
        if (opt) return opt.text;
        for (const flow of Object.values(FLOW_RESPONSES)) {
            const found = (flow.nextOptions || []).find(o => o.id === optionId);
            if (found) return found.text;
        }
        return optionId;
    }

    function renderMessage(text, type) {
        const container = document.getElementById('chatbot-messages');
        if (!container) return;
        const div = document.createElement('div');
        div.className = `chatbot-message ${type}`;
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function renderTypingIndicator() {
        const container = document.getElementById('chatbot-messages');
        if (!container) return null;
        const div = document.createElement('div');
        div.className = 'chatbot-typing';
        div.innerHTML = '<div class="chatbot-typing-dots"><span></span><span></span><span></span></div>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    }

    function removeTypingIndicator(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    function renderOptions(options, onSelect) {
        const container = document.getElementById('chatbot-options-container');
        if (!container) return;
        if (container.style.display === 'none') return;
        container.innerHTML = '';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `chatbot-option-btn ${opt.type || 'dark'}`;
            btn.textContent = opt.text;
            btn.dataset.optionId = opt.id;
            btn.addEventListener('click', () => onSelect(opt.id));
            container.appendChild(btn);
        });
    }

    function handleOptionSelect(optionId) {
        const flow = FLOW_RESPONSES[optionId];
        if (!flow) return;
        const composer = document.getElementById('chatbot-user-composer');
        if (composer && composer.classList.contains('visible')) return;

        const optionsContainer = document.getElementById('chatbot-options-container');
        renderMessage(getOptionText(optionId), 'user');

        if (optionsContainer) {
            optionsContainer.style.pointerEvents = 'none';
            optionsContainer.style.opacity = '0.6';
        }

        const typingEl = renderTypingIndicator();

        setTimeout(async () => {
            removeTypingIndicator(typingEl);
            if (optionsContainer) {
                optionsContainer.style.pointerEvents = '';
                optionsContainer.style.opacity = '1';
            }

            if (flow.createTicket) {
                const sessionOk = await reconcileSessionWithServer();
                if (!sessionOk || !isLoggedIn()) {
                    renderMessage(
                        'Necesitás tener la sesión activa. Iniciá sesión desde la página de login (mismo navegador y URL que usás para la tienda, p. ej. siempre localhost o siempre 127.0.0.1) y volvé a intentar.',
                        'bot'
                    );
                    renderOptions(MAIN_OPTIONS, handleOptionSelect);
                    return;
                }
                const label = getOptionText(optionId);
                const tipo = flow.tipoConsulta || 'Consulta';
                const data = await createTicketRemote(`[${tipo}] ${label}`, tipo);
                if (!data.success) {
                    let errMsg = 'No pudimos registrar tu consulta. Verificá tu conexión.';
                    if (data._httpStatus === 401) {
                        await reconcileSessionWithServer();
                        errMsg =
                            'Tu sesión no está activa en el servidor. Usá “Cerrar sesión” en el menú si aparece, iniciá sesión de nuevo y asegurate de usar la misma dirección (localhost o 127.0.0.1) en todo el sitio.';
                    } else if (data.message) {
                        errMsg = data.message;
                    }
                    renderMessage(errMsg, 'bot');
                    renderOptions(MAIN_OPTIONS, handleOptionSelect);
                    return;
                }
                startTicketPolling();
            }

            const isSuccess = !!flow.createTicket;
            renderMessage(flow.text, isSuccess ? 'success' : 'bot');

            if (flow.resetToMenu) {
                renderOptions(MAIN_OPTIONS, handleOptionSelect);
            } else if (flow.nextOptions && flow.nextOptions.length > 0) {
                renderOptions(flow.nextOptions, handleOptionSelect);
            } else {
                if (optionsContainer) optionsContainer.innerHTML = '';
                renderOptions(MAIN_OPTIONS, handleOptionSelect);
            }

            void refreshRecentCard();
        }, TYPING_DELAY_MS);
    }

    function showConversationView() {
        hideOverlays();
        const home = document.getElementById('chatbot-home');
        const conversation = document.getElementById('chatbot-conversation');
        if (home) home.classList.add('hidden');
        if (conversation) conversation.classList.add('active');
    }

    function showHomeView() {
        hideOverlays();
        const home = document.getElementById('chatbot-home');
        const conversation = document.getElementById('chatbot-conversation');
        if (home) home.classList.remove('hidden');
        if (conversation) conversation.classList.remove('active');
        hideLiveComposer();
        initChatHome();
    }

    function hideOverlays() {
        document.getElementById('chatbot-novedades-layer')?.classList.remove('open');
        document.getElementById('chatbot-ayuda-layer')?.classList.remove('open');
        document.getElementById('chatbot-auth-gate')?.classList.remove('open');
    }

    function showInitialOptions() {
        loadStoredTicketRefs();
        const messagesContainer = document.getElementById('chatbot-messages');
        const optionsContainer = document.getElementById('chatbot-options-container');
        if (messagesContainer) messagesContainer.innerHTML = '';
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            optionsContainer.style.display = '';
        }
        hideLiveComposer();
        lastSeenAdminCount = 0;
        if (activeTicketId && isLoggedIn()) {
            void fetchTicketAndShowHistory();
            return;
        }
        renderOptions(MAIN_OPTIONS, handleOptionSelect);
        if (activeTicketId) startTicketPolling();
    }

    async function fetchTicketAndShowHistory() {
        const url = ticketPollUrl();
        if (!url) {
            renderOptions(MAIN_OPTIONS, handleOptionSelect);
            return;
        }
        try {
            const res = await fetch(url, { credentials: 'include' });
            if (res.status === 404) {
                handleTicketGoneMessage();
                return;
            }
            if (res.status === 401 || res.status === 403) {
                renderOptions(MAIN_OPTIONS, handleOptionSelect);
                return;
            }
            const data = await res.json();
            if (data.success && data.ticket && data.ticket.mensajes) {
                if (ticketEstaResuelto(data.ticket)) {
                    handleTicketGoneMessage();
                    return;
                }
                data.ticket.mensajes.forEach(m => {
                    renderMessage(m.texto, m.from === 'admin' ? 'bot' : 'user');
                });
                lastSeenAdminCount = data.ticket.mensajes.filter(m => m.from === 'admin').length;
                applyConversationModeFromTicket(data.ticket);
                if (!conversacionConAgente(data.ticket)) {
                    renderOptions(MAIN_OPTIONS, handleOptionSelect);
                }
                startTicketPolling();
                return;
            }
        } catch (e) {
            console.warn(e);
        }
        renderOptions(MAIN_OPTIONS, handleOptionSelect);
    }

    async function showMessagesNav() {
        await reconcileSessionWithServer();
        loadStoredTicketRefs();
        showConversationView();
        const messagesContainer = document.getElementById('chatbot-messages');
        const optionsContainer = document.getElementById('chatbot-options-container');
        if (messagesContainer) messagesContainer.innerHTML = '';
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            optionsContainer.style.display = '';
        }
        hideLiveComposer();

        if (!isLoggedIn()) {
            renderMessage('Iniciá sesión para ver tus tickets.', 'bot');
            renderOptions(MAIN_OPTIONS, handleOptionSelect);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/tickets/mine`, { credentials: 'include' });
            const data = await res.json();
            if (!data.success || !data.tickets || !data.tickets.length) {
                renderMessage('No tenés consultas activas. Escribinos desde “Envíanos un mensaje” o pedí hablar con un agente.', 'bot');
                saveTicketRefs(null);
                renderOptions(MAIN_OPTIONS, handleOptionSelect);
                return;
            }
            const latest = data.tickets[0];
            saveTicketRefs(latest._id);
            latest.mensajes.forEach(m => {
                renderMessage(m.texto, m.from === 'admin' ? 'bot' : 'user');
            });
            lastSeenAdminCount = latest.mensajes.filter(m => m.from === 'admin').length;
            if (ticketEstaResuelto(latest)) {
                saveTicketRefs(null);
                renderMessage('Esta consulta ya fue cerrada.', 'bot');
                renderOptions(MAIN_OPTIONS, handleOptionSelect);
                return;
            }
            applyConversationModeFromTicket(latest);
            if (!conversacionConAgente(latest)) {
                renderOptions(MAIN_OPTIONS, handleOptionSelect);
            }
            startTicketPolling();
        } catch (e) {
            renderMessage('No se pudo cargar el historial.', 'bot');
            renderOptions(MAIN_OPTIONS, handleOptionSelect);
        }
    }

    function handleSendMessage() {
        showConversationView();
        showInitialOptions();
    }

    async function refreshRecentCard() {
        await reconcileSessionWithServer();
        const summaryEl = document.getElementById('chatbot-recent-summary');
        const timeEl = document.getElementById('chatbot-recent-time');
        const recentInner = document.getElementById('chatbot-recent-content');
        loadStoredTicketRefs();
        if (!summaryEl || !recentInner) return;

        if (!isLoggedIn()) {
            recentInner.classList.add('empty-state');
            summaryEl.textContent = 'Iniciá sesión para ver tu actividad';
            if (timeEl) timeEl.style.display = 'none';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/tickets/mine`, { credentials: 'include' });
            const data = await res.json();
            const tickets = data.success && data.tickets ? data.tickets : [];
            if (!tickets.length) {
                if (activeTicketId) saveTicketRefs(null);
                recentInner.classList.add('empty-state');
                summaryEl.textContent = 'No hay mensajes recientes';
                if (timeEl) timeEl.style.display = 'none';
                return;
            }
            const t = tickets[0];
            const stillExists = !activeTicketId || tickets.some(x => String(x._id) === String(activeTicketId));
            if (activeTicketId && !stillExists) saveTicketRefs(null);

            recentInner.classList.remove('empty-state');
            const estado = t.estado || '';
            summaryEl.textContent = `${t.tipoConsulta || 'Consulta'} · ${estado}`;
            if (timeEl) {
                timeEl.textContent = t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('es-AR') : '';
                timeEl.style.display = '';
            }
        } catch {
            recentInner.classList.add('empty-state');
            summaryEl.textContent = 'No hay mensajes recientes';
            if (timeEl) timeEl.style.display = 'none';
        }
    }

    function updateHeaderGreeting() {
        const el = document.getElementById('chatbot-header-greeting');
        if (!el) return;
        const name = getUserName();
        el.textContent = name ? `Hola, ${name} 👋` : 'Hola 👋';
    }

    async function sendUserLiveMessage() {
        const input = document.getElementById('chatbot-user-input');
        const texto = input && input.value ? input.value.trim() : '';
        if (!texto || !activeTicketId) return;
        const sessionOk = await reconcileSessionWithServer();
        if (!sessionOk || !isLoggedIn()) {
            renderMessage('Sesión no válida. Iniciá sesión de nuevo desde el sitio.', 'bot');
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/tickets/${activeTicketId}/messages`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto })
            });
            const data = await res.json();
            if (!data.success) {
                renderMessage(data.message || 'No se pudo enviar el mensaje.', 'bot');
                return;
            }
            renderMessage(texto, 'user');
            input.value = '';
            if (data.ticket) applyConversationModeFromTicket(data.ticket);
        } catch (e) {
            renderMessage('Error de conexión al enviar.', 'bot');
        }
    }

    function openAuthGate() {
        document.getElementById('chatbot-auth-gate')?.classList.add('open');
    }

    function initChatHome() {
        updateHeaderGreeting();
        void refreshRecentCard();

        const sendBtn = document.getElementById('chatbot-send-message-btn');
        if (sendBtn) sendBtn.onclick = handleSendMessage;

        const welcomeBtn = document.getElementById('chatbot-welcome-btn');
        if (welcomeBtn) welcomeBtn.onclick = (e) => {
            e.preventDefault();
            document.getElementById('chatbot-novedades-layer')?.classList.add('open');
        };

        const novClose = document.getElementById('chatbot-novedades-close');
        if (novClose) novClose.onclick = () => document.getElementById('chatbot-novedades-layer')?.classList.remove('open');

        const navHome = document.getElementById('chatbot-nav-home');
        if (navHome) navHome.onclick = (e) => {
            e.preventDefault();
            showHomeView();
        };

        const navMessages = document.getElementById('chatbot-nav-messages');
        if (navMessages) navMessages.onclick = (e) => {
            e.preventDefault();
            void showMessagesNav();
        };

        const navHelp = document.getElementById('chatbot-nav-help');
        if (navHelp) navHelp.onclick = (e) => {
            e.preventDefault();
            document.getElementById('chatbot-ayuda-layer')?.classList.add('open');
        };

        const ayudaClose = document.getElementById('chatbot-ayuda-close');
        if (ayudaClose) ayudaClose.onclick = () => {
            document.getElementById('chatbot-ayuda-layer')?.classList.remove('open');
        };

        const authGateClose = document.getElementById('chatbot-auth-gate-close');
        if (authGateClose) authGateClose.onclick = () => {
            document.getElementById('chatbot-auth-gate')?.classList.remove('open');
        };

        const gateSignup = document.getElementById('chatbot-gate-signup');
        if (gateSignup) gateSignup.onclick = () => {
            window.location.href = 'signup.html';
        };

        const gateLogin = document.getElementById('chatbot-gate-login');
        if (gateLogin) gateLogin.onclick = () => {
            window.location.href = 'Index.html';
        };

        const sendLive = document.getElementById('chatbot-user-send-btn');
        const inputLive = document.getElementById('chatbot-user-input');
        if (sendLive) sendLive.onclick = () => void sendUserLiveMessage();
        if (inputLive) {
            inputLive.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendUserLiveMessage();
                }
            };
        }
    }

    function toggleChat() {
        const overlay = document.getElementById('chatbot-overlay');
        const modal = document.getElementById('chatbot-modal');
        const home = document.getElementById('chatbot-home');
        const conversation = document.getElementById('chatbot-conversation');
        const isOpen = modal && modal.classList.contains('open');

        if (isOpen) {
            overlay?.classList.remove('open');
            modal?.classList.remove('open');
            stopTicketPolling();
            hideOverlays();
        } else {
            overlay?.classList.add('open');
            modal?.classList.add('open');
            if (home) home.classList.remove('hidden');
            if (conversation) conversation.classList.remove('active');
            hideOverlays();
            initChatHome();
            loadStoredTicketRefs();
            if (activeTicketId && isLoggedIn()) startTicketPolling();
        }
    }

    async function onFabClick(e) {
        e.preventDefault();
        e.stopPropagation();
        await reconcileSessionWithServer();
        if (!isLoggedIn()) {
            openAuthGate();
            return;
        }
        toggleChat();
    }

    async function handleRecentClick(e) {
        e.preventDefault();
        e.stopPropagation();
        await reconcileSessionWithServer();
        if (!isLoggedIn()) {
            openAuthGate();
            return;
        }
        const modal = document.getElementById('chatbot-modal');
        const overlay = document.getElementById('chatbot-overlay');
        if (modal && !modal.classList.contains('open')) {
            overlay?.classList.add('open');
            modal.classList.add('open');
            hideOverlays();
            initChatHome();
            loadStoredTicketRefs();
            if (activeTicketId) startTicketPolling();
        }
        void showMessagesNav();
    }

    function injectWidget() {
        if (document.getElementById('chatbot-modal')) return;

        const wrap = document.createElement('div');
        wrap.innerHTML = `
    <div class="chatbot-auth-gate" id="chatbot-auth-gate" aria-hidden="true">
        <div class="chatbot-auth-gate-card">
            <button type="button" class="chatbot-auth-gate-close" id="chatbot-auth-gate-close" aria-label="Cerrar">✕</button>
            <p class="chatbot-auth-gate-msg">Registrate para acceder a esta funcionalidad</p>
            <div class="chatbot-auth-gate-actions">
                <button type="button" class="chatbot-auth-btn chatbot-auth-btn-primary" id="chatbot-gate-signup">Crear cuenta</button>
                <button type="button" class="chatbot-auth-btn chatbot-auth-btn-secondary" id="chatbot-gate-login">Ya tengo cuenta — Iniciar sesión</button>
            </div>
        </div>
    </div>
    <div class="chatbot-fab-wrapper">
        <span class="chatbot-fab-tooltip">¿Necesitas ayuda?</span>
        <button type="button" class="chatbot-fab" id="chatbot-fab" aria-label="Abrir asistencia">
            <i class="fas fa-robot" aria-hidden="true"></i>
        </button>
    </div>
    <div class="chatbot-overlay" id="chatbot-overlay" aria-hidden="true"></div>
    <div class="chatbot-modal" id="chatbot-modal" role="dialog" aria-label="Atención al cliente">
        <header class="chatbot-header">
            <div class="chatbot-header-left">
                <div class="chatbot-avatar" aria-hidden="true">
                    <img class="chatbot-avatar-img" src="Imagenes/ImagendePerfilChatbot.png" width="40" height="40" alt="">
                </div>
                <div class="chatbot-header-brand">
                    <span class="chatbot-header-greeting" id="chatbot-header-greeting">Hola 👋</span>
                    <span class="chatbot-title-sub">Asistente MMDR</span>
                </div>
            </div>
            <button type="button" class="chatbot-close" id="chatbot-close" aria-label="Cerrar">✕</button>
        </header>
        <div class="chatbot-body">
            <div class="chatbot-home" id="chatbot-home">
                <div class="chatbot-menu-greeting">
                    <h2 class="chatbot-greeting-hola" id="chatbot-greeting-hola">¿Cómo podemos ayudarte?</h2>
                    <p class="chatbot-greeting-question">Elegí una opción o envianos un mensaje</p>
                </div>
                <div class="chatbot-menu-cards">
                    <div class="chatbot-menu-card chatbot-recent-card" id="chatbot-recent-card" role="button" tabindex="0">
                        <div class="chatbot-recent-title">Última actividad</div>
                        <div id="chatbot-recent-content" class="chatbot-recent-inner empty-state">
                            <div class="chatbot-recent-avatars">
                                <span class="chatbot-recent-av"></span>
                                <span class="chatbot-recent-av accent"></span>
                            </div>
                            <div class="chatbot-recent-info">
                                <span class="chatbot-recent-name">Soporte</span>
                                <span class="chatbot-recent-summary" id="chatbot-recent-summary">No hay mensajes recientes</span>
                            </div>
                            <span class="chatbot-recent-time" id="chatbot-recent-time"></span>
                        </div>
                    </div>
                    <button type="button" class="chatbot-menu-card chatbot-send-message-btn" id="chatbot-send-message-btn">
                        <span>Envíanos un mensaje</span>
                        <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="chatbot-menu-card chatbot-welcome-card chatbot-welcome-btn" id="chatbot-welcome-btn">
                        <span class="chatbot-welcome-emoji" aria-hidden="true">🚀</span>
                        <span class="chatbot-welcome-title">Bienvenido a la nueva plataforma MMDR-Ecommerce</span>
                        <span class="chatbot-welcome-hint">Tocá para ver novedades</span>
                    </button>
                </div>
                <nav class="chatbot-menu-nav" aria-label="Navegación del chat">
                    <button type="button" class="chatbot-nav-item" id="chatbot-nav-home"><span class="chatbot-nav-emoji">🏠</span><span>Inicio</span></button>
                    <button type="button" class="chatbot-nav-item" id="chatbot-nav-messages"><span class="chatbot-nav-emoji">💬</span><span>Mensajes</span></button>
                    <button type="button" class="chatbot-nav-item" id="chatbot-nav-help"><span class="chatbot-nav-emoji">🆘</span><span>Ayuda</span></button>
                </nav>
            </div>
            <div class="chatbot-conversation" id="chatbot-conversation">
                <div class="chatbot-messages" id="chatbot-messages"></div>
                <div class="chatbot-options" id="chatbot-options-container"></div>
                <div class="chatbot-user-composer" id="chatbot-user-composer">
                    <textarea id="chatbot-user-input" rows="2" placeholder="Escribí tu mensaje al equipo..." maxlength="4000"></textarea>
                    <button type="button" class="chatbot-user-send" id="chatbot-user-send-btn">Enviar</button>
                </div>
            </div>
            <div class="chatbot-subpanel" id="chatbot-novedades-layer" aria-hidden="true">
                <div class="chatbot-subpanel-card">
                    <div class="chatbot-subpanel-head">
                        <h3>Novedades MMDR</h3>
                        <button type="button" class="chatbot-subpanel-close" id="chatbot-novedades-close" aria-label="Cerrar">✕</button>
                    </div>
                    <div class="chatbot-subpanel-body">${NOVEDADES_HTML}</div>
                </div>
            </div>
            <div class="chatbot-subpanel" id="chatbot-ayuda-layer" aria-hidden="true">
                <div class="chatbot-subpanel-card">
                    <div class="chatbot-subpanel-head">
                        <h3>Ayuda rápida</h3>
                        <button type="button" class="chatbot-subpanel-close" id="chatbot-ayuda-close" aria-label="Cerrar">✕</button>
                    </div>
                    <div class="chatbot-subpanel-body">${AYUDA_HTML}</div>
                </div>
            </div>
        </div>
    </div>`;
        while (wrap.firstChild) {
            document.body.appendChild(wrap.firstChild);
        }
    }

    document.addEventListener('DOMContentLoaded', async function () {
        injectWidget();
        await reconcileSessionWithServer();
        initChatHome();
        document.getElementById('chatbot-fab')?.addEventListener('click', (ev) => void onFabClick(ev));
        document.getElementById('chatbot-close')?.addEventListener('click', toggleChat);
        document.getElementById('chatbot-overlay')?.addEventListener('click', toggleChat);
        document.getElementById('chatbot-auth-gate')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
        });
        document.getElementById('chatbot-recent-card')?.addEventListener('click', (ev) => void handleRecentClick(ev));
        document.getElementById('chatbot-recent-card')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') void handleRecentClick(e);
        });
    });
})();
