const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/usuarioController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

router.get('/', requireAuth, requireAdmin, UsuarioController.getAll);
router.get('/:id', requireAuth, requireAdmin, UsuarioController.getById);
router.post('/', requireAuth, requireAdmin, UsuarioController.create);
router.put('/:id', requireAuth, requireAdmin, UsuarioController.update);
router.delete('/:id', requireAuth, requireAdmin, UsuarioController.remove);

module.exports = router;
