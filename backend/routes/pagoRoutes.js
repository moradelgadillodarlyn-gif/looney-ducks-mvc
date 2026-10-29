const express = require('express');
const router = express.Router();
const PagoController = require('../controllers/pagoController');
const { requireAuth } = require('../middlewares/auth');

router.get('/', requireAuth, PagoController.getAll);
router.get('/matriz/:anio', requireAuth, PagoController.getMatrizAnual);
router.post('/', requireAuth, PagoController.create);
router.delete('/:id', requireAuth, PagoController.remove);

module.exports = router;
