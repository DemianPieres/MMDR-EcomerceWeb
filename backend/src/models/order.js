const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    index: true
  },
  items: [{
    id: { type: String, required: true },
    nombre: { type: String, required: true },
    precio: { type: Number, required: true, min: 0 },
    cantidad: { type: Number, required: true, min: 1 },
    imagen: String
  }],
  total: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  payment_id: { type: String },
  external_reference: { type: String, index: true },
  mp_preference_id: { type: String },
  mp_payment_data: { type: Object },
  cliente: {
    nombre: String,
    email: String
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Índices para consultas habituales
orderSchema.index({ status: 1, created_at: -1 });

// Generar un número de orden único antes de guardar (para respetar índice existente en la colección)
orderSchema.pre('validate', function(next) {
  if (!this.orderNumber) {
    const now = Date.now();
    const rand = Math.floor(Math.random() * 1e6)
      .toString()
      .padStart(6, '0');
    this.orderNumber = `MP-ORD-${now}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);

