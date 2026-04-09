require('dotenv').config();
const mongoose = require('mongoose');
const Sale = require('./src/models/sale');
const Product = require('./src/models/product');
const User = require('./src/models/user');

// Conexión a MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        process.exit(1);
    }
}

// Función para generar datos de ventas desde enero 2025 hasta 06/12/2025
async function insertSales2025() {
    try {
        // Obtener productos existentes
        const productos = await Product.find({ isActive: true });
        if (productos.length === 0) {
            console.log('❌ No hay productos disponibles. Ejecuta insert-sample-products.js primero.');
            return;
        }

        // Obtener usuarios existentes
        const usuarios = await User.find({});
        if (usuarios.length === 0) {
            console.log('❌ No hay usuarios disponibles. Ejecuta insert-sample-users.js primero.');
            return;
        }

        console.log('🚀 Insertando datos de ventas desde enero 2025 hasta 06/12/2025...');

        // Eliminar ventas existentes de 2025 para evitar duplicados
        const fechaInicio2025 = new Date(2025, 0, 1);
        const fechaFin2025 = new Date(2025, 11, 31, 23, 59, 59);
        const ventas2025Existentes = await Sale.countDocuments({
            fechaCreacion: {
                $gte: fechaInicio2025,
                $lte: fechaFin2025
            }
        });

        if (ventas2025Existentes > 0) {
            console.log(`⚠️  Encontradas ${ventas2025Existentes} ventas existentes de 2025. Eliminándolas...`);
            await Sale.deleteMany({
                fechaCreacion: {
                    $gte: fechaInicio2025,
                    $lte: fechaFin2025
                }
            });
            console.log('✅ Ventas de 2025 eliminadas.');
        }

        const ventasGeneradas = [];
        const metodosPago = ['credit-card', 'debit-card', 'prepaid-card', 'paypal', 'apple-pay', 'google-pay', 'bank-transfer', 'bnpl', 'cash-on-delivery'];
        
        // Obtener el último número de orden existente
        const ultimaVenta = await Sale.findOne().sort({ numeroOrden: -1 });
        let numeroOrdenContador = 1000;
        if (ultimaVenta && ultimaVenta.numeroOrden) {
            const ultimoNumero = parseInt(ultimaVenta.numeroOrden.replace('V-', ''));
            numeroOrdenContador = ultimoNumero + 1;
        }

        // Generar ventas desde enero 2025 hasta diciembre 6, 2025
        const fechaInicio = new Date(2025, 0, 1); // Enero 1, 2025
        const fechaFin = new Date(2025, 11, 6, 23, 59, 59); // Diciembre 6, 2025, 23:59:59

        // Generar ventas mes por mes con variación realista pero consistente
        for (let mes = 0; mes < 12; mes++) {
            const anio = 2025;
            const diasEnMes = new Date(anio, mes + 1, 0).getDate();
            
            // Determinar cuántas ventas generar por mes (variación realista pero abundante)
            // Base de ventas más alta para todos los meses con progresión gradual
            let ventasEnMes;
            const variacion = 20; // Variación de ±20 ventas para hacer más dinámico
            
            if (mes === 0) { // Enero - Inicio de año
                ventasEnMes = 85 + Math.floor(Math.random() * variacion); // 85-105 ventas
            } else if (mes === 1) { // Febrero - Temporada baja
                ventasEnMes = 75 + Math.floor(Math.random() * variacion); // 75-95 ventas
            } else if (mes === 2) { // Marzo - Recuperación
                ventasEnMes = 90 + Math.floor(Math.random() * variacion); // 90-110 ventas
            } else if (mes === 3) { // Abril - Estable
                ventasEnMes = 100 + Math.floor(Math.random() * variacion); // 100-120 ventas
            } else if (mes === 4) { // Mayo - Crecimiento
                ventasEnMes = 110 + Math.floor(Math.random() * variacion); // 110-130 ventas
            } else if (mes === 5) { // Junio - Buen ritmo
                ventasEnMes = 115 + Math.floor(Math.random() * variacion); // 115-135 ventas
            } else if (mes === 6) { // Julio - Temporada alta
                ventasEnMes = 130 + Math.floor(Math.random() * variacion); // 130-150 ventas
            } else if (mes === 7) { // Agosto - Mantiene nivel
                ventasEnMes = 135 + Math.floor(Math.random() * variacion); // 135-155 ventas
            } else if (mes === 8) { // Septiembre - Sube
                ventasEnMes = 140 + Math.floor(Math.random() * variacion); // 140-160 ventas
            } else if (mes === 9) { // Octubre - Pico del año
                ventasEnMes = 165 + Math.floor(Math.random() * variacion); // 165-185 ventas
            } else if (mes === 10) { // Noviembre - Alto nivel
                ventasEnMes = 150 + Math.floor(Math.random() * variacion); // 150-170 ventas
            } else { // Diciembre (solo hasta el día 6) - Proporcional a los días
                // Para 6 días de diciembre, generar proporcionalmente a un mes completo
                // Si un mes normal tiene ~140 ventas, 6 días sería ~28 ventas
                ventasEnMes = 30 + Math.floor(Math.random() * 15); // 30-45 ventas en 6 días
            }

            // Limitar diciembre a solo 6 días
            const diasMaximos = (mes === 11) ? 6 : diasEnMes;

            for (let i = 0; i < ventasEnMes; i++) {
                // Fecha aleatoria del mes
                const dia = Math.floor(Math.random() * diasMaximos) + 1;
                const fechaVenta = new Date(anio, mes, dia, Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));

                // Seleccionar entre 1 y 5 productos aleatorios (más variación)
                const numProductos = Math.floor(Math.random() * 5) + 1;
                const productosVenta = [];
                const productosUsados = new Set();

                for (let j = 0; j < numProductos; j++) {
                    let productoAleatorio;
                    do {
                        productoAleatorio = productos[Math.floor(Math.random() * productos.length)];
                    } while (productosUsados.has(productoAleatorio._id.toString()));
                    
                    productosUsados.add(productoAleatorio._id.toString());
                    
                    // Variar cantidad entre 1 y 4 unidades para mayor diversidad
                    const cantidad = Math.floor(Math.random() * 4) + 1;
                    const subtotal = productoAleatorio.price * cantidad;
                    
                    productosVenta.push({
                        id: productoAleatorio._id.toString(),
                        nombre: productoAleatorio.name,
                        precio: productoAleatorio.price,
                        cantidad: cantidad,
                        subtotal: subtotal
                    });
                }

                const subtotal = productosVenta.reduce((sum, p) => sum + p.subtotal, 0);
                const envio = subtotal < 50000 ? 5000 : 0;
                const total = subtotal + envio;

                // Seleccionar usuario aleatorio
                const usuarioAleatorio = usuarios[Math.floor(Math.random() * usuarios.length)];
                
                // Seleccionar método de pago aleatorio
                const metodoPagoAleatorio = metodosPago[Math.floor(Math.random() * metodosPago.length)];

                const venta = {
                    numeroOrden: `V-${numeroOrdenContador}`,
                    cliente: {
                        nombre: usuarioAleatorio.name,
                        email: usuarioAleatorio.email,
                        telefono: `+54 9 11 ${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
                        direccion: {
                            calle: `Av. Ejemplo ${Math.floor(Math.random() * 9999)}`,
                            ciudad: 'Buenos Aires',
                            provincia: 'Buenos Aires',
                            codigoPostal: `${Math.floor(Math.random() * 9000) + 1000}`
                        }
                    },
                    productos: productosVenta,
                    totales: {
                        subtotal: subtotal,
                        envio: envio,
                        total: total
                    },
                    pago: {
                        metodo: metodoPagoAleatorio,
                        estado: 'aprobado',
                        fecha: fechaVenta,
                        referencia: `REF-${Math.floor(Math.random() * 999999)}`
                    },
                    estado: 'completado',
                    fechaCreacion: fechaVenta,
                    canal: Math.random() > 0.7 ? 'mobile' : 'web',
                    dispositivo: {
                        tipo: Math.random() > 0.5 ? 'desktop' : 'mobile',
                        userAgent: 'Sample Data Generator 2025'
                    }
                };

                ventasGeneradas.push(venta);
                numeroOrdenContador++;
            }

            console.log(`✅ Generadas ventas para ${new Date(anio, mes, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}: ${ventasEnMes} ventas`);
        }

        // Insertar ventas en lotes
        const batchSize = 50;
        for (let i = 0; i < ventasGeneradas.length; i += batchSize) {
            const batch = ventasGeneradas.slice(i, i + batchSize);
            await Sale.insertMany(batch);
            console.log(`✅ Insertadas ${Math.min(i + batchSize, ventasGeneradas.length)} de ${ventasGeneradas.length} ventas`);
        }

        console.log(`\n🎉 ¡Ventas insertadas exitosamente! Total: ${ventasGeneradas.length}`);
        console.log(`📊 Período: Enero 2025 - Diciembre 6, 2025`);
        
        // Mostrar estadísticas
        const estadisticas = await Sale.aggregate([
            {
                $match: {
                    fechaCreacion: {
                        $gte: fechaInicio,
                        $lte: fechaFin
                    }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$fechaCreacion' } },
                    ventas: { $sum: 1 },
                    ingresos: { $sum: '$totales.total' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('\n📈 Resumen por mes:');
        estadisticas.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.ventas} ventas - $${stat.ingresos.toLocaleString('es-AR')}`);
        });

    } catch (error) {
        console.error('❌ Error insertando ventas:', error);
    }
}

// Ejecutar
async function main() {
    await connectDB();
    await insertSales2025();
    await mongoose.connection.close();
    console.log('\n✅ Proceso completado');
    process.exit(0);
}

main();

