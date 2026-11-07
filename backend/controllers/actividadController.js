const db = require('../config/db');
const ActividadModel = require('../models/actividadModel');

// GET: Obtener todas las actividades
exports.getActividades = async (req, res) => {
    try {
        const query = `
            SELECT a.*, COUNT(l.id) AS total_likes 
            FROM actividades a 
            LEFT JOIN actividad_likes l ON a.id = l.actividad_id 
            GROUP BY a.id 
            ORDER BY a.id DESC
        `;
        const [actividades] = await db.query(query);

        const actividadesFormateadas = actividades.map(act => {
            let imagenes = [];
            if (act.imagen_url) {
                try {
                    imagenes = JSON.parse(act.imagen_url);
                    if (!Array.isArray(imagenes)) imagenes = [act.imagen_url];
                } catch (e) {
                    imagenes = [act.imagen_url];
                }
            }
            return { ...act, imagenes };
        });

        res.json(actividadesFormateadas);
    } catch (error) {
        console.error('Error en getActividades:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST: Crear actividad con subida múltiple
exports.createActividad = async (req, res) => {
    try {
        // Extraemos 'anio' para que coincida con la columna de la BD
        const { anio, titulo, descripcion } = req.body;

        if (!titulo) {
            return res.status(400).json({ error: 'El título es obligatorio' });
        }

        let archivos = [];
        if (req.files) {
            if (req.files.imagenes) archivos = archivos.concat(req.files.imagenes);
            if (req.files.imagen) archivos = archivos.concat(req.files.imagen);
        } else if (req.file) {
            archivos.push(req.file);
        }

        let rutasImagenes = archivos.map(file => `/uploads/${file.filename}`);
        const imagen_url = rutasImagenes.length > 0 ? JSON.stringify(rutasImagenes) : null;

        await db.query(
            'INSERT INTO actividades (anio, titulo, descripcion, imagen_url) VALUES (?, ?, ?, ?)',
            [anio || 2026, titulo, descripcion, imagen_url]
        );

        res.status(201).json({ mensaje: 'Actividad creada con éxito' });
    } catch (error) {
        console.error('❌ Error en createActividad:', error);
        res.status(500).json({ error: 'Error del servidor: ' + error.message });
    }
};

// PUT: Editar año, título y descripción de una actividad (las imágenes no se tocan)
exports.updateActividad = async (req, res) => {
    try {
        const { anio, titulo, descripcion } = req.body;
        const tituloLimpio = String(titulo ?? '').trim();
        const anioNum = Number(anio);

        if (!tituloLimpio) {
            return res.status(400).json({ error: 'El título es obligatorio' });
        }
        if (tituloLimpio.length > 150) {
            return res.status(400).json({ error: 'El título no puede superar los 150 caracteres.' });
        }
        if (!Number.isInteger(anioNum) || anioNum < 2018 || anioNum > 2099) {
            return res.status(400).json({ error: 'El año debe estar entre 2018 y 2099.' });
        }

        const [resultado] = await db.query(
            'UPDATE actividades SET anio = ?, titulo = ?, descripcion = ? WHERE id = ?',
            [anioNum, tituloLimpio, String(descripcion ?? '').trim(), req.params.id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Actividad no encontrada' });
        }

        res.json({ mensaje: 'Actividad actualizada con éxito' });
    } catch (error) {
        console.error('Error en updateActividad:', error);
        res.status(500).json({ error: error.message });
    }
};

// DELETE: Eliminar actividad por ID
exports.deleteActividad = async (req, res) => {
    try {
        await db.query('DELETE FROM actividades WHERE id = ?', [req.params.id]);
        res.json({ mensaje: 'Actividad eliminada' });
    } catch (error) {
        console.error('Error al eliminar actividad:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST: Registrar o quitar Me Gusta (usa la IP; si ya dio like, lo quita)
exports.toggleLike = async (req, res) => {
    try {
        const resultado = await ActividadModel.agregarLike(req.params.id, req.ip);
        res.json({ mensaje: 'Like registrado', ...resultado });
    } catch (error) {
        console.error('Error al registrar me gusta:', error);
        res.status(500).json({ error: error.message });
    }
};

// GET: Obtener comentarios
exports.getComentarios = async (req, res) => {
    try {
        const [comentarios] = await db.query(
            `SELECT id, actividad_id, autor, comentario AS texto, created_at AS fecha_creacion
             FROM actividad_comentarios
             WHERE actividad_id = ?
             ORDER BY id ASC`,
            [req.params.id]
        );
        res.json(comentarios);
    } catch (error) {
        console.error('Error al obtener comentarios:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST: Publicar comentario
exports.postComentario = async (req, res) => {
    const { texto, autor } = req.body;
    try {
        await db.query(
            'INSERT INTO actividad_comentarios (actividad_id, autor, comentario) VALUES (?, ?, ?)',
            [req.params.id, String(autor || 'Anónimo').slice(0, 100), texto]
        );
        res.status(201).json({ mensaje: 'Comentario agregado' });
    } catch (error) {
        console.error('Error al publicar comentario:', error);
        res.status(500).json({ error: error.message });
    }
};