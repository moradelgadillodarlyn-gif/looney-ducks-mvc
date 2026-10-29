const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');

router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/sesion', AuthController.sesion);
router.post('/cambiar-clave', requireAuth, AuthController.cambiarClave);

module.exports = router;
