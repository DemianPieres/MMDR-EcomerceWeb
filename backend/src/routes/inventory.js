const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  obtenerInventario,
  obtenerProductoInventario,
  registrarEntrada,
  registrarSalida,
  realizarAjuste,
  actualizarStockMinimo,
  cambiarPrecio,
  obtenerMovimientos,
  obtenerMovimientosRecientes,
  obtenerAlertas,
  obtenerEstadisticas,
  validarStockParaCompra
} = require('../controllers/inventoryController');

/**
 * RUTAS DE GESTIÓN DE INVENTARIO
 * Prefijo: /api/inventory
 */

// Validación de stock (checkout / carrito): pública
router.post('/validar-stock', validarStockParaCompra);

// ===== CONSULTAS (solo administrador) =====

router.get('/estadisticas', requireAuth, requireAdmin, obtenerEstadisticas);
router.get('/alertas', requireAuth, requireAdmin, obtenerAlertas);
router.get('/movimientos/recientes', requireAuth, requireAdmin, obtenerMovimientosRecientes);
router.get('/movimientos', requireAuth, requireAdmin, obtenerMovimientos);
router.get('/producto/:id', requireAuth, requireAdmin, obtenerProductoInventario);
router.get('/', requireAuth, requireAdmin, obtenerInventario);

// ===== RUTAS DE MODIFICACIÓN =====

// POST /api/inventory/entrada - Registrar entrada de stock
router.post('/entrada', requireAuth, requireAdmin, registrarEntrada);

// POST /api/inventory/salida - Registrar salida de stock
router.post('/salida', requireAuth, requireAdmin, registrarSalida);

// POST /api/inventory/ajuste - Realizar ajuste de inventario
router.post('/ajuste', requireAuth, requireAdmin, realizarAjuste);

// PUT /api/inventory/stock-minimo - Actualizar stock mínimo
router.put('/stock-minimo', requireAuth, requireAdmin, actualizarStockMinimo);

// PUT /api/inventory/precio - Cambiar precio del producto
router.put('/precio', requireAuth, requireAdmin, cambiarPrecio);

module.exports = router;


