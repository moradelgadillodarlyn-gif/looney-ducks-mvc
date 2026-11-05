const express = require('express');
const router = express.Router();
const InicioController = require('../controllers/inicioController');

function soloAdmin(req, res, next) {
    const haySesion = req.session && Object.keys(req.session).some(k => k !== 'cookie');
    if (!haySesion) return res.status(401).json({ error: 'No autorizado' });
    next();
}

router.get('/estadisticas', InicioController.getEstadisticas);
router.get('/encuentro', InicioController.getEncuentro);

router.put('/estadisticas', soloAdmin, InicioController.updateEstadisticas);
router.put('/encuentro', soloAdmin, InicioController.updateEncuentro);

module.exports = router;