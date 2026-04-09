/**
 * Script para actualizar productos existentes con campos de inventario
 * Ejecutar una sola vez después de implementar el sistema de inventario
 * 
 * Uso: node update-products-inventory.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/product');

async function updateProductsInventory() {
    try {
        console.log('🔄 Conectando a MongoDB...');
        
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        
        console.log('✅ Conexión exitosa\n');
        
        // Obtener todos los productos
        const productos = await Product.find({});
        console.log(`📦 Encontrados ${productos.length} productos\n`);
        
        let actualizados = 0;
        
        for (const producto of productos) {
            let cambios = false;
            
            // Establecer stockMinimo si no existe
            if (producto.stockMinimo === undefined || producto.stockMinimo === null) {
                producto.stockMinimo = 5; // Valor por defecto
                cambios = true;
            }
            
            // Actualizar stockStatus basado en stock actual
            const nuevoStatus = calcularStockStatus(producto.stock, producto.stockMinimo);
            if (producto.stockStatus !== nuevoStatus) {
                producto.stockStatus = nuevoStatus;
                cambios = true;
            }
            
            if (cambios) {
                await producto.save();
                actualizados++;
                console.log(`  ✅ ${producto.name}: stock=${producto.stock}, mín=${producto.stockMinimo}, estado=${producto.stockStatus}`);
            }
        }
        
        console.log(`\n📊 Resumen:`);
        console.log(`   - Total productos: ${productos.length}`);
        console.log(`   - Actualizados: ${actualizados}`);
        console.log(`   - Sin cambios: ${productos.length - actualizados}`);
        
        // Mostrar estadísticas de stock
        const stats = await calcularEstadisticas();
        console.log(`\n📈 Estadísticas de Inventario:`);
        console.log(`   - Disponibles: ${stats.disponible}`);
        console.log(`   - Bajo stock: ${stats.bajoStock}`);
        console.log(`   - Sin stock: ${stats.sinStock}`);
        
        console.log('\n✅ Proceso completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Conexión cerrada');
        process.exit(0);
    }
}

function calcularStockStatus(stock, stockMinimo) {
    if (stock === 0) {
        return 'sin_stock';
    } else if (stock <= stockMinimo) {
        return 'bajo_stock';
    } else {
        return 'disponible';
    }
}

async function calcularEstadisticas() {
    const disponible = await Product.countDocuments({ stockStatus: 'disponible' });
    const bajoStock = await Product.countDocuments({ stockStatus: 'bajo_stock' });
    const sinStock = await Product.countDocuments({ stockStatus: 'sin_stock' });
    
    return { disponible, bajoStock, sinStock };
}

// Ejecutar
updateProductsInventory();


