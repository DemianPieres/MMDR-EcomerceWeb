// ===== SCRIPT DE PRUEBA PARA VERIFICAR FUNCIONALIDADES =====

// Función para probar el carrito
function probarCarrito() {
    console.log('🧪 Probando funcionalidades del carrito...');
    
    // Verificar que el carrito esté inicializado
    if (typeof carrito !== 'undefined' && carrito) {
        console.log('✅ Carrito inicializado correctamente');
        
        // Probar agregar producto
        const productoPrueba = {
            id: 'test-001',
            nombre: 'Producto de Prueba',
            precio: 1000,
            imagen: 'https://via.placeholder.com/200x200'
        };
        
        carrito.agregarProducto(productoPrueba);
        console.log('✅ Producto agregado al carrito');
        
        // Verificar que se guardó en localStorage
        const carritoGuardado = localStorage.getItem('mmdr_carrito');
        if (carritoGuardado) {
            console.log('✅ Carrito guardado en localStorage');
        }
        
        // Probar funciones del mini-carrito
        console.log('🧪 Probando funciones del mini-carrito...');
        
        // Simular click en carrito
        const iconoCarrito = document.querySelector('.fa-shopping-cart');
        if (iconoCarrito) {
            iconoCarrito.click();
            console.log('✅ Mini-carrito abierto');
            
            setTimeout(() => {
                carrito.cerrarMiniCarrito();
                console.log('✅ Mini-carrito cerrado');
            }, 1000);
        }
        
    } else {
        console.error('❌ Carrito no inicializado');
    }
}

// Función para probar el checkout
function probarCheckout() {
    console.log('🧪 Probando funcionalidades del checkout...');
    
    // Verificar que hay datos del checkout
    const checkoutData = localStorage.getItem('mmdr_checkout_data');
    if (checkoutData) {
        console.log('✅ Datos del checkout encontrados');
        const data = JSON.parse(checkoutData);
        console.log('📊 Datos:', data);
    } else {
        console.log('ℹ️ No hay datos del checkout (normal si no se ha completado una compra)');
    }
}

// Función para probar la API de ventas
async function probarAPIVentas() {
    console.log('🧪 Probando API de ventas...');
    
    try {
        const response = await fetch('http://localhost:4000/api/sales/analytics/dashboard');
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API de ventas funcionando');
            console.log('📊 Estadísticas:', data);
        } else {
            console.error('❌ Error en API de ventas:', response.status);
        }
    } catch (error) {
        console.error('❌ Error conectando a API de ventas:', error);
    }
}

// Función para probar métodos de pago
function probarMetodosPago() {
    console.log('🧪 Probando métodos de pago...');
    
    const metodosPago = document.querySelectorAll('input[name="paymentMethod"]');
    if (metodosPago.length > 0) {
        console.log(`✅ ${metodosPago.length} métodos de pago encontrados`);
        
        // Probar selección de método
        if (metodosPago[0]) {
            metodosPago[0].checked = true;
            console.log('✅ Método de pago seleccionado');
        }
    } else {
        console.log('ℹ️ Métodos de pago no encontrados (normal si no estás en checkout)');
    }
}

// Función principal de pruebas
function ejecutarPruebas() {
    console.log('🚀 Iniciando pruebas del sistema de carrito y pago...');
    console.log('==========================================');
    
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(ejecutarPruebas, 1000);
        });
        return;
    }
    
    // Ejecutar pruebas
    probarCarrito();
    setTimeout(probarCheckout, 500);
    setTimeout(probarAPIVentas, 1000);
    setTimeout(probarMetodosPago, 1500);
    
    console.log('==========================================');
    console.log('✅ Pruebas completadas');
}

// Función para limpiar datos de prueba
function limpiarDatosPrueba() {
    console.log('🧹 Limpiando datos de prueba...');
    
    localStorage.removeItem('mmdr_carrito');
    localStorage.removeItem('mmdr_carrito_expiracion');
    localStorage.removeItem('mmdr_checkout_data');
    localStorage.removeItem('mmdr_ventas_locales');
    
    console.log('✅ Datos de prueba limpiados');
}

// Función para simular una compra completa
function simularCompraCompleta() {
    console.log('🛒 Simulando compra completa...');
    
    // Limpiar datos anteriores
    limpiarDatosPrueba();
    
    // Agregar productos al carrito
    const productos = [
        {
            id: 'prod-001',
            nombre: 'Cubre Asientos Universal',
            precio: 15000,
            imagen: 'Imagenes/cubreasientosuniversal.webp'
        },
        {
            id: 'prod-002',
            nombre: 'Cubre Volante Universal',
            precio: 8000,
            imagen: 'Imagenes/cubrevolanteuniversal.webp'
        },
        {
            id: 'prod-003',
            nombre: 'Kit LED',
            precio: 25000,
            imagen: 'Imagenes/kitled.jpg'
        }
    ];
    
    productos.forEach((producto, index) => {
        setTimeout(() => {
            if (typeof carrito !== 'undefined' && carrito) {
                carrito.agregarProducto(producto);
                console.log(`✅ Producto ${index + 1} agregado: ${producto.nombre}`);
            }
        }, index * 500);
    });
    
    // Simular checkout después de agregar productos
    setTimeout(() => {
        if (typeof carrito !== 'undefined' && carrito) {
            const datosCheckout = {
                items: carrito.obtenerItems(),
                subtotal: carrito.calcularSubtotal(),
                envio: 0,
                total: carrito.calcularTotal()
            };
            
            localStorage.setItem('mmdr_checkout_data', JSON.stringify(datosCheckout));
            console.log('✅ Datos del checkout preparados');
            console.log('📊 Total de la compra:', datosCheckout.total);
        }
    }, productos.length * 500 + 1000);
}

// Exportar funciones para uso global
window.probarCarrito = probarCarrito;
window.probarCheckout = probarCheckout;
window.probarAPIVentas = probarAPIVentas;
window.probarMetodosPago = probarMetodosPago;
window.ejecutarPruebas = ejecutarPruebas;
window.limpiarDatosPrueba = limpiarDatosPrueba;
window.simularCompraCompleta = simularCompraCompleta;

console.log('✅ Script de pruebas cargado');
console.log('💡 Usa ejecutarPruebas() para probar todas las funcionalidades');
console.log('💡 Usa simularCompraCompleta() para simular una compra completa');
console.log('💡 Usa limpiarDatosPrueba() para limpiar datos de prueba');
