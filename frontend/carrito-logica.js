// ===== SISTEMA COMPLETO DE CARRITO DE COMPRAS =====
// Solo lógica - sin diseño

// ===== CONFIGURACIÓN =====
const CARRITO_CONFIG = {
    STORAGE_KEY: 'mmdr_carrito',
    EXPIRACION_KEY: 'mmdr_carrito_expiracion',
    DURACION_HORAS: 24, // Duración del carrito en horas
    DURACION_MS: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
    API_BASE_URL: 'http://localhost:4000'
};

// ===== CLASE PRINCIPAL DEL CARRITO =====
class CarritoCompras {
    constructor() {
        this.items = [];
        this.inicializar();
    }

    // Inicializar carrito
    inicializar() {
        this.verificarExpiracion();
        this.cargarDesdeStorage();
        this.actualizarUI();
    }

    // Verificar si el carrito expiró
    verificarExpiracion() {
        const expiracion = localStorage.getItem(CARRITO_CONFIG.EXPIRACION_KEY);
        
        if (expiracion) {
            const ahora = new Date().getTime();
            const tiempoExpiracion = parseInt(expiracion);
            
            if (ahora > tiempoExpiracion) {
                console.log('⏰ Carrito expirado - Limpiando...');
                this.limpiarCarrito();
                return true;
            }
        } else {
            // Si no hay fecha de expiración, establecer una nueva
            this.actualizarExpiracion();
        }
        
        return false;
    }

    // Actualizar fecha de expiración
    actualizarExpiracion() {
        const ahora = new Date().getTime();
        const expiracion = ahora + CARRITO_CONFIG.DURACION_MS;
        localStorage.setItem(CARRITO_CONFIG.EXPIRACION_KEY, expiracion.toString());
        console.log(`⏰ Carrito válido por ${CARRITO_CONFIG.DURACION_HORAS} horas`);
    }

    // Cargar carrito desde localStorage
    cargarDesdeStorage() {
        try {
            const carritoGuardado = localStorage.getItem(CARRITO_CONFIG.STORAGE_KEY);
            if (carritoGuardado) {
                this.items = JSON.parse(carritoGuardado);
                console.log(`✅ Carrito cargado: ${this.items.length} items`);
            }
        } catch (error) {
            console.error('❌ Error cargando carrito:', error);
            this.items = [];
        }
    }

    // Guardar carrito en localStorage
    guardarEnStorage() {
        try {
            localStorage.setItem(CARRITO_CONFIG.STORAGE_KEY, JSON.stringify(this.items));
            this.actualizarExpiracion();
            console.log('💾 Carrito guardado');
        } catch (error) {
            console.error('❌ Error guardando carrito:', error);
        }
    }

    // Agregar producto al carrito con validación de stock
    async agregarProducto(producto) {
        // Verificar que el producto tenga los datos necesarios
        if (!producto || !producto.id) {
            console.error('❌ Producto inválido');
            return false;
        }

        // Buscar si el producto ya existe
        const itemExistente = this.items.find(item => item.id === producto.id);
        const cantidadActual = itemExistente ? itemExistente.cantidad : 0;
        const cantidadNueva = cantidadActual + 1;

        // Validar stock disponible
        const stockDisponible = await this.verificarStockProducto(producto.id, cantidadNueva);
        
        if (!stockDisponible.disponible) {
            this.mostrarNotificacion(stockDisponible.mensaje || 'Stock insuficiente', 'error');
            console.warn(`⚠️ Stock insuficiente para ${producto.nombre || producto.name}`);
            return false;
        }

        if (itemExistente) {
            // Si existe, aumentar cantidad
            itemExistente.cantidad++;
            console.log(`📦 Cantidad actualizada: ${producto.nombre} x${itemExistente.cantidad}`);
        } else {
            // Si no existe, agregar nuevo item
            const nuevoItem = {
                id: producto.id,
                nombre: producto.nombre || producto.name,
                precio: producto.precio || producto.price,
                imagen: producto.imagen || producto.image,
                cantidad: 1,
                stockMaximo: stockDisponible.stockDisponible,
                agregadoEl: new Date().getTime()
            };
            this.items.push(nuevoItem);
            console.log(`✅ Producto agregado: ${nuevoItem.nombre}`);
        }

        this.guardarEnStorage();
        this.actualizarUI();
        
        return true;
    }

    // Verificar stock de un producto
    async verificarStockProducto(productoId, cantidadSolicitada) {
        try {
            const response = await fetch(`${CARRITO_CONFIG.API_BASE_URL}/api/inventory/validar-stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productos: [{ id: productoId, cantidad: cantidadSolicitada }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.productos[0] || { disponible: true };
            }
            
            return { disponible: true }; // Si falla la validación, permitir (fallback)
        } catch (error) {
            console.warn('⚠️ No se pudo validar stock, permitiendo operación:', error);
            return { disponible: true }; // Fallback permisivo
        }
    }

    // Validar todo el carrito antes de checkout
    async validarStockCarrito() {
        if (this.items.length === 0) {
            return { valido: false, mensaje: 'El carrito está vacío' };
        }

        try {
            const productos = this.items.map(item => ({
                id: item.id,
                cantidad: item.cantidad
            }));

            const response = await fetch(`${CARRITO_CONFIG.API_BASE_URL}/api/inventory/validar-stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productos })
            });

            if (response.ok) {
                const data = await response.json();
                
                if (!data.todoDisponible) {
                    const sinStock = data.productos.filter(p => !p.disponible);
                    const mensajes = sinStock.map(p => `${p.nombre}: ${p.mensaje}`);
                    return {
                        valido: false,
                        mensaje: 'Algunos productos no tienen stock suficiente',
                        productos: sinStock,
                        detalles: mensajes
                    };
                }
                
                return { valido: true };
            }
            
            return { valido: true }; // Fallback permisivo
        } catch (error) {
            console.warn('⚠️ No se pudo validar stock del carrito:', error);
            return { valido: true }; // Fallback permisivo
        }
    }

    // Eliminar producto del carrito
    eliminarProducto(productoId) {
        const indexAntes = this.items.length;
        this.items = this.items.filter(item => item.id !== productoId);
        
        if (this.items.length < indexAntes) {
            console.log(`🗑️ Producto eliminado del carrito`);
            this.guardarEnStorage();
            this.actualizarUI();
            return true;
        }
        
        return false;
    }

    // Actualizar cantidad de un producto
    actualizarCantidad(productoId, nuevaCantidad) {
        const item = this.items.find(item => item.id === productoId);
        
        if (item) {
            if (nuevaCantidad <= 0) {
                // Si la cantidad es 0 o menor, eliminar
                return this.eliminarProducto(productoId);
            }
            
            item.cantidad = nuevaCantidad;
            console.log(`📊 Cantidad actualizada: ${item.nombre} x${nuevaCantidad}`);
            this.guardarEnStorage();
            this.actualizarUI();
            return true;
        }
        
        return false;
    }

    // Aumentar cantidad en 1 con validación de stock
    async aumentarCantidad(productoId) {
        const item = this.items.find(item => item.id === productoId);
        if (item) {
            // Validar stock antes de aumentar
            const stockDisponible = await this.verificarStockProducto(productoId, item.cantidad + 1);
            
            if (!stockDisponible.disponible) {
                this.mostrarNotificacion(stockDisponible.mensaje || 'Stock máximo alcanzado', 'error');
                return false;
            }
            
            item.cantidad++;
            this.guardarEnStorage();
            this.actualizarUI();
            return true;
        }
        return false;
    }

    // Disminuir cantidad en 1
    disminuirCantidad(productoId) {
        const item = this.items.find(item => item.id === productoId);
        if (item) {
            if (item.cantidad > 1) {
                item.cantidad--;
                this.guardarEnStorage();
                this.actualizarUI();
                return true;
            } else {
                // Si la cantidad es 1, eliminar el producto
                return this.eliminarProducto(productoId);
            }
        }
        return false;
    }

    // Obtener todos los items del carrito
    obtenerItems() {
        return [...this.items];
    }

    // Obtener cantidad total de items
    obtenerCantidadTotal() {
        return this.items.reduce((total, item) => total + item.cantidad, 0);
    }

    // Calcular subtotal
    calcularSubtotal() {
        return this.items.reduce((total, item) => {
            return total + (item.precio * item.cantidad);
        }, 0);
    }

    // Calcular total (puede incluir impuestos, envío, etc.)
    calcularTotal(impuestos = 0, envio = 0) {
        const subtotal = this.calcularSubtotal();
        return subtotal + impuestos + envio;
    }

    // Verificar si un producto está en el carrito
    existeProducto(productoId) {
        return this.items.some(item => item.id === productoId);
    }

    // Obtener cantidad de un producto específico
    obtenerCantidadProducto(productoId) {
        const item = this.items.find(item => item.id === productoId);
        return item ? item.cantidad : 0;
    }

    // Limpiar todo el carrito
    limpiarCarrito() {
        this.items = [];
        localStorage.removeItem(CARRITO_CONFIG.STORAGE_KEY);
        localStorage.removeItem(CARRITO_CONFIG.EXPIRACION_KEY);
        this.actualizarUI();
        console.log('🗑️ Carrito limpiado completamente');
    }

    // Actualizar todos los elementos de UI
    actualizarUI() {
        this.actualizarBadge();
        this.actualizarMiniCarrito();
    }

    // Actualizar badge del carrito (contador)
    actualizarBadge() {
        const badges = document.querySelectorAll('.cart-badge, .carrito-badge, [data-carrito-badge]');
        const cantidad = this.obtenerCantidadTotal();
        
        badges.forEach(badge => {
            badge.textContent = cantidad;
            badge.style.display = cantidad > 0 ? 'flex' : 'none';
        });
    }

    // Actualizar mini carrito (ventana desplegable)
    actualizarMiniCarrito() {
        const miniCarrito = document.getElementById('mini-carrito');
        if (!miniCarrito) return;

        const contenido = miniCarrito.querySelector('.mini-carrito-items');
        const subtotalEl = miniCarrito.querySelector('.mini-carrito-subtotal');
        
        if (!contenido) return;

        if (this.items.length === 0) {
            contenido.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío</p>';
            if (subtotalEl) subtotalEl.textContent = '$0';
            return;
        }

        // Renderizar items
        contenido.innerHTML = this.items.map(item => `
            <div class="mini-carrito-item" data-id="${item.id}">
                <img src="${item.imagen}" alt="${item.nombre}" class="mini-item-imagen">
                <div class="mini-item-info">
                    <h4 class="mini-item-nombre">${item.nombre}</h4>
                    <p class="mini-item-precio">$${this.formatearPrecio(item.precio)} x ${item.cantidad}</p>
                    <p class="mini-item-total">$${this.formatearPrecio(item.precio * item.cantidad)}</p>
                </div>
                <button class="mini-item-eliminar" onclick="carrito.eliminarProducto('${item.id}')">✕</button>
            </div>
        `).join('');

        // Actualizar subtotal
        if (subtotalEl) {
            subtotalEl.textContent = `$${this.formatearPrecio(this.calcularSubtotal())}`;
        }
    }

    // Toggle del mini carrito
    toggleMiniCarrito() {
        const miniCarrito = document.getElementById('mini-carrito');
        if (miniCarrito) {
            miniCarrito.classList.toggle('active');
        }
    }

    // Cerrar mini carrito
    cerrarMiniCarrito() {
        const miniCarrito = document.getElementById('mini-carrito');
        if (miniCarrito) {
            miniCarrito.classList.remove('active');
        }
    }

    // Ir a la página del carrito completo
    irACarritoCompleto() {
        this.cerrarMiniCarrito();
        window.location.href = 'card.html';
    }

    // Ir a productos para continuar comprando
    irAProductos() {
        this.cerrarMiniCarrito();
        window.location.href = 'productos.html';
    }

    // Formatear precio
    formatearPrecio(precio) {
        return new Intl.NumberFormat('es-AR').format(precio);
    }

    // Mostrar notificación
    mostrarNotificacion(mensaje, tipo = 'success') {
        // Crear elemento de notificación
        const notif = document.createElement('div');
        notif.className = `carrito-notificacion ${tipo}`;
        notif.textContent = mensaje;
        
        // Estilos inline para que funcione sin CSS
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
            setTimeout(() => document.body.removeChild(notif), 300);
        }, 3000);
    }

    // Obtener información del carrito
    obtenerInfo() {
        return {
            items: this.obtenerItems(),
            cantidadTotal: this.obtenerCantidadTotal(),
            subtotal: this.calcularSubtotal(),
            total: this.calcularTotal()
        };
    }
}

// ===== INSTANCIA GLOBAL DEL CARRITO =====
let carrito;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Inicializando sistema de carrito...');
    carrito = new CarritoCompras();
    inicializarEventosCarrito();
    console.log('✅ Sistema de carrito listo');
});

// ===== EVENTOS DEL CARRITO =====
function inicializarEventosCarrito() {
    // Event listener para íconos del carrito
    const iconosCarrito = document.querySelectorAll('.fa-shopping-cart, [data-carrito-toggle], .carrito-icono, .carrito-wrapper, #carrito-icon');
    console.log('🛒 Iconos del carrito encontrados:', iconosCarrito.length);
    
    iconosCarrito.forEach(icono => {
        icono.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🛒 Click en carrito detectado');
            if (carrito) {
                carrito.toggleMiniCarrito();
            }
        });
    });

    // Event listener para cerrar mini carrito al hacer clic fuera
    document.addEventListener('click', (e) => {
        const miniCarrito = document.getElementById('mini-carrito');
        const iconosCarrito = document.querySelectorAll('.fa-shopping-cart, [data-carrito-toggle], .carrito-icono');
        
        if (miniCarrito && miniCarrito.classList.contains('active')) {
            const clickEnCarrito = miniCarrito.contains(e.target);
            const clickEnIcono = Array.from(iconosCarrito).some(icono => icono.contains(e.target));
            
            if (!clickEnCarrito && !clickEnIcono) {
                carrito.cerrarMiniCarrito();
            }
        }
    });

    // Event listener para botón "Ver carrito completo"
    const btnVerCarrito = document.querySelector('[data-ir-carrito], .btn-ver-carrito');
    if (btnVerCarrito) {
        btnVerCarrito.addEventListener('click', () => carrito.irACarritoCompleto());
    }

    // Verificar expiración periódicamente (cada 5 minutos)
    setInterval(() => {
        if (carrito && carrito.verificarExpiracion()) {
            carrito.mostrarNotificacion('Tu carrito ha expirado y fue limpiado', 'error');
        }
    }, 5 * 60 * 1000);
}

// ===== FUNCIONES AUXILIARES GLOBALES =====

// Función para agregar producto desde botones
function agregarAlCarrito(productoId, productoNombre, productoPrecio, productoImagen) {
    if (!carrito) {
        console.error('❌ Carrito no inicializado');
        return;
    }

    const producto = {
        id: productoId || Date.now().toString(),
        nombre: productoNombre,
        precio: productoPrecio,
        imagen: productoImagen
    };

    carrito.agregarProducto(producto);
}

// Función para agregar desde objeto producto
function agregarProductoAlCarrito(producto) {
    if (!carrito) {
        console.error('❌ Carrito no inicializado');
        return;
    }
    return carrito.agregarProducto(producto);
}

// Función global para cerrar mini-carrito
function cerrarMiniCarrito() {
    if (carrito) {
        carrito.cerrarMiniCarrito();
    } else {
        // Fallback si el carrito no está inicializado
        const miniCarrito = document.getElementById('mini-carrito');
        if (miniCarrito) {
            miniCarrito.classList.remove('active');
        }
    }
}

// Exportar carrito para uso global
window.carrito = carrito;
window.agregarAlCarrito = agregarAlCarrito;
window.agregarProductoAlCarrito = agregarProductoAlCarrito;
window.cerrarMiniCarrito = cerrarMiniCarrito;

console.log('✅ carrito-logica.js cargado');

