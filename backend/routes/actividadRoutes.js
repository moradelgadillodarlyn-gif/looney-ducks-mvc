const express = require('express');
const router = express.Router();
const actividadController = require('../controllers/actividadController');
const upload = require('../middlewares/upload');

const esAdmin = (req, res, next) => {
    if (req.session && (req.session.usuario || req.session.esAdmin)) {
        return next();
    }
    return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de Administrador.' });
};

router.get('/', actividadController.getActividades);

// Acepta archivos provenientes tanto del campo 'imagenes' como del campo legacy 'imagen'
router.post('/', esAdmin, (req, res, next) => {
    upload.fields([
        { name: 'imagenes', maxCount: 12 },
        { name: 'imagen', maxCount: 12 }
    ])(req, res, (err) => {
        if (err) {
            console.error('❌ Error en el middleware Multer:', err);
            return res.status(400).json({ error: 'Error al procesar imágenes: ' + err.message });
        }
        next();
    });
}, actividadController.createActividad);

// Editar año, título y descripción (solo administrador)
router.put('/:id', esAdmin, actividadController.updateActividad);

router.delete('/:id', esAdmin, actividadController.deleteActividad);
router.post('/:id/like', actividadController.toggleLike);
router.get('/:id/comentarios', actividadController.getComentarios);
router.post('/:id/comentarios', actividadController.postComentario);

module.exports = router;