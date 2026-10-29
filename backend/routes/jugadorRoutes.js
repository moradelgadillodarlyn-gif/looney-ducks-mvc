const express = require('express');
const router = express.Router();
const JugadorController = require('../controllers/jugadorController');
const { requireAuth } = require('../middlewares/auth');

// Obtener todos los jugadores (Público: permite poblar tablas, matrices de pago y desplegables)
router.get('/', JugadorController.getAll);

// Obtener jugador por ID (Público)
router.get('/:id', JugadorController.getById);

// Inscripción / Registro de nuevo jugador (Público)
router.post('/', JugadorController.create);

// Actualizar datos del jugador (Requiere sesión de Administrador)
router.put('/:id', requireAuth, JugadorController.update);

// Eliminar jugador (Requiere sesión de Administrador)
router.delete('/:id', requireAuth, JugadorController.remove);

module.exports = router;