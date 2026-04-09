const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, ticketController.create);
router.get('/mine', requireAuth, ticketController.listMine);
router.post('/:id/messages', requireAuth, ticketController.addUserMessage);
router.get('/:id', requireAuth, ticketController.getById);

module.exports = router;
