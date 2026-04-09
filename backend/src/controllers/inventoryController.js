const Product = require('../models/product');
const InventoryMovement = require('../models/inventoryMovement');
const Sale = require('../models/sale');

/**
 * CONTROLADOR DE GESTIÓN DE INVENTARIO
 * Sistema completo de trazabilidad y control de stock
 */

// ===== OBTENER INVENTARIO COMPLETO =====
const obtenerInventario = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      stockStatus,
      search,
      sortBy = 'stock',
      sortOrder = 'asc'
    } = req.query;

    // Construir filtros
    const filtros = { isActive: true };
    
    if (category && category !== 'all') {
      filtros.category = category;
    }
    
    if (stockStatus && stockStatus !== 'all') {
      filtros.stockStatus = stockStatus;
    }
    
    if (search) {
      filtros.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Configurar ordenamiento
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Ejecutar consulta
    const skip = (page - 1) * limit;
    const productos = await Product.find(filtros)
      .select('name description price stock stockMinimo stockStatus category image createdAt updatedAt')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Product.countDocuments(filtros);

    // Calcular estadísticas
    const estadisticas = await calcularEstadisticasInventario();

    res.json({
      success: true,
      data: productos,
      estadisticas,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo inventario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener inventario',
      error: error.message
    });
  }
};

// ===== OBTENER PRODUCTO CON HISTORIAL =====
const obtenerProductoInventario = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Product.findById(id).lean();
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Obtener historial de movimientos
    const movimientos = await InventoryMovement.obtenerPorProducto(id, 50);

    res.json({
      success: true,
      data: {
        producto,
        movimientos
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto',
      error: error.message
    });
  }
};

// ===== REGISTRAR ENTRADA DE STOCK =====
const registrarEntrada = async (req, res) => {
  try {
    const { productoId, cantidad, motivo, descripcion, usuario } = req.body;

    if (!productoId || !cantidad || cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Producto y cantidad válida son requeridos'
      });
    }

    const producto = await Product.findById(productoId);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const stockAnterior = producto.stock;
    const stockNuevo = stockAnterior + parseInt(cantidad);

    // Crear movimiento de inventario
    const movimiento = new InventoryMovement({
      producto: productoId,
      productoNombre: producto.name,
      tipo: 'entrada',
      cantidad: parseInt(cantidad),
      stockAnterior,
      stockNuevo,
      motivo: motivo || 'reposicion',
      descripcion: descripcion || `Entrada de ${cantidad} unidades`,
      usuario: usuario || 'admin',
      origen: 'admin'
    });

    await movimiento.save();

    // Actualizar stock del producto
    producto.stock = stockNuevo;
    producto.actualizarStockStatus();
    await producto.save();

    console.log(`📦 Entrada: +${cantidad} ${producto.name} (${stockAnterior} → ${stockNuevo})`);

    res.json({
      success: true,
      message: `Entrada registrada: +${cantidad} unidades`,
      data: {
        producto: {
          id: producto._id,
          name: producto.name,
          stock: producto.stock,
          stockStatus: producto.stockStatus
        },
        movimiento
      }
    });

  } catch (error) {
    console.error('❌ Error registrando entrada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar entrada',
      error: error.message
    });
  }
};

// ===== REGISTRAR SALIDA DE STOCK =====
const registrarSalida = async (req, res) => {
  try {
    const { productoId, cantidad, motivo, descripcion, usuario } = req.body;

    if (!productoId || !cantidad || cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Producto y cantidad válida son requeridos'
      });
    }

    const producto = await Product.findById(productoId);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    if (producto.stock < cantidad) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Disponible: ${producto.stock}`
      });
    }

    const stockAnterior = producto.stock;
    const stockNuevo = stockAnterior - parseInt(cantidad);

    // Crear movimiento de inventario
    const movimiento = new InventoryMovement({
      producto: productoId,
      productoNombre: producto.name,
      tipo: 'salida',
      cantidad: parseInt(cantidad),
      stockAnterior,
      stockNuevo,
      motivo: motivo || 'otro',
      descripcion: descripcion || `Salida de ${cantidad} unidades`,
      usuario: usuario || 'admin',
      origen: 'admin'
    });

    await movimiento.save();

    // Actualizar stock del producto
    producto.stock = stockNuevo;
    producto.actualizarStockStatus();
    await producto.save();

    console.log(`📦 Salida: -${cantidad} ${producto.name} (${stockAnterior} → ${stockNuevo})`);

    res.json({
      success: true,
      message: `Salida registrada: -${cantidad} unidades`,
      data: {
        producto: {
          id: producto._id,
          name: producto.name,
          stock: producto.stock,
          stockStatus: producto.stockStatus
        },
        movimiento
      }
    });

  } catch (error) {
    console.error('❌ Error registrando salida:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar salida',
      error: error.message
    });
  }
};

// ===== REALIZAR AJUSTE DE INVENTARIO =====
const realizarAjuste = async (req, res) => {
  try {
    const { productoId, nuevoStock, motivo, descripcion, usuario } = req.body;

    if (!productoId || nuevoStock === undefined || nuevoStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Producto y nuevo stock válido son requeridos'
      });
    }

    const producto = await Product.findById(productoId);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const stockAnterior = producto.stock;
    const stockNuevo = parseInt(nuevoStock);
    const diferencia = Math.abs(stockNuevo - stockAnterior);

    // Crear movimiento de inventario
    const movimiento = new InventoryMovement({
      producto: productoId,
      productoNombre: producto.name,
      tipo: 'ajuste',
      cantidad: diferencia,
      stockAnterior,
      stockNuevo,
      motivo: motivo || 'ajuste_inventario',
      descripcion: descripcion || `Ajuste de inventario: ${stockAnterior} → ${stockNuevo}`,
      usuario: usuario || 'admin',
      origen: 'admin'
    });

    await movimiento.save();

    // Actualizar stock del producto
    producto.stock = stockNuevo;
    producto.actualizarStockStatus();
    await producto.save();

    console.log(`📦 Ajuste: ${producto.name} (${stockAnterior} → ${stockNuevo})`);

    res.json({
      success: true,
      message: `Ajuste realizado: ${stockAnterior} → ${stockNuevo} unidades`,
      data: {
        producto: {
          id: producto._id,
          name: producto.name,
          stock: producto.stock,
          stockStatus: producto.stockStatus
        },
        movimiento
      }
    });

  } catch (error) {
    console.error('❌ Error realizando ajuste:', error);
    res.status(500).json({
      success: false,
      message: 'Error al realizar ajuste',
      error: error.message
    });
  }
};

// ===== ACTUALIZAR STOCK MÍNIMO =====
const actualizarStockMinimo = async (req, res) => {
  try {
    const { productoId, stockMinimo } = req.body;

    if (!productoId || stockMinimo === undefined || stockMinimo < 0) {
      return res.status(400).json({
        success: false,
        message: 'Producto y stock mínimo válido son requeridos'
      });
    }

    const producto = await Product.findById(productoId);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    producto.stockMinimo = parseInt(stockMinimo);
    producto.actualizarStockStatus();
    await producto.save();

    console.log(`⚙️ Stock mínimo actualizado: ${producto.name} → ${stockMinimo}`);

    res.json({
      success: true,
      message: `Stock mínimo actualizado a ${stockMinimo} unidades`,
      data: {
        producto: {
          id: producto._id,
          name: producto.name,
          stock: producto.stock,
          stockMinimo: producto.stockMinimo,
          stockStatus: producto.stockStatus
        }
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando stock mínimo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar stock mínimo',
      error: error.message
    });
  }
};

// ===== CAMBIAR PRECIO DEL PRODUCTO =====
const cambiarPrecio = async (req, res) => {
  try {
    const { productoId, nuevoPrecio, motivo } = req.body;

    if (!productoId || !nuevoPrecio || nuevoPrecio <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Producto y nuevo precio válido son requeridos'
      });
    }

    const producto = await Product.findById(productoId);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const precioAnterior = producto.price;
    
    // Guardar historial de precio
    producto.precioAnterior = precioAnterior;
    producto.price = parseFloat(nuevoPrecio);
    producto.fechaCambioPrecio = new Date();
    
    await producto.save();

    console.log(`💰 Precio actualizado: ${producto.name} ($${precioAnterior} → $${nuevoPrecio})`);

    res.json({
      success: true,
      message: `Precio actualizado: $${precioAnterior} → $${nuevoPrecio}`,
      data: {
        producto: {
          id: producto._id,
          name: producto.name,
          price: producto.price,
          precioAnterior: producto.precioAnterior,
          fechaCambioPrecio: producto.fechaCambioPrecio
        }
      }
    });

  } catch (error) {
    console.error('❌ Error cambiando precio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar precio',
      error: error.message
    });
  }
};

// ===== OBTENER HISTORIAL DE MOVIMIENTOS =====
const obtenerMovimientos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      tipo,
      motivo,
      productoId,
      fechaInicio,
      fechaFin
    } = req.query;

    // Construir filtros
    const filtros = {};
    
    if (tipo && tipo !== 'all') {
      filtros.tipo = tipo;
    }
    
    if (motivo && motivo !== 'all') {
      filtros.motivo = motivo;
    }
    
    if (productoId) {
      filtros.producto = productoId;
    }
    
    if (fechaInicio || fechaFin) {
      filtros.createdAt = {};
      if (fechaInicio) filtros.createdAt.$gte = new Date(fechaInicio);
      if (fechaFin) filtros.createdAt.$lte = new Date(fechaFin);
    }

    // Ejecutar consulta
    const skip = (page - 1) * limit;
    const movimientos = await InventoryMovement.find(filtros)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('producto', 'name image')
      .lean();

    const total = await InventoryMovement.countDocuments(filtros);

    // Calcular resumen
    const resumen = await InventoryMovement.obtenerResumen(filtros);

    res.json({
      success: true,
      data: movimientos,
      resumen,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo movimientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener movimientos',
      error: error.message
    });
  }
};

// ===== OBTENER MOVIMIENTOS EN TIEMPO REAL =====
const obtenerMovimientosRecientes = async (req, res) => {
  try {
    const { limite = 20 } = req.query;
    
    const movimientos = await InventoryMovement.obtenerRecientes(parseInt(limite));

    res.json({
      success: true,
      data: movimientos,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error obteniendo movimientos recientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener movimientos recientes',
      error: error.message
    });
  }
};

// ===== OBTENER ALERTAS DE INVENTARIO =====
const obtenerAlertas = async (req, res) => {
  try {
    const alertas = await Product.obtenerAlertas();
    
    // Ordenar por criticidad
    alertas.sort((a, b) => {
      if (a.tipo === 'critico' && b.tipo !== 'critico') return -1;
      if (a.tipo !== 'critico' && b.tipo === 'critico') return 1;
      return a.stock - b.stock;
    });

    res.json({
      success: true,
      data: alertas,
      total: alertas.length,
      criticos: alertas.filter(a => a.tipo === 'critico').length,
      advertencias: alertas.filter(a => a.tipo === 'advertencia').length
    });

  } catch (error) {
    console.error('❌ Error obteniendo alertas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener alertas',
      error: error.message
    });
  }
};

// ===== OBTENER ESTADÍSTICAS DE INVENTARIO =====
const obtenerEstadisticas = async (req, res) => {
  try {
    const estadisticas = await calcularEstadisticasInventario();

    res.json({
      success: true,
      data: estadisticas
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// ===== FUNCIÓN AUXILIAR: CALCULAR ESTADÍSTICAS =====
async function calcularEstadisticasInventario() {
  const totalProductos = await Product.countDocuments({ isActive: true });
  const sinStock = await Product.countDocuments({ stockStatus: 'sin_stock', isActive: true });
  const bajoStock = await Product.countDocuments({ stockStatus: 'bajo_stock', isActive: true });
  const disponible = await Product.countDocuments({ stockStatus: 'disponible', isActive: true });
  
  // Valor total del inventario
  const valorInventario = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$stock'] } } } }
  ]);
  
  // Total de unidades
  const totalUnidades = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: '$stock' } } }
  ]);
  
  // Movimientos hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const movimientosHoy = await InventoryMovement.countDocuments({
    createdAt: { $gte: hoy }
  });
  
  // Ventas hoy (salidas por venta)
  const ventasHoy = await InventoryMovement.countDocuments({
    createdAt: { $gte: hoy },
    motivo: 'venta'
  });

  return {
    totalProductos,
    estadoStock: {
      disponible,
      bajoStock,
      sinStock
    },
    valorInventario: valorInventario[0]?.total || 0,
    totalUnidades: totalUnidades[0]?.total || 0,
    movimientosHoy,
    ventasHoy
  };
}

// ===== VALIDAR STOCK PARA COMPRA =====
const validarStockParaCompra = async (req, res) => {
  try {
    const { productos } = req.body; // Array de { id, cantidad }

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de productos requerida'
      });
    }

    const resultados = [];
    let todoDisponible = true;

    for (const item of productos) {
      const producto = await Product.findById(item.id).select('name stock stockStatus');
      
      if (!producto) {
        resultados.push({
          id: item.id,
          disponible: false,
          mensaje: 'Producto no encontrado'
        });
        todoDisponible = false;
        continue;
      }

      const disponible = producto.stock >= item.cantidad;
      
      if (!disponible) {
        todoDisponible = false;
      }

      resultados.push({
        id: item.id,
        nombre: producto.name,
        cantidadSolicitada: item.cantidad,
        stockDisponible: producto.stock,
        disponible,
        mensaje: disponible 
          ? 'Stock disponible' 
          : `Stock insuficiente. Disponible: ${producto.stock}`
      });
    }

    res.json({
      success: true,
      todoDisponible,
      productos: resultados
    });

  } catch (error) {
    console.error('❌ Error validando stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar stock',
      error: error.message
    });
  }
};

// ===== FUNCIÓN PARA REGISTRAR MOVIMIENTO POR VENTA (uso interno) =====
const registrarMovimientoVenta = async (venta, productos) => {
  try {
    const movimientos = [];

    for (const productoVenta of productos) {
      const producto = await Product.findById(productoVenta.id);
      
      if (!producto) continue;

      const stockAnterior = producto.stock;
      const stockNuevo = stockAnterior - productoVenta.cantidad;

      // Crear movimiento
      const movimiento = new InventoryMovement({
        producto: productoVenta.id,
        productoNombre: productoVenta.nombre,
        tipo: 'salida',
        cantidad: productoVenta.cantidad,
        stockAnterior,
        stockNuevo,
        motivo: 'venta',
        descripcion: `Venta: Orden ${venta.numeroOrden}`,
        ventaRef: venta._id,
        numeroOrden: venta.numeroOrden,
        usuario: 'sistema',
        origen: 'sistema'
      });

      await movimiento.save();
      movimientos.push(movimiento);

      // Actualizar stock del producto
      producto.stock = stockNuevo;
      producto.actualizarStockStatus();
      await producto.save();

      console.log(`📦 Venta: -${productoVenta.cantidad} ${producto.name} (${stockAnterior} → ${stockNuevo})`);
    }

    return movimientos;

  } catch (error) {
    console.error('❌ Error registrando movimiento de venta:', error);
    throw error;
  }
};

// ===== FUNCIÓN PARA REGISTRAR DEVOLUCIÓN (uso interno) =====
const registrarMovimientoDevolucion = async (venta, productos, motivo = 'devolucion_cliente') => {
  try {
    const movimientos = [];

    for (const productoVenta of productos) {
      const producto = await Product.findById(productoVenta.id);
      
      if (!producto) continue;

      const stockAnterior = producto.stock;
      const stockNuevo = stockAnterior + productoVenta.cantidad;

      // Crear movimiento
      const movimiento = new InventoryMovement({
        producto: productoVenta.id,
        productoNombre: productoVenta.nombre,
        tipo: 'entrada',
        cantidad: productoVenta.cantidad,
        stockAnterior,
        stockNuevo,
        motivo,
        descripcion: `Devolución: Orden ${venta.numeroOrden}`,
        ventaRef: venta._id,
        numeroOrden: venta.numeroOrden,
        usuario: 'sistema',
        origen: 'sistema'
      });

      await movimiento.save();
      movimientos.push(movimiento);

      // Actualizar stock del producto
      producto.stock = stockNuevo;
      producto.actualizarStockStatus();
      await producto.save();

      console.log(`📦 Devolución: +${productoVenta.cantidad} ${producto.name} (${stockAnterior} → ${stockNuevo})`);
    }

    return movimientos;

  } catch (error) {
    console.error('❌ Error registrando devolución:', error);
    throw error;
  }
};

module.exports = {
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
  validarStockParaCompra,
  registrarMovimientoVenta,
  registrarMovimientoDevolucion
};


