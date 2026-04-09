const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  originalPrice: { 
    type: Number, 
    min: 0 
  },
  category: { 
    type: String, 
    required: true,
    enum: ['asientos', 'volantes', 'electronica', 'suspension', 'accesorios', 'otros']
  },
  // ===== SISTEMA DE INVENTARIO =====
  stock: { 
    type: Number, 
    required: true, 
    min: 0, 
    default: 0 
  },
  stockMinimo: {
    type: Number,
    min: 0,
    default: 5  // Umbral para alerta de bajo stock
  },
  stockStatus: {
    type: String,
    enum: ['disponible', 'bajo_stock', 'sin_stock'],
    default: 'sin_stock'
  },
  // Historial de precios (último cambio)
  precioAnterior: {
    type: Number,
    min: 0
  },
  fechaCambioPrecio: {
    type: Date
  },
  // ===== FIN SISTEMA DE INVENTARIO =====
  image: { 
    type: String, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  rating: { 
    type: Number, 
    min: 0, 
    max: 5, 
    default: 5 
  },
  ratingCount: { 
    type: Number, 
    min: 0, 
    default: 0 
  },
  discount: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: 0 
  },
  tags: [{ 
    type: String 
  }],
  featured: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

// Middleware pre-save para actualizar stockStatus automáticamente
productSchema.pre('save', function(next) {
  this.actualizarStockStatus();
  next();
});

// Método para actualizar el estado del stock
productSchema.methods.actualizarStockStatus = function() {
  if (this.stock === 0) {
    this.stockStatus = 'sin_stock';
  } else if (this.stock <= this.stockMinimo) {
    this.stockStatus = 'bajo_stock';
  } else {
    this.stockStatus = 'disponible';
  }
};

// Método estático para obtener productos con bajo stock
productSchema.statics.obtenerBajoStock = async function() {
  return await this.find({
    $or: [
      { stockStatus: 'bajo_stock' },
      { stockStatus: 'sin_stock' }
    ],
    isActive: true
  }).sort({ stock: 1 });
};

// Método estático para obtener alertas de inventario
productSchema.statics.obtenerAlertas = async function() {
  const productos = await this.find({
    isActive: true
  });
  
  const alertas = [];
  
  productos.forEach(producto => {
    if (producto.stock === 0) {
      alertas.push({
        tipo: 'critico',
        producto: producto._id,
        nombre: producto.name,
        mensaje: `Sin stock: ${producto.name}`,
        stock: producto.stock,
        stockMinimo: producto.stockMinimo
      });
    } else if (producto.stock <= producto.stockMinimo) {
      alertas.push({
        tipo: 'advertencia',
        producto: producto._id,
        nombre: producto.name,
        mensaje: `Bajo stock: ${producto.name} (${producto.stock} unidades)`,
        stock: producto.stock,
        stockMinimo: producto.stockMinimo
      });
    }
  });
  
  return alertas;
};

// Índices para mejorar las consultas
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
