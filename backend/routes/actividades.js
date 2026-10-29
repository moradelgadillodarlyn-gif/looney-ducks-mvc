const express = require('express');
const router = express.Router();

// 1. Importar la conexión a la base de datos (Asegúrate de que la ruta coincida con tu carpeta config/db)
const db = require('../config/db'); 

// 2. Importar el middleware de administración (Ajusta la ruta según tu proyecto)
const esAdmin = (req, res, next) => {
    if (req.session && req.session.esAdmin) {
        return next();
    }
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
};

// GET: Obtener todas las actividades con su conteo de likes
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT a.*, COUNT(l.id) AS total_likes 
            FROM actividades a 
            LEFT JOIN likes l ON a.id = l.actividad_id 
            GROUP BY a.id 
            ORDER BY a.fecha_creacion DESC
        `;
        const [actividades] = await db.query(query);
        res.json(actividades);
    } catch (error) {
        console.error('Error al obtener actividades:', error);
        res.status(500).json({ error: 'Error al obtener actividades' });
    }
});

// POST: Crear una nueva actividad (Solo Admin)
router.post('/', esAdmin, async (req, res) => {
    const { titulo, descripcion, imagen_url } = req.body;
    try {
        await db.query(
            'INSERT INTO actividades (titulo, descripcion, imagen_url) VALUES (?, ?, ?)',
            [titulo, descripcion, imagen_url]
        );
        res.status(201).json({ mensaje: 'Actividad creada con éxito' });
    } catch (error) {
        console.error('Error al crear actividad:', error);
        res.status(500).json({ error: 'Error al publicar actividad' });
    }
});

// DELETE: Eliminar actividad por ID (Solo Admin)
router.delete('/:id', esAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM actividades WHERE id = ?', [req.params.id]);
        res.json({ mensaje: 'Actividad eliminada' });
    } catch (error) {
        console.error('Error al eliminar actividad:', error);
        res.status(500).json({ error: 'Error al eliminar la actividad' });
    }
});

// POST: Registrar Me Gusta en una actividad
router.post('/:id/like', async (req, res) => {
    try {
        await db.query('INSERT INTO likes (actividad_id) VALUES (?)', [req.params.id]);
        res.json({ mensaje: 'Like registrado' });
    } catch (error) {
        console.error('Error al registrar like:', error);
        res.status(500).json({ error: 'Error al dar me gusta' });
    }
});

module.exports = router;