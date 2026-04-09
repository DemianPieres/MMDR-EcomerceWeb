const Ticket = require('../models/ticket');
const User = require('../models/user');

async function create(req, res) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: 'Iniciá sesión para crear un ticket' });
    }
    const { mensajeInicial, tipoConsulta } = req.body;
    if (!mensajeInicial || typeof mensajeInicial !== 'string' || !mensajeInicial.trim()) {
      return res.status(400).json({ success: false, message: 'mensajeInicial es obligatorio' });
    }

    const userId = req.session.userId;
    const ticket = new Ticket({
      usuarioId: userId,
      guestLabel: '',
      mensajeInicial: mensajeInicial.trim().slice(0, 4000),
      tipoConsulta: tipoConsulta ? String(tipoConsulta).slice(0, 200) : '',
      mensajes: [{ from: 'user', texto: mensajeInicial.trim().slice(0, 4000) }]
    });

    await ticket.save();

    const payload = {
      success: true,
      ticket: {
        _id: ticket._id,
        estado: ticket.estado,
        mensajeInicial: ticket.mensajeInicial,
        tipoConsulta: ticket.tipoConsulta,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        mensajes: ticket.mensajes
      }
    };

    return res.status(201).json(payload);
  } catch (err) {
    console.error('create ticket:', err);
    return res.status(500).json({ success: false, message: 'Error al crear el ticket' });
  }
}

function puedeVerTicket(ticket, req) {
  const uid = req.session && req.session.userId;
  const ownerId = ticket.usuarioId && ticket.usuarioId.toString();
  return !!(uid && ownerId && ownerId === String(uid));
}

async function getById(req, res) {
  try {
    const ticket = await Ticket.findById(req.params.id).lean();
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }
    if (!puedeVerTicket(ticket, req)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    return res.json({ success: true, ticket });
  } catch (err) {
    console.error('get ticket:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}

async function listMine(req, res) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: 'Iniciá sesión para ver tus tickets' });
    }
    const tickets = await Ticket.find({
      usuarioId: req.session.userId,
      estado: { $nin: ['Resuelto', 'Cerrado'] }
    })
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ success: true, tickets });
  } catch (err) {
    console.error('list mine:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}

async function adminList(req, res) {
  try {
    const { estado } = req.query;
    const filter = { estado: { $nin: ['Resuelto', 'Cerrado'] } };
    if (estado && ['Pendiente', 'En proceso'].includes(estado)) {
      filter.estado = estado;
    }
    const tickets = await Ticket.find(filter)
      .populate('usuarioId', 'name email')
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ success: true, tickets });
  } catch (err) {
    console.error('admin list tickets:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}

async function adminGetById(req, res) {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('usuarioId', 'name email')
      .lean();
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }
    return res.json({ success: true, ticket });
  } catch (err) {
    console.error('admin get ticket:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}

async function adminUpdate(req, res) {
  try {
    const { estado } = req.body;
    const allowed = ['Pendiente', 'En proceso'];
    if (!estado || !allowed.includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    ).populate('usuarioId', 'name email').lean();
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }
    return res.json({ success: true, ticket });
  } catch (err) {
    console.error('admin update ticket:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}

async function adminDeleteTicket(req, res) {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }
    return res.json({ success: true, deleted: true });
  } catch (err) {
    console.error('admin delete ticket:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}

async function addUserMessage(req, res) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }
    const { texto } = req.body;
    if (!texto || typeof texto !== 'string' || !texto.trim()) {
      return res.status(400).json({ success: false, message: 'texto es obligatorio' });
    }
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }
    if (String(ticket.usuarioId) !== String(req.session.userId)) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    const mensajesAdmin = (ticket.mensajes || []).some(m => m.from === 'admin');
    const agenteActivo =
      ticket.estado === 'En proceso' || mensajesAdmin;
    if (!agenteActivo) {
      return res.status(400).json({ success: false, message: 'El equipo aún no inició la conversación' });
    }
    ticket.mensajes.push({ from: 'user', texto: texto.trim().slice(0, 4000) });
    await ticket.save();
    const updated = await Ticket.findById(ticket._id).lean();
    return res.json({ success: true, ticket: updated });
  } catch (err) {
    console.error('addUserMessage:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}

async function adminReply(req, res) {
  try {
    const { texto } = req.body;
    if (!texto || typeof texto !== 'string' || !texto.trim()) {
      return res.status(400).json({ success: false, message: 'texto es obligatorio' });
    }
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }
    ticket.mensajes.push({ from: 'admin', texto: texto.trim().slice(0, 4000) });
    if (ticket.estado === 'Pendiente') ticket.estado = 'En proceso';
    await ticket.save();
    const updated = await Ticket.findById(ticket._id)
      .populate('usuarioId', 'name email')
      .lean();
    return res.json({ success: true, ticket: updated });
  } catch (err) {
    console.error('admin reply:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
}

module.exports = {
  create,
  getById,
  listMine,
  adminList,
  adminGetById,
  adminUpdate,
  adminReply,
  adminDeleteTicket,
  addUserMessage
};
