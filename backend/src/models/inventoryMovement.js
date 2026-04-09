const mongoose = require('mongoose');

/**
 * Modelo de Movimiento de Inventario
 * Registra todos los cambios de stock con trazabilidad completa
 */
const inventoryMovementSchema = new mongoose.Schema({
  // Producto afectado
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  productoNombre: {
    type: String,
    required: true
  },
  
  // Tipo de movimiento
  tipo: {
    type: String,
    required: true,
    enum: ['entrada', 'salida', 'ajuste', 'devolucion', 'cancelacion'],
    index: true
  },
  
  // Cantidades
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  stockAnterior: {
    type: Number,
    required: true,
    min: 0
  },
  stockNuevo: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Motivo del movimiento
  motivo: {
    type: String,
    required: true,
    enum: [
      'venta',                    // Salida por venta completada
      'cancelacion_venta',        // Entrada por cancelación de venta
      'devolucion_cliente',       // Entrada por devolución
      'ajuste_inventario',        // Ajuste manual por conteo
      'carga_inicial',            // Carga inicial de stock
      'reposicion',               // Entrada de mercadería
      'dano_perdida',             // Salida por daño o pérdida
      'transferencia',            // Transferencia entre almacenes
      'correccion_error',         // Corrección de error
      'otro'                      // Otro motivo
    ]
  },
  
  // Descripción adicional
  descripcion: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Referencia a venta (si aplica)
  ventaRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    sparse: true
  },
  numeroOrden: {
    type: String,
    sparse: true
  },
  
  // Quien realizó el movimiento
  usuario: {
    type: String,
    default: 'sistema'
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  
  // Origen del movimiento
  origen: {
    type: String,
    enum: ['admin', 'sistema', 'api', 'importacion'],
    default: 'sistema'
  },
  
  // Metadatos adicionales
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices para consultas eficientes
inventoryMovementSchema.index({ createdAt: -1 });
inventoryMovementSchema.index({ producto: 1, createdAt: -1 });
inventoryMovementSchema.index({ tipo: 1, createdAt: -1 });
inventoryMovementSchema.index({ motivo: 1, createdAt: -1 });
inventoryMovementSchema.index({ ventaRef: 1 });

// Método estático para obtener movimientos por producto
inventoryMovementSchema.statics.obtenerPorProducto = async function(productoId, limite = 50) {
  return await this.find({ producto: productoId })
    .sort({ createdAt: -1 })
    .limit(limite)
    .lean();
};

// Método estático para obtener resumen de movimientos
inventoryMovementSchema.statics.obtenerResumen = async function(filtros = {}) {
  const pipeline = [
    { $match: filtros },
    {
      $group: {
        _id: '$tipo',
        totalMovimientos: { $sum: 1 },
        cantidadTotal: { $sum: '$cantidad' }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Método estático para obtener movimientos recientes
inventoryMovementSchema.statics.obtenerRecientes = async function(limite = 20) {
  return await this.find()
    .sort({ createdAt: -1 })
    .limit(limite)
    .populate('producto', 'name image')
    .lean();
};

// Método estático para obtener movimientos por período
inventoryMovementSchema.statics.obtenerPorPeriodo = async function(fechaInicio, fechaFin) {
  return await this.find({
    createdAt: {
      $gte: new Date(fechaInicio),
      $lte: new Date(fechaFin)
    }
  })
    .sort({ createdAt: -1 })
    .populate('producto', 'name')
    .lean();
};

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);


