const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  crearVenta,
  obtenerVentas,
  obtenerVentaPorId,
  obtenerVentaPorNumeroOrden,
  actualizarEstadoVenta,
  obtenerEstadisticas,
  obtenerProductosMasVendidos,
  obtenerVentasPorPeriodo,
  obtenerEstadisticasDashboard
} = require('../controllers/saleController');

// ===== RUTAS DE VENTAS =====

// Crear nueva venta (checkout / tienda)
router.post('/', crearVenta);

// Listados, detalle y analytics: solo administrador
router.get('/', requireAuth, requireAdmin, obtenerVentas);
router.get('/orden/:numeroOrden', requireAuth, requireAdmin, obtenerVentaPorNumeroOrden);
router.put('/:id/estado', requireAuth, requireAdmin, actualizarEstadoVenta);

router.get('/analytics/estadisticas', requireAuth, requireAdmin, obtenerEstadisticas);
router.get('/analytics/productos-mas-vendidos', requireAuth, requireAdmin, obtenerProductosMasVendidos);
router.get('/analytics/ventas-por-periodo', requireAuth, requireAdmin, obtenerVentasPorPeriodo);
router.get('/analytics/dashboard', requireAuth, requireAdmin, obtenerEstadisticasDashboard);

// Obtener venta por ID (después de rutas más específicas)
router.get('/:id', requireAuth, requireAdmin, obtenerVentaPorId);

module.exports = router;
