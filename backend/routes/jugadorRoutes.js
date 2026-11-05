const express = require('express');
const router = express.Router();
const JugadorController = require('../controllers/jugadorController');
const pdfController = require('../controllers/pdfController');
const { requireAuth } = require('../middlewares/auth');

// Todo lo que muestra datos de atletas (menores incluidos) exige sesión de administrador
router.get('/', requireAuth, JugadorController.getAll);

// IMPORTANTE: colocado antes de '/:id' para evitar conflictos de enrutamiento
router.get('/exportar-pdf', requireAuth, pdfController.exportarPlantelPDF);

router.get('/:id', requireAuth, JugadorController.getById);

// Inscripción pública (la validación está en el controlador)
router.post('/', JugadorController.create);

// Marcar / desmarcar atleta destacado
router.patch('/:id/destacado', requireAuth, JugadorController.toggleDestacado);

// Actualizar y eliminar (requieren sesión de Administrador)
router.put('/:id', requireAuth, JugadorController.update);
router.delete('/:id', requireAuth, JugadorController.remove);

module.exports = router;