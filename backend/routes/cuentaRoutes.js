const express = require('express');
const router = express.Router();
const CuentaController = require('../controllers/cuentaController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

// Públicas: crear cuenta, iniciar/cerrar sesión, ver si hay sesión y recuperar contraseña
router.post('/registro', CuentaController.registrar);
router.post('/login', CuentaController.login);
router.post('/logout', CuentaController.logout);
router.get('/sesion', CuentaController.sesion);
router.post('/recuperar-clave', CuentaController.recuperarClave);

// Solo administrador: ver, editar (incluye asignar rol de entrenador) y eliminar cuentas
router.get('/', requireAuth, requireAdmin, CuentaController.listar);
router.put('/:id', requireAuth, requireAdmin, CuentaController.actualizar);
router.delete('/:id', requireAuth, requireAdmin, CuentaController.eliminar);

module.exports = router;