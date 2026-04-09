// ===== LÓGICA PARA LA PÁGINA DEL CARRITO COMPLETO (card.html) =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Inicializando página del carrito completo...');
    
    // Esperar a que el carrito esté inicializado
    if (typeof carrito === 'undefined') {
        console.log('⏳ Esperando inicialización del carrito...');
        setTimeout(() => inicializarPaginaCarrito(), 100);
    } else {
        inicializarPaginaCarrito();
    }
});

function inicializarPaginaCarrito() {
    renderizarCarritoCompleto();
    inicializarEventosCard();
    console.log('✅ Página del carrito lista');
}

// ===== RENDERIZAR CARRITO COMPLETO =====
function renderizarCarritoCompleto() {
    const contenedorItems = document.getElementById('carrito-items') || 
                           document.querySelector('.carrito-items') ||
                           document.querySelector('[data-carrito-items]');
    
    if (!contenedorItems) {
        console.error('❌ No se encontró el contenedor de items del carrito');
        return;
    }

    const items = carrito.obtenerItems();

    // Si el carrito está vacío
    if (items.length === 0) {
        contenedorItems.innerHTML = `
            <div class="carrito-vacio-completo">
                <i class="fas fa-shopping-cart"></i>
                <h2>Tu carrito está vacío</h2>
                <p>¡Agrega algunos productos increíbles!</p>
                <a href="productos.html" class="btn-ir-productos">Ver Productos</a>
            </div>
        `;
        actualizarTotalesCard(0, 0, 0);
        return;
    }

    // Renderizar items
    contenedorItems.innerHTML = items.map(item => crearFilaProducto(item)).join('');
    
    // Actualizar totales
    actualizarTotalesCard();
}

// ===== CREAR FILA DE PRODUCTO =====
function crearFilaProducto(item) {
    const subtotal = item.precio * item.cantidad;
    
    return `
        <div class="carrito-item" data-id="${item.id}">
            <div class="item-imagen">
                <img src="${item.imagen}" alt="${item.nombre}" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22%3ESin imagen%3C/text%3E%3C/svg%3E'">
            </div>
            
            <div class="item-detalles">
                <h3 class="item-nombre">${item.nombre}</h3>
                <p class="item-precio-unitario">Precio unitario: $${carrito.formatearPrecio(item.precio)}</p>
            </div>
            
            <div class="item-cantidad">
                <button class="btn-cantidad btn-disminuir" onclick="modificarCantidad('${item.id}', 'disminuir')" title="Disminuir cantidad">
                    <i class="fas fa-minus"></i>
                </button>
                <input type="number" 
                       class="input-cantidad" 
                       value="${item.cantidad}" 
                       min="1" 
                       max="99"
                       data-id="${item.id}"
                       onchange="cambiarCantidadInput(this, '${item.id}')">
                <button class="btn-cantidad btn-aumentar" onclick="modificarCantidad('${item.id}', 'aumentar')" title="Aumentar cantidad">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            
            <div class="item-subtotal">
                <span class="subtotal-label">Subtotal:</span>
                <span class="subtotal-valor">$${carrito.formatearPrecio(subtotal)}</span>
            </div>
            
            <div class="item-acciones">
                <button class="btn-eliminar-item" onclick="eliminarDelCarrito('${item.id}')" title="Eliminar producto">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `;
}

// ===== MODIFICAR CANTIDAD =====
async function modificarCantidad(productoId, accion) {
    if (accion === 'aumentar') {
        const resultado = await carrito.aumentarCantidad(productoId);
        if (!resultado) {
            // Si no se pudo aumentar (stock insuficiente), no hacer nada más
            return;
        }
    } else if (accion === 'disminuir') {
        carrito.disminuirCantidad(productoId);
    }
    
    renderizarCarritoCompleto();
}

// ===== CAMBIAR CANTIDAD DESDE INPUT =====
function cambiarCantidadInput(input, productoId) {
    const nuevaCantidad = parseInt(input.value);
    
    if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
        input.value = 1;
        carrito.actualizarCantidad(productoId, 1);
    } else if (nuevaCantidad > 99) {
        input.value = 99;
        carrito.actualizarCantidad(productoId, 99);
    } else {
        carrito.actualizarCantidad(productoId, nuevaCantidad);
    }
    
    renderizarCarritoCompleto();
}

// ===== ELIMINAR DEL CARRITO =====
function eliminarDelCarrito(productoId) {
    // Confirmar eliminación
    if (confirm('¿Estás seguro de que quieres eliminar este producto del carrito?')) {
        carrito.eliminarProducto(productoId);
        renderizarCarritoCompleto();
    }
}

// ===== ACTUALIZAR TOTALES =====
function actualizarTotalesCard(subtotalParam = null, impuestosParam = 0, envioParam = 0) {
    const subtotal = subtotalParam !== null ? subtotalParam : carrito.calcularSubtotal();
    const impuestos = impuestosParam; // Puedes calcular % si quieres
    const envio = envioParam; // Puedes calcular según lógica
    const total = subtotal + impuestos + envio;

    // Actualizar elementos en la página
    const elementoSubtotal = document.getElementById('carrito-subtotal') || 
                            document.querySelector('.carrito-subtotal') ||
                            document.querySelector('[data-subtotal]');
    
    const elementoImpuestos = document.getElementById('carrito-impuestos') || 
                             document.querySelector('.carrito-impuestos') ||
                             document.querySelector('[data-impuestos]');
    
    const elementoEnvio = document.getElementById('carrito-envio') || 
                         document.querySelector('.carrito-envio') ||
                         document.querySelector('[data-envio]');
    
    const elementoTotal = document.getElementById('carrito-total') || 
                         document.querySelector('.carrito-total') ||
                         document.querySelector('[data-total]');

    if (elementoSubtotal) elementoSubtotal.textContent = `$${carrito.formatearPrecio(subtotal)}`;
    if (elementoImpuestos) elementoImpuestos.textContent = `$${carrito.formatearPrecio(impuestos)}`;
    if (elementoEnvio) elementoEnvio.textContent = envio === 0 ? 'Gratis' : `$${carrito.formatearPrecio(envio)}`;
    if (elementoTotal) elementoTotal.textContent = `$${carrito.formatearPrecio(total)}`;

    // Actualizar cantidad total de items
    const cantidadTotal = carrito.obtenerCantidadTotal();
    const elementoCantidad = document.getElementById('carrito-cantidad-items') ||
                            document.querySelector('.carrito-cantidad-items') ||
                            document.querySelector('[data-cantidad-items]');
    
    if (elementoCantidad) {
        elementoCantidad.textContent = `${cantidadTotal} ${cantidadTotal === 1 ? 'producto' : 'productos'}`;
    }
}

// ===== LIMPIAR TODO EL CARRITO =====
function limpiarCarritoCompleto() {
    if (confirm('¿Estás seguro de que quieres vaciar todo el carrito?')) {
        carrito.limpiarCarrito();
        renderizarCarritoCompleto();
    }
}

// ===== PROCEDER AL CHECKOUT =====
async function irAlCheckout() {
    const items = carrito.obtenerItems();
    
    if (items.length === 0) {
        alert('Tu carrito está vacío. Agrega algunos productos primero.');
        return;
    }
    
    // Mostrar loading
    const btnCheckout = document.getElementById('btn-checkout') || document.querySelector('.btn-checkout');
    if (btnCheckout) {
        btnCheckout.disabled = true;
        btnCheckout.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando stock...';
    }
    
    try {
        // Validar stock antes de ir al checkout
        const validacion = await carrito.validarStockCarrito();
        
        if (!validacion.valido) {
            let mensaje = 'Algunos productos no tienen stock suficiente:\n\n';
            if (validacion.detalles) {
                mensaje += validacion.detalles.join('\n');
            }
            alert(mensaje);
            
            if (btnCheckout) {
                btnCheckout.disabled = false;
                btnCheckout.innerHTML = 'Proceder al Checkout <i class="fas fa-arrow-right"></i>';
            }
            return;
        }
        
        // Guardar datos para el checkout
        const checkoutData = {
            items: items,
            subtotal: carrito.calcularSubtotal(),
            envio: 0,
            total: carrito.calcularTotal()
        };
        
        localStorage.setItem('mmdr_checkout_data', JSON.stringify(checkoutData));
        
        // Redirigir a la página de checkout
        window.location.href = 'checkout.html';
        
    } catch (error) {
        console.error('Error validando stock:', error);
        // Permitir continuar si hay error de validación
        window.location.href = 'checkout.html';
    }
}

// ===== CONTINUAR COMPRANDO =====
function continuarComprando() {
    window.location.href = 'productos.html';
}

// ===== APLICAR CUPÓN DE DESCUENTO =====
function aplicarCupon() {
    const inputCupon = document.getElementById('input-cupon') || 
                       document.querySelector('.input-cupon') ||
                       document.querySelector('[data-cupon]');
    
    if (!inputCupon) return;
    
    const codigoCupon = inputCupon.value.trim().toUpperCase();
    
    if (!codigoCupon) {
        alert('Por favor ingresa un código de cupón');
        return;
    }

    // Aquí puedes agregar lógica para validar cupones
    // Por ahora, un ejemplo simple
    const cuponesValidos = {
        'DESCUENTO10': 10,
        'DESCUENTO20': 20,
        'PRIMERACOMPRA': 15
    };

    if (cuponesValidos[codigoCupon]) {
        const descuento = cuponesValidos[codigoCupon];
        alert(`¡Cupón aplicado! ${descuento}% de descuento`);
        // Aquí puedes actualizar los totales con el descuento
    } else {
        alert('Cupón inválido o expirado');
    }
}

// ===== EVENTOS DE LA PÁGINA =====
function inicializarEventosCard() {
    // Botón limpiar carrito
    const btnLimpiar = document.getElementById('btn-limpiar-carrito') ||
                      document.querySelector('.btn-limpiar-carrito') ||
                      document.querySelector('[data-limpiar-carrito]');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarCarritoCompleto);
    }

    // Botón proceder al checkout
    const btnCheckout = document.getElementById('btn-checkout') ||
                       document.querySelector('.btn-checkout') ||
                       document.querySelector('[data-checkout]');
    if (btnCheckout) {
        btnCheckout.addEventListener('click', irAlCheckout);
    }

    // Botón continuar comprando
    const btnContinuar = document.getElementById('btn-continuar-comprando') ||
                        document.querySelector('.btn-continuar-comprando') ||
                        document.querySelector('[data-continuar-comprando]');
    if (btnContinuar) {
        btnContinuar.addEventListener('click', continuarComprando);
    }

    // Botón aplicar cupón
    const btnCupon = document.getElementById('btn-aplicar-cupon') ||
                     document.querySelector('.btn-aplicar-cupon') ||
                     document.querySelector('[data-aplicar-cupon]');
    if (btnCupon) {
        btnCupon.addEventListener('click', aplicarCupon);
    }

    // Actualizar cada 30 segundos para verificar expiración
    setInterval(() => {
        if (carrito && carrito.verificarExpiracion()) {
            alert('Tu carrito ha expirado y fue limpiado');
            renderizarCarritoCompleto();
        }
    }, 30000);
}

// ===== CALCULAR ENVÍO (EJEMPLO) =====
function calcularEnvio(subtotal) {
    // Lógica de ejemplo
    if (subtotal >= 50000) {
        return 0; // Envío gratis por compras mayores a $50,000
    } else {
        return 5000; // Envío estándar $5,000
    }
}

// ===== CALCULAR IMPUESTOS (EJEMPLO) =====
function calcularImpuestos(subtotal) {
    // Ejemplo: 21% de IVA
    return subtotal * 0.21;
}

// ===== EXPORTAR FUNCIONES GLOBALES =====
window.modificarCantidad = modificarCantidad;
window.cambiarCantidadInput = cambiarCantidadInput;
window.eliminarDelCarrito = eliminarDelCarrito;
window.limpiarCarritoCompleto = limpiarCarritoCompleto;
window.irAlCheckout = irAlCheckout;
window.continuarComprando = continuarComprando;
window.aplicarCupon = aplicarCupon;
window.renderizarCarritoCompleto = renderizarCarritoCompleto;

console.log('✅ card-logica.js cargado');

