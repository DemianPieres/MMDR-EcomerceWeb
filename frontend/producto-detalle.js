/**
 * Página de detalle de producto - Datos dinámicos desde API
 */

function resolveApiBaseUrl() {
    if (typeof window === 'undefined') return 'http://localhost:4000';
    if (window.MMDR_API_BASE) return window.MMDR_API_BASE;
    const h = window.location.hostname;
    return h ? `http://${h}:4000` : 'http://localhost:4000';
}

const API_BASE_URL = resolveApiBaseUrl();
if (typeof window !== 'undefined') {
    window.MMDR_API_BASE = API_BASE_URL;
}
let productoActual = null;
let ratingSeleccionado = 0;
let pollingResenasId = null;
const REVIEW_REFRESH_MS = 8000;
const GUEST_REVIEW_NAME_KEY = 'mmdr_guest_review_name';

// Obtener ID de producto desde URL
function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Formatear precio
function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-AR').format(precio);
}

// Cargar producto
async function cargarProducto() {
    const id = getProductId();
    if (!id) {
        mostrarError();
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(id)}`, {
            headers: { Accept: 'application/json' }
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || json.success === false) {
            console.error('Detalle producto:', res.status, json);
            mostrarError();
            return;
        }

        productoActual = json.data || json;
        renderizarProducto();
        inicializarResenas();
        cargarProductosRelacionados();
    } catch (err) {
        console.error('Error cargando producto:', err);
        mostrarError();
    }
}

function mostrarError() {
    document.getElementById('product-loading').style.display = 'none';
    document.getElementById('product-error').style.display = 'block';
}

function renderizarProducto() {
    document.getElementById('product-loading').style.display = 'none';
    document.getElementById('product-content').style.display = 'grid';

    const p = productoActual;
    const nombre = p.name || p.nombre || 'Sin nombre';
    const precio = p.price || p.precio || 0;
    const descripcion = p.description || p.descripcion || '';
    const imagen = p.image || p.imagen || '';
    const stock = p.stock ?? 0;
    const descuento = p.discount || p.descuento || 0;
    const rating = p.rating ?? 5;

    // Imágenes (una principal; si hay más en tags u otro campo, se pueden agregar)
    const imagenes = [imagen];
    renderizarGaleria(imagenes);

    document.getElementById('product-title').textContent = nombre;
    document.getElementById('product-price').textContent = `$ ${formatearPrecio(precio)}`;

    const cuotas = Math.ceil(precio / 12);
    document.getElementById('product-cuotas').textContent = `12 cuotas de $ ${formatearPrecio(cuotas)}`;
    document.getElementById('product-tax-note').textContent = `Precio sin impuestos nacionales: $${formatearPrecio(precio)}`;

    document.getElementById('stock-label').textContent = stock > 0 ? 'Stock disponible' : 'Sin stock';
    document.getElementById('stock-available').textContent = stock > 0 ? `(+${stock} disponibles)` : '';

    const qtySelect = document.getElementById('product-quantity');
    qtySelect.innerHTML = '';
    const maxQty = Math.min(stock || 1, 50);
    for (let i = 1; i <= maxQty; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${i} unidad${i > 1 ? 'es' : ''}`;
        qtySelect.appendChild(opt);
    }

    if (descuento > 0) {
        document.getElementById('product-badge').style.display = 'inline-block';
        document.getElementById('product-badge').textContent = `-${descuento}%`;
    }

    if (descripcion) {
        document.getElementById('product-description-section').style.display = 'block';
        document.getElementById('product-description-text').textContent = descripcion;
    }

    document.getElementById('btn-add-cart').disabled = stock <= 0;
    document.getElementById('btn-buy-now').disabled = stock <= 0;

    actualizarFavorito();
    configurarAcciones();
}

function renderizarGaleria(imagenes) {
    const thumbsContainer = document.getElementById('gallery-thumbnails');
    const mainImg = document.getElementById('product-main-image');

    thumbsContainer.innerHTML = '';
    const imgs = imagenes.filter(Boolean);
    if (imgs.length === 0) {
        mainImg.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ESin imagen%3C/text%3E%3C/svg%3E';
        return;
    }

    mainImg.src = imgs[0];
    mainImg.alt = productoActual?.name || 'Producto';
    mainImg.onerror = function() {
        this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ESin imagen%3C/text%3E%3C/svg%3E';
    };

    imgs.forEach((src, i) => {
        const thumb = document.createElement('div');
        thumb.className = `gallery-thumb ${i === 0 ? 'active' : ''}`;
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        thumb.appendChild(img);
        thumb.addEventListener('click', () => {
            document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            mainImg.src = src;
        });
        thumbsContainer.appendChild(thumb);
    });
}

async function cargarProductosRelacionados() {
    const container = document.getElementById('related-products');
    try {
        const res = await fetch(`${API_BASE_URL}/api/products?limit=6`);
        const json = await res.json();
        const productos = json.data || json.products || [];
        const idActual = productoActual?._id?.toString();
        const relacionados = productos.filter(p => p._id?.toString() !== idActual).slice(0, 4);

        container.innerHTML = '';
        relacionados.forEach(p => {
            const card = document.createElement('div');
            card.className = 'related-product-card';
            const nombre = p.name || p.nombre || '';
            const precio = p.price || p.precio || 0;
            const img = p.image || p.imagen || '';
            const id = p._id || p.id;
            card.innerHTML = `
                <img src="${img}" alt="${nombre}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3C/svg%3E'">
                <div class="related-product-info">
                    <h3>${nombre}</h3>
                    <span class="related-product-price">$${formatearPrecio(precio)}</span>
                </div>
            `;
            card.onclick = () => window.location.href = `producto-detalle.html?id=${id}`;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error cargando relacionados:', err);
    }
}

function configurarAcciones() {
    document.getElementById('btn-add-cart')?.addEventListener('click', agregarAlCarrito);
    document.getElementById('btn-buy-now')?.addEventListener('click', comprarAhora);
    document.getElementById('btn-favorite')?.addEventListener('click', toggleFavorito);
}

function agregarAlCarrito() {
    if (!productoActual) return;
    const cantidad = parseInt(document.getElementById('product-quantity').value) || 1;
    const producto = {
        id: productoActual._id,
        nombre: productoActual.name || productoActual.nombre,
        precio: productoActual.price || productoActual.precio,
        imagen: productoActual.image || productoActual.imagen
    };
    for (let i = 0; i < cantidad; i++) {
        if (typeof carrito !== 'undefined' && carrito) {
            carrito.agregarProducto(producto);
        } else {
            localStorage.setItem('producto_pendiente', JSON.stringify({ ...producto, cantidad }));
        }
    }
    mostrarNotificacion('Producto agregado al carrito', 'success');
}

function comprarAhora() {
    agregarAlCarrito();
    setTimeout(() => { window.location.href = 'checkout.html'; }, 500);
}

function actualizarFavorito() {
    if (!productoActual) return;
    const id = productoActual._id?.toString();
    const estaEnFavoritos = typeof favoritos !== 'undefined' && favoritos?.existeProducto(id);
    const btn = document.getElementById('btn-favorite');
    if (btn) {
        btn.classList.toggle('active', estaEnFavoritos);
        btn.querySelector('i').className = estaEnFavoritos ? 'fas fa-heart' : 'far fa-heart';
    }
}

function toggleFavorito() {
    if (!productoActual || typeof favoritos === 'undefined') return;
    const p = productoActual;
    const prod = {
        id: p._id,
        nombre: p.name || p.nombre,
        precio: p.price || p.precio,
        imagen: p.image || p.imagen,
        categoria: p.category || p.categoria || ''
    };
    if (favoritos.existeProducto(p._id)) {
        favoritos.eliminarProducto(p._id);
    } else {
        favoritos.agregarProducto(prod);
    }
    actualizarFavorito();
}

function mostrarNotificacion(msg, tipo) {
    const div = document.createElement('div');
    div.className = `notification ${tipo}`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// ===== RESEÑAS =====

function inicializarResenas() {
    configurarInputChatResena();
    configurarSelectorRating();
    void cargarResenas();
    iniciarPollingResenas();
}

async function cargarResenas() {
    const id = productoActual?._id;
    if (!id) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/reviews/product/${id}`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.message || 'No se pudieron cargar las reseñas');
        }

        const reviews = json.data || [];
        const stats = json.stats || { avgRating: 0, totalRatings: 0 };
        ratingSeleccionado = Number(json.userRating || 0);

        renderizarResumenRating(stats);
        renderizarListaResenas(reviews);
        actualizarEstrellasInput(ratingSeleccionado);
        actualizarHintRating();
    } catch (err) {
        console.error('Error cargando reseñas:', err);
        document.getElementById('reviews-list').innerHTML = '<div class="reviews-empty">No se pudieron cargar las reseñas.</div>';
    }
}

function renderizarResumenRating(stats) {
    const avg = Number(stats.avgRating || 0);
    const total = Number(stats.totalRatings || 0);

    document.getElementById('reviews-avg').textContent = avg.toFixed(1);
    document.getElementById('reviews-count').textContent = `${total} valoraciones`;

    const starsEl = document.getElementById('reviews-stars');
    const full = Math.round(avg);
    starsEl.innerHTML = '<i class="fas fa-star"></i>'.repeat(full) + '<i class="far fa-star"></i>'.repeat(5 - full);
}

function renderizarListaResenas(reviews) {
    const listEl = document.getElementById('reviews-list');
    if (!reviews.length) {
        listEl.innerHTML = '<div class="reviews-empty">Todavía no hay mensajes. ¡Escribí el primero!</div>';
        return;
    }

    listEl.innerHTML = reviews.map((review) => `
        <article class="review-chat-item" data-review-id="${review._id}">
            <header class="review-chat-head">
                <span class="review-chat-author">${review.userName || 'Anónimo'}</span>
                <time class="review-chat-time">${formatearFechaHora(review.createdAt)}</time>
            </header>
            <p class="review-chat-message">${escapeHtml(review.comment || '')}</p>
        </article>
    `).join('');
    listEl.scrollTop = listEl.scrollHeight;
}

function configurarInputChatResena() {
    const input = document.getElementById('review-chat-input');
    const btn = document.getElementById('btn-send-review');
    if (!input || !btn) return;

    if (!input.dataset.wired) {
        input.dataset.wired = '1';
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void publicarResenaChat();
            }
        });
    }

    if (!btn.dataset.wired) {
        btn.dataset.wired = '1';
        btn.addEventListener('click', () => {
            void publicarResenaChat();
        });
    }
}

async function publicarResenaChat() {
    const input = document.getElementById('review-chat-input');
    const texto = input?.value?.trim() || '';
    if (!texto) return;

    const userName = obtenerNombreUsuarioDisponible();
    if (!userName) {
        mostrarNotificacion('Necesitás iniciar sesión o indicar un nombre para publicar.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/reviews/product/${productoActual._id}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: texto, userName })
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
            mostrarNotificacion(json.message || 'No se pudo publicar la reseña', 'error');
            return;
        }

        input.value = '';
        await cargarResenas();
    } catch (err) {
        mostrarNotificacion('Error de conexión', 'error');
    }
}

function configurarSelectorRating() {
    const ratingSelect = document.getElementById('rating-select');
    if (!ratingSelect || ratingSelect.dataset.wired) return;

    ratingSelect.dataset.wired = '1';
    ratingSelect.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-rating]');
        if (!btn) return;
        const rating = Number(btn.dataset.rating || 0);
        if (!rating) return;
        void guardarRatingUsuario(rating);
    });
}

async function guardarRatingUsuario(rating) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/reviews/product/${productoActual._id}/rating`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating })
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
            mostrarNotificacion(json.message || 'No se pudo guardar tu calificación', 'error');
            return;
        }

        ratingSeleccionado = rating;
        actualizarEstrellasInput(ratingSeleccionado);
        if (json.stats) {
            renderizarResumenRating(json.stats);
        }
        mostrarNotificacion('Calificación guardada', 'success');
    } catch (err) {
        mostrarNotificacion('Error de conexión', 'error');
    }
}

function actualizarEstrellasInput(rating) {
    const buttons = document.querySelectorAll('#rating-select button[data-rating]');
    buttons.forEach((btn) => {
        const current = Number(btn.dataset.rating || 0);
        const active = current <= rating;
        btn.classList.toggle('active', active);
        btn.querySelector('i').className = active ? 'fas fa-star' : 'far fa-star';
    });
}

function iniciarPollingResenas() {
    if (pollingResenasId) {
        clearInterval(pollingResenasId);
    }
    pollingResenasId = setInterval(() => {
        void cargarResenas();
    }, REVIEW_REFRESH_MS);
}

function obtenerNombreUsuarioDisponible() {
    try {
        const localUser = JSON.parse(localStorage.getItem('usuario') || 'null');
        const nombreSesion = typeof localUser?.name === 'string' ? localUser.name.trim() : '';
        if (nombreSesion) return nombreSesion;
    } catch (error) {
        console.warn('No se pudo leer el usuario de sesión local.', error);
    }

    const nombreGuardado = (localStorage.getItem(GUEST_REVIEW_NAME_KEY) || '').trim();
    if (nombreGuardado) return nombreGuardado;

    const nombreIngresado = (window.prompt('Ingresá tu nombre para publicar la reseña:') || '').trim();
    if (!nombreIngresado) return '';
    localStorage.setItem(GUEST_REVIEW_NAME_KEY, nombreIngresado);
    return nombreIngresado;
}

function actualizarHintRating() {
    const hint = document.getElementById('rating-login-hint');
    if (!hint) return;
    const hayUsuario = !!obtenerUsuarioLocal();
    hint.textContent = hayUsuario
        ? (ratingSeleccionado ? `Tu calificación actual: ${ratingSeleccionado} estrella${ratingSeleccionado > 1 ? 's' : ''}` : 'Podés calificar este producto de 1 a 5 estrellas.')
        : 'Iniciá sesión para guardar tu calificación.';
}

function obtenerUsuarioLocal() {
    try {
        return JSON.parse(localStorage.getItem('usuario') || 'null');
    } catch {
        return null;
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatearFechaHora(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

document.addEventListener('DOMContentLoaded', () => {
    cargarProducto();
    setTimeout(() => {
        if (typeof favoritos !== 'undefined') favoritos.actualizarIconosCorazon();
        if (typeof carrito !== 'undefined' && carrito?.actualizarBadge) carrito.actualizarBadge();
    }, 500);
});
