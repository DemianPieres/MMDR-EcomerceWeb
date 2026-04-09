const mongoose = require('mongoose');
const crypto = require('crypto');

const mensajeSchema = new mongoose.Schema({
  from: { type: String, enum: ['user', 'admin'], required: true },
  texto: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  guestLabel: { type: String, default: '', trim: true },
  mensajeInicial: { type: String, required: true, trim: true },
  tipoConsulta: { type: String, default: '', trim: true },
  estado: {
    type: String,
    enum: ['Pendiente', 'En proceso', 'Resuelto'],
    default: 'Pendiente'
  },
  mensajes: { type: [mensajeSchema], default: [] },
  accessToken: { type: String, select: false, index: true }
}, {
  timestamps: true,
  versionKey: false
});

ticketSchema.methods.generarAccessToken = function () {
  this.accessToken = crypto.randomBytes(24).toString('hex');
  return this.accessToken;
};

module.exports = mongoose.model('Ticket', ticketSchema);
