const express = require('express');
const router = express.Router();
const {
  createPreference,
  webhook
} = require('../controllers/mercadopagoController');

// Crear preferencia de pago (checkout pro)
router.post('/create-preference', createPreference);

// Webhook de Mercado Pago
router.post('/webhook', webhook);

module.exports = router;

