// ===== SCRIPT PARA LA PÁGINA DEL CARRITO COMPLETO (card.html) =====

// Configuración
const CART_CONFIG = {
    API_BASE_URL: 'http://localhost:4000',
    STORAGE_KEY: 'mmdr_carrito'
};

// Variables globales
let carritoCompleto = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Inicializando página del carrito completo...');
    inicializarCarritoCompleto();
    cargarProductosRecomendados();
    console.log('✅ Página del carrito lista');
});

// ===== FUNCIONES PRINCIPALES =====

function inicializarCarritoCompleto() {
    // Cargar carrito desde localStorage
    cargarCarritoDesdeStorage();
    
    // Renderizar items del carrito
    renderizarItemsCarrito();
    
    // Actualizar totales
    actualizarTotales();
    
    // Configurar eventos
    configurarEventosCarrito();
}

function cargarCarritoDesdeStorage() {
    try {
        const carritoGuardado = localStorage.getItem(CART_CONFIG.STORAGE_KEY);
        if (carritoGuardado) {
            carritoCompleto = JSON.parse(carritoGuardado);
            console.log('✅ Carrito cargado:', carritoCompleto.length, 'items');
        } else {
            carritoCompleto = [];
            console.log('📦 Carrito vacío');
        }
    } catch (error) {
        console.error('❌ Error cargando carrito:', error);
        carritoCompleto = [];
    }
}

function guardarCarritoEnStorage() {
    try {
        localStorage.setItem(CART_CONFIG.STORAGE_KEY, JSON.stringify(carritoCompleto));
        console.log('💾 Carrito guardado');
    } catch (error) {
        console.error('❌ Error guardando carrito:', error);
    }
}

function renderizarItemsCarrito() {
    const contenedor = document.getElementById('cart-items');
    if (!contenedor) return;

    if (carritoCompleto.length === 0) {
        contenedor.innerHTML = `
            <div class="carrito-vacio-completo">
                <i class="fas fa-shopping-cart"></i>
                <h2>Tu carrito está vacío</h2>
                <p>Agrega algunos productos para comenzar tu compra</p>
                <a href="productos.html" class="btn-ir-productos">
                    <i class="fas fa-shopping-bag"></i>
                    Ver Productos
                </a>
            </div>
        `;
        return;
    }

    // Renderizar items
    contenedor.innerHTML = carritoCompleto.map(item => `
        <div class="cart-item carrito-item" data-id="${item.id}">
            <div class="item-image item-imagen">
                <img src="${item.imagen}" alt="${item.nombre}"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22120%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2212%22%3ESin imagen%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="item-details item-detalles">
                <h3 class="item-name item-nombre">${item.nombre}</h3>
                <p class="item-price item-precio-unitario">$${formatearPrecio(item.precio)} c/u</p>
            </div>
            <div class="quantity-controls item-cantidad">
                <button class="quantity-btn btn-cantidad" onclick="cambiarCantidad('${item.id}', ${item.cantidad - 1})">
                    <i class="fas fa-minus"></i>
                </button>
                <input type="number" class="input-cantidad" value="${item.cantidad}" 
                       min="1" max="99" onchange="cambiarCantidad('${item.id}', parseInt(this.value))">
                <button class="quantity-btn btn-cantidad" onclick="cambiarCantidad('${item.id}', ${item.cantidad + 1})">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="item-total item-subtotal">
                <span class="subtotal-label">Subtotal</span>
                <span class="subtotal-valor">$${formatearPrecio(item.precio * item.cantidad)}</span>
            </div>
            <button class="remove-btn btn-eliminar-item" onclick="eliminarItem('${item.id}')">
                <i class="fas fa-trash"></i>
                Eliminar
            </button>
        </div>
    `).join('');
}

function actualizarTotales() {
    const subtotal = carritoCompleto.reduce((total, item) => total + (item.precio * item.cantidad), 0);
    const envio = 0; // Envío gratis
    const total = subtotal + envio;

    // Actualizar elementos
    const subtotalEl = document.getElementById('subtotal');
    const envioEl = document.getElementById('shipping');
    const totalEl = document.getElementById('total');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (subtotalEl) subtotalEl.textContent = `$${formatearPrecio(subtotal)}`;
    if (envioEl) envioEl.textContent = 'Gratis';
    if (totalEl) totalEl.textContent = `$${formatearPrecio(total)}`;
    
    // Habilitar/deshabilitar botón de checkout
    if (checkoutBtn) {
        checkoutBtn.disabled = carritoCompleto.length === 0;
        if (carritoCompleto.length > 0) {
            checkoutBtn.classList.add('enabled');
        } else {
            checkoutBtn.classList.remove('enabled');
        }
    }
}

function configurarEventosCarrito() {
    // Evento del botón de checkout
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', procederAlCheckout);
    }
}

// ===== FUNCIONES DE MANIPULACIÓN DEL CARRITO =====

function cambiarCantidad(productoId, nuevaCantidad) {
    const item = carritoCompleto.find(item => item.id === productoId);
    
    if (!item) return;

    if (nuevaCantidad <= 0) {
        eliminarItem(productoId);
        return;
    }

    if (nuevaCantidad > 99) {
        nuevaCantidad = 99;
    }

    item.cantidad = nuevaCantidad;
    guardarCarritoEnStorage();
    renderizarItemsCarrito();
    actualizarTotales();
    
    mostrarNotificacion(`Cantidad actualizada: ${item.nombre} x${nuevaCantidad}`);
}

function eliminarItem(productoId) {
    const itemIndex = carritoCompleto.findIndex(item => item.id === productoId);
    
    if (itemIndex === -1) return;

    const item = carritoCompleto[itemIndex];
    carritoCompleto.splice(itemIndex, 1);
    
    guardarCarritoEnStorage();
    renderizarItemsCarrito();
    actualizarTotales();
    
    mostrarNotificacion(`${item.nombre} eliminado del carrito`, 'error');
}

function limpiarCarrito() {
    if (carritoCompleto.length === 0) return;
    
    carritoCompleto = [];
    guardarCarritoEnStorage();
    renderizarItemsCarrito();
    actualizarTotales();
    
    mostrarNotificacion('Carrito limpiado completamente', 'error');
}

// ===== FUNCIONES DE NAVEGACIÓN =====

function procederAlCheckout() {
    if (carritoCompleto.length === 0) {
        mostrarNotificacion('Tu carrito está vacío', 'error');
        return;
    }

    // Guardar datos del carrito para el checkout
    const datosCheckout = {
        items: carritoCompleto,
        subtotal: carritoCompleto.reduce((total, item) => total + (item.precio * item.cantidad), 0),
        envio: 0,
        total: carritoCompleto.reduce((total, item) => total + (item.precio * item.cantidad), 0)
    };

    localStorage.setItem('mmdr_checkout_data', JSON.stringify(datosCheckout));
    
    // Redirigir al checkout
    window.location.href = 'checkout.html';
}

function volverAProductos() {
    window.location.href = 'productos.html';
}

// ===== FUNCIONES DE PRODUCTOS RECOMENDADOS =====

async function cargarProductosRecomendados() {
    try {
        const respuesta = await fetch(`${CART_CONFIG.API_BASE_URL}/api/products?limit=4&featured=true`);
        
        if (!respuesta.ok) {
            throw new Error(`Error del servidor: ${respuesta.status}`);
        }
        
        const data = await respuesta.json();
        const productos = data.data || data.products || [];
        
        renderizarProductosRecomendados(productos);
        
    } catch (error) {
        console.error('❌ Error cargando productos recomendados:', error);
        // Ocultar sección si hay error
        const seccionRecomendados = document.querySelector('.recommended-section');
        if (seccionRecomendados) {
            seccionRecomendados.style.display = 'none';
        }
    }
}

function renderizarProductosRecomendados(productos) {
    const contenedor = document.getElementById('recommended-products');
    if (!contenedor || productos.length === 0) return;

    contenedor.innerHTML = productos.map(producto => `
        <div class="recommended-product">
            <div class="recommended-image">
                <img src="${producto.image}" alt="${producto.name}" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2216%22%3ESin imagen%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="recommended-info">
                <h4>${producto.name}</h4>
                <p class="recommended-price">$${formatearPrecio(producto.price)}</p>
                <button class="btn-agregar-recomendado" onclick="agregarProductoRecomendado('${producto._id}', '${producto.name}', ${producto.price}, '${producto.image}')">
                    <i class="fas fa-plus"></i>
                    Agregar
                </button>
            </div>
        </div>
    `).join('');
}

function agregarProductoRecomendado(id, nombre, precio, imagen) {
    const producto = { id, nombre, precio, imagen, cantidad: 1 };
    
    // Buscar si ya existe
    const itemExistente = carritoCompleto.find(item => item.id === id);
    
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carritoCompleto.push(producto);
    }
    
    guardarCarritoEnStorage();
    renderizarItemsCarrito();
    actualizarTotales();
    
    mostrarNotificacion(`${nombre} agregado al carrito`);
}

// ===== FUNCIONES AUXILIARES =====

function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-AR').format(precio);
}

function mostrarNotificacion(mensaje, tipo = 'success') {
    // Crear elemento de notificación
    const notif = document.createElement('div');
    notif.className = `carrito-notificacion ${tipo}`;
    notif.textContent = mensaje;
    
    // Estilos inline
    Object.assign(notif.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        background: tipo === 'success' ? '#27ae60' : '#e74c3c',
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        zIndex: '10000',
        fontWeight: '600',
        transform: 'translateX(400px)',
        transition: 'transform 0.3s ease'
    });
    
    document.body.appendChild(notif);
    
    // Animar entrada
    setTimeout(() => notif.style.transform = 'translateX(0)', 100);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notif.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (document.body.contains(notif)) {
                document.body.removeChild(notif);
            }
        }, 300);
    }, 3000);
}

// ===== FUNCIONES GLOBALES =====

// Exportar funciones para uso global
window.cambiarCantidad = cambiarCantidad;
window.eliminarItem = eliminarItem;
window.limpiarCarrito = limpiarCarrito;
window.procederAlCheckout = procederAlCheckout;
window.volverAProductos = volverAProductos;
window.agregarProductoRecomendado = agregarProductoRecomendado;

console.log('✅ cart-scripts.js cargado');
