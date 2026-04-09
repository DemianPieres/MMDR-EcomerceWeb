const { MercadoPagoConfig } = require('mercadopago');
require('dotenv').config();

if (!process.env.MP_ACCESS_TOKEN) {
  console.warn('⚠️ MP_ACCESS_TOKEN no está definido en .env. La integración de Mercado Pago no funcionará.');
}

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || '',
});

module.exports = { mpClient };

