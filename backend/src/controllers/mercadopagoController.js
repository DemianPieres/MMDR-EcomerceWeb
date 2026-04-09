const crypto = require('crypto');
const { Preference } = require('mercadopago');
const { mpClient } = require('../config/mercadopago');
const Order = require('../models/order');
const Sale = require('../models/sale');
const Product = require('../models/product');
const InventoryMovement = require('../models/inventoryMovement');

// Crear preferencia y orden pendiente
const createPreference = async (req, res) => {
  try {
    const { items, cliente } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Carrito vacío o inválido' });
    }

    const mappedItems = items.map((item) => ({
      id: item.id,
      title: item.nombre,
      unit_price: Number(item.precio),
      quantity: Number(item.cantidad),
      currency_id: 'ARS'
    }));

    const total = mappedItems.reduce((acc, it) => acc + it.unit_price * it.quantity, 0);

    const order = await Order.create({
      items: items.map(i => ({
        id: i.id,
        nombre: i.nombre,
        precio: i.precio,
        cantidad: i.cantidad,
        imagen: i.imagen
      })),
      total,
      status: 'pending',
      external_reference: '',
      cliente: {
        nombre: cliente?.nombre || '',
        email: cliente?.email || ''
      }
    });

    order.external_reference = order._id.toString();
    await order.save();

    const preference = new Preference(mpClient);

    const publicUrl = process.env.MP_PUBLIC_URL || 'http://localhost:3000';
    const webhookUrl = process.env.MP_WEBHOOK_URL || `${publicUrl}/api/mercadopago/webhook`;

    const result = await preference.create({
      body: {
        items: mappedItems,
        back_urls: {
          success: `${publicUrl}/success.html`,
          failure: `${publicUrl}/failure.html`,
          pending: `${publicUrl}/pending.html`
        },
        auto_return: 'approved',
        notification_url: webhookUrl,
        external_reference: order.external_reference
      }
    });

    order.mp_preference_id = result.id;
    await order.save();

    return res.json({
      success: true,
      init_point: result.init_point,
      preference_id: result.id,
      order_id: order._id
    });
  } catch (error) {
    console.error('❌ Error creando preferencia de Mercado Pago:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creando preferencia de pago',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Webhook con validación HMAC SHA256
const webhook = async (req, res) => {
  try {
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    const { id: paymentId } = req.query || {};

    if (!signature || !requestId || !paymentId) {
      console.warn('⚠️ Webhook inválido (faltan headers o query)', { signature, requestId, paymentId });
      return res.status(400).json({ success: false });
    }

    const [tsPart, v1Part] = signature.split(',');
    const ts = tsPart?.split('=')[1];
    const v1 = v1Part?.split('=')[1];

    if (!ts || !v1) {
      console.warn('⚠️ Webhook firma inválida', { signature });
      return res.status(400).json({ success: false });
    }

    const template = `id:${paymentId};request-id:${requestId};ts:${ts};`;
    const secret = process.env.MP_WEBHOOK_SECRET || process.env.MP_ACCESS_TOKEN || '';

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(template);
    const expected = hmac.digest('hex');

    if (expected !== v1) {
      console.warn('⚠️ Firma HMAC inválida', { expected, v1 });
      return res.status(400).json({ success: false });
    }

    console.log('✅ Webhook validado correctamente, consultando pago', paymentId);

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      console.error('❌ Error consultando pago en MP:', await response.text());
      return res.status(500).json({ success: false });
    }

    const payment = await response.json();
    const externalReference = payment.external_reference;

    const order = await Order.findOne({ external_reference: externalReference });
    if (!order) {
      console.error('❌ Orden no encontrada para external_reference', externalReference);
      return res.status(404).json({ success: false });
    }

    order.payment_id = paymentId;
    order.mp_payment_data = payment;

    if (payment.status === 'approved') {
      order.status = 'approved';
      await order.save();
      await crearVentaDesdePago(order, payment);
    } else if (payment.status === 'pending') {
      order.status = 'pending';
      await order.save();
    } else {
      order.status = 'rejected';
      await order.save();
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error en webhook de Mercado Pago:', error);
    return res.status(500).json({ success: false });
  }
};

// Crear Venta + actualizar inventario / estadísticas
async function crearVentaDesdePago(order, payment) {
  try {
    console.log('💳 Creando venta desde pago aprobado Mercado Pago, orden:', order._id.toString());

    // Validar stock de cada producto
    for (const item of order.items) {
      const producto = await Product.findById(item.id);
      if (!producto || producto.stock < item.cantidad) {
        console.warn('⚠️ Stock insuficiente o producto no encontrado para venta MP', item.id);
        return;
      }
    }

    const numeroOrden = `MP-${order._id.toString()}`;

    const cliente = {
      nombre: order.cliente?.nombre || payment.payer?.first_name || 'Cliente MP',
      email: order.cliente?.email || payment.payer?.email || '',
      telefono: payment.payer?.phone?.number || '',
      direccion: {
        calle: payment.additional_info?.payer?.address?.street_name || '',
        ciudad: payment.additional_info?.payer?.address?.city_name || '',
        provincia: '',
        codigoPostal: payment.additional_info?.payer?.address?.zip_code || ''
      }
    };

    const productos = order.items.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      cantidad: item.cantidad,
      subtotal: item.precio * item.cantidad
    }));

    const totales = {
      subtotal: order.total,
      envio: 0,
      total: order.total
    };

    const pagoInfo = {
      metodo: 'credit-card',
      estado: 'aprobado',
      fecha: new Date(),
      referencia: payment.id?.toString()
    };

    const venta = new Sale({
      numeroOrden,
      cliente,
      productos,
      totales,
      pago: pagoInfo,
      estado: 'completado',
      canal: 'web',
      dispositivo: { tipo: 'desktop' }
    });

    const ventaGuardada = await venta.save();

    for (const productoVenta of productos) {
      const producto = await Product.findById(productoVenta.id);
      if (!producto) continue;

      const stockAnterior = producto.stock;
      const stockNuevo = stockAnterior - productoVenta.cantidad;

      const movimiento = new InventoryMovement({
        producto: productoVenta.id,
        productoNombre: productoVenta.nombre,
        tipo: 'salida',
        cantidad: productoVenta.cantidad,
        stockAnterior,
        stockNuevo,
        motivo: 'venta',
        descripcion: `Venta MP: Orden ${numeroOrden}`,
        ventaRef: ventaGuardada._id,
        numeroOrden,
        usuario: 'sistema',
        origen: 'mercadopago'
      });

      await movimiento.save();
      producto.stock = stockNuevo;
      producto.actualizarStockStatus();
      await producto.save();
    }

    console.log('✅ Venta creada desde Mercado Pago y estadísticas listas para dashboard');
  } catch (error) {
    console.error('❌ Error creando venta desde pago Mercado Pago:', error);
  }
}

module.exports = {
  createPreference,
  webhook
};

