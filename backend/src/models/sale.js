const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  numeroOrden: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  cliente: {
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    telefono: {
      type: String,
      required: true
    },
    direccion: {
      calle: {
        type: String,
        required: true
      },
      ciudad: {
        type: String,
        required: true
      },
      provincia: {
        type: String,
        required: true
      },
      codigoPostal: {
        type: String,
        required: true
      }
    }
  },
  productos: [{
    id: {
      type: String,
      required: true
    },
    nombre: {
      type: String,
      required: true
    },
    precio: {
      type: Number,
      required: true,
      min: 0
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totales: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    envio: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  pago: {
    metodo: {
      type: String,
      required: true,
      enum: [
        'credit-card', 'debit-card', 'prepaid-card',
        'paypal', 'apple-pay', 'google-pay',
        'bank-transfer', 'bnpl', 'cash-on-delivery'
      ]
    },
    estado: {
      type: String,
      required: true,
      enum: ['pendiente', 'aprobado', 'rechazado', 'cancelado'],
      default: 'pendiente'
    },
    fecha: {
      type: Date,
      required: true,
      default: Date.now
    },
    referencia: {
      type: String,
      sparse: true // Permite valores únicos pero también null/undefined
    }
  },
  estado: {
    type: String,
    required: true,
    enum: ['pendiente', 'procesando', 'completado', 'cancelado', 'reembolsado'],
    default: 'pendiente'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  notas: {
    type: String,
    maxlength: 500
  },
  // Campos para analytics
  canal: {
    type: String,
    default: 'web',
    enum: ['web', 'mobile', 'admin']
  },
  dispositivo: {
    tipo: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet']
    },
    userAgent: String
  }
}, {
  timestamps: true
});

// Índices para mejorar las consultas
saleSchema.index({ numeroOrden: 1 });
saleSchema.index({ 'cliente.email': 1 });
saleSchema.index({ estado: 1 });
saleSchema.index({ 'pago.estado': 1 });
saleSchema.index({ fechaCreacion: -1 });
saleSchema.index({ 'totales.total': 1 });

// Middleware para actualizar fechaActualizacion
saleSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

// Método estático para obtener estadísticas
saleSchema.statics.obtenerEstadisticas = async function(filtros = {}) {
  const pipeline = [
    { $match: filtros },
    {
      $group: {
        _id: null,
        totalVentas: { $sum: 1 },
        totalIngresos: { $sum: '$totales.total' },
        promedioVenta: { $avg: '$totales.total' },
        ventasCompletadas: {
          $sum: { $cond: [{ $eq: ['$estado', 'completado'] }, 1, 0] }
        },
        ingresosCompletados: {
          $sum: { $cond: [{ $eq: ['$estado', 'completado'] }, '$totales.total', 0] }
        }
      }
    }
  ];

  const estadisticas = await this.aggregate(pipeline);
  return estadisticas[0] || {
    totalVentas: 0,
    totalIngresos: 0,
    promedioVenta: 0,
    ventasCompletadas: 0,
    ingresosCompletados: 0
  };
};

// Método estático para obtener productos más vendidos
saleSchema.statics.obtenerProductosMasVendidos = async function(limite = 10, filtros = {}) {
  const pipeline = [
    { $match: { ...filtros, estado: 'completado' } },
    { $unwind: '$productos' },
    {
      $group: {
        _id: {
          id: '$productos.id',
          nombre: '$productos.nombre'
        },
        cantidadVendida: { $sum: '$productos.cantidad' },
        ingresosGenerados: { $sum: '$productos.subtotal' },
        vecesVendido: { $sum: 1 }
      }
    },
    { $sort: { cantidadVendida: -1 } },
    { $limit: limite }
  ];

  return await this.aggregate(pipeline);
};

// Método estático para obtener ventas por período
saleSchema.statics.obtenerVentasPorPeriodo = async function(fechaInicio, fechaFin, agrupacion = 'dia') {
  let formatoFecha;
  switch (agrupacion) {
    case 'hora':
      formatoFecha = '%Y-%m-%d %H:00:00';
      break;
    case 'dia':
      formatoFecha = '%Y-%m-%d';
      break;
    case 'mes':
      formatoFecha = '%Y-%m';
      break;
    case 'año':
      formatoFecha = '%Y';
      break;
    default:
      formatoFecha = '%Y-%m-%d';
  }

  const pipeline = [
    {
      $match: {
        fechaCreacion: {
          $gte: new Date(fechaInicio),
          $lte: new Date(fechaFin)
        },
        estado: 'completado'
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: formatoFecha,
            date: '$fechaCreacion'
          }
        },
        ventas: { $sum: 1 },
        ingresos: { $sum: '$totales.total' },
        promedioVenta: { $avg: '$totales.total' }
      }
    },
    { $sort: { _id: 1 } }
  ];

  return await this.aggregate(pipeline);
};

// Método de instancia para calcular métricas del producto
saleSchema.methods.calcularMetricasProducto = function() {
  const metricas = {
    totalProductos: this.productos.length,
    cantidadTotal: this.productos.reduce((total, producto) => total + producto.cantidad, 0),
    productoMasCaro: null,
    productoMenosCaro: null
  };

  if (this.productos.length > 0) {
    const productosOrdenados = [...this.productos].sort((a, b) => a.precio - b.precio);
    metricas.productoMenosCaro = productosOrdenados[0];
    metricas.productoMasCaro = productosOrdenados[productosOrdenados.length - 1];
  }

  return metricas;
};

module.exports = mongoose.model('Sale', saleSchema);
