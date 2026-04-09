require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/product');

// Productos de ejemplo con las imágenes que ya están en el proyecto
const sampleProducts = [
  {
    name: 'Cubre Asientos Universal',
    description: 'Cubre asientos universal de alta calidad, fabricado con materiales resistentes y duraderos. Compatible con la mayoría de los vehículos. Fácil instalación y mantenimiento.',
    price: 25000,
    originalPrice: 36000,
    stock: 15,
    category: 'asientos',
    isActive: true,
    image: 'Imagenes/cubreasientosuniversal.webp',
    discount: 31,
    rating: 5,
    ratingCount: 65,
    featured: true,
    tags: ['universal', 'asientos', 'interior']
  },
  {
    name: 'Cubre Volante Universal',
    description: 'Cubre volante universal ergonómico, con diseño antideslizante. Proporciona mejor agarre y comodidad durante la conducción. Material de primera calidad.',
    price: 16000,
    originalPrice: 18800,
    stock: 8,
    category: 'volantes',
    isActive: true,
    image: 'Imagenes/cubrevolanteuniversal.webp',
    discount: 15,
    rating: 5,
    ratingCount: 66,
    featured: false,
    tags: ['universal', 'volante', 'confort']
  },
  {
    name: 'Pomo Reicing',
    description: 'Pomo de palanca deportivo estilo racing. Diseño ergonómico con acabados de alta calidad. Mejora la experiencia de cambio de marchas.',
    price: 8000,
    originalPrice: 17000,
    stock: 3,
    category: 'accesorios',
    isActive: true,
    image: 'Imagenes/pomoreicing.webp',
    discount: 53,
    rating: 5,
    ratingCount: 65,
    featured: false,
    tags: ['pomo', 'palanca', 'deportivo']
  },
  {
    name: 'Volante MOMO Edición Limitada',
    description: 'Volante deportivo MOMO edición especial. Fabricado con materiales premium, diseño exclusivo y ergonómico. Incluye certificado de autenticidad.',
    price: 78000,
    stock: 2,
    category: 'volantes',
    isActive: true,
    image: 'Imagenes/VolanteMOMOedicionlimitada.jpg',
    discount: 0,
    rating: 5,
    ratingCount: 65,
    featured: true,
    tags: ['MOMO', 'deportivo', 'premium', 'edición limitada']
  },
  {
    name: 'Kit Suspensión Neumática',
    description: 'Sistema completo de suspensión neumática de alta calidad. Incluye compresor, tanque, válvulas y todos los accesorios necesarios para la instalación. Control de altura preciso.',
    price: 242000,
    originalPrice: 400000,
    stock: 1,
    category: 'suspension',
    isActive: true,
    image: 'Imagenes/kitsuspensionneumatica.webp',
    discount: 40,
    rating: 5,
    ratingCount: 65,
    featured: true,
    tags: ['suspensión', 'neumática', 'kit completo']
  },
  {
    name: 'Kit LED Premium',
    description: 'Kit de luces LED de alta intensidad para interior y exterior. Incluye múltiples colores programables, control remoto y fácil instalación. Bajo consumo energético.',
    price: 15000,
    stock: 12,
    category: 'electronica',
    isActive: true,
    image: 'Imagenes/kitled.jpg',
    discount: 0,
    rating: 4,
    ratingCount: 42,
    featured: false,
    tags: ['LED', 'luces', 'iluminación']
  },
  {
    name: 'Kit Turbo Completo',
    description: 'Sistema turbo completo para mayor potencia. Incluye turbocompresor, intercooler, tuberías, abrazaderas y todo lo necesario para la instalación. Aumenta significativamente el rendimiento del motor.',
    price: 350000,
    stock: 1,
    category: 'accesorios',
    isActive: true,
    image: 'Imagenes/kitturbo.jpg',
    discount: 0,
    rating: 5,
    ratingCount: 23,
    featured: true,
    tags: ['turbo', 'performance', 'motor']
  },
  {
    name: 'Espirales con Refuerzo',
    description: 'Espirales reforzados para suspensión deportiva. Mayor rigidez y mejor respuesta en curvas. Fabricados con materiales de alta resistencia.',
    price: 45000,
    originalPrice: 60000,
    stock: 6,
    category: 'suspension',
    isActive: true,
    image: 'Imagenes/espiralesconrefuerzo.jpg',
    discount: 25,
    rating: 5,
    ratingCount: 48,
    featured: false,
    tags: ['espirales', 'suspensión', 'deportivo']
  }
];

async function insertSampleProducts() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Eliminar productos existentes (opcional - comentar si no quieres borrar)
    console.log('🗑️  Limpiando productos existentes...');
    await Product.deleteMany({});

    // Insertar productos de ejemplo
    console.log('📦 Insertando productos de ejemplo...');
    const insertedProducts = await Product.insertMany(sampleProducts);
    
    console.log(`✅ ${insertedProducts.length} productos insertados exitosamente:`);
    insertedProducts.forEach(product => {
      console.log(`   - ${product.name} (Stock: ${product.stock}, Precio: $${product.price})`);
    });

    console.log('\n📊 Estadísticas:');
    console.log(`   Total productos: ${insertedProducts.length}`);
    console.log(`   Productos destacados: ${insertedProducts.filter(p => p.featured).length}`);
    console.log(`   Productos con descuento: ${insertedProducts.filter(p => p.discount > 0).length}`);

    // Mostrar distribución por categoría
    const categoryCounts = {};
    insertedProducts.forEach(product => {
      categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
    });
    
    console.log('\n📂 Productos por categoría:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error insertando productos:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
    process.exit(0);
  }
}

insertSampleProducts();


