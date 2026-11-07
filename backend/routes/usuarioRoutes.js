const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/usuarioController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

router.get('/', requireAuth, requireAdmin, UsuarioController.getAll);

// IMPORTANTE: va antes de '/:id' para que "roles" no se tome como un id
router.get('/roles', requireAuth, requireAdmin, UsuarioController.getRoles);

router.get('/:id', requireAuth, requireAdmin, UsuarioController.getById);
router.post('/', requireAuth, requireAdmin, UsuarioController.create);
router.put('/:id', requireAuth, requireAdmin, UsuarioController.update);
router.delete('/:id', requireAuth, requireAdmin, UsuarioController.remove);

module.exports = router;