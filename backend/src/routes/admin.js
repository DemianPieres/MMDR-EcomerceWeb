const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const ticketController = require('../controllers/ticketController');

router.use(requireAuth);
router.use(requireAdmin);

// Tickets (atención al cliente)
router.get('/tickets', ticketController.adminList);
router.get('/tickets/:id', ticketController.adminGetById);
router.patch('/tickets/:id', ticketController.adminUpdate);
router.delete('/tickets/:id', ticketController.adminDeleteTicket);
router.post('/tickets/:id/reply', ticketController.adminReply);

// Rutas de administración de usuarios
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;