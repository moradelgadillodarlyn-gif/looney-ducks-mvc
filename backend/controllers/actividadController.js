const db = require('../config/db'); 

// GET: Obtener todas las actividades
exports.getActividades = async (req, res) => {
    try {
        const query = `
            SELECT a.*, COUNT(l.id) AS total_likes 
            FROM actividades a 
            LEFT JOIN likes l ON a.id = l.actividad_id 
            GROUP BY a.id 
            ORDER BY a.fecha_creacion DESC
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
        const { gestion, titulo, descripcion } = req.body;
        
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
            'INSERT INTO actividades (gestion, titulo, descripcion, imagen_url) VALUES (?, ?, ?, ?)',
            [gestion || 2026, titulo, descripcion, imagen_url]
        );

        res.status(201).json({ mensaje: 'Actividad creada con éxito' });
    } catch (error) {
        console.error('❌ Error en createActividad:', error);
        res.status(500).json({ error: 'Error del servidor: ' + error.message });
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

// POST: Registrar Me Gusta
exports.toggleLike = async (req, res) => {
    try {
        await db.query('INSERT INTO likes (actividad_id) VALUES (?)', [req.params.id]);
        res.json({ mensaje: 'Like registrado' });
    } catch (error) {
        console.error('Error al registrar me gusta:', error);
        res.status(500).json({ error: error.message });
    }
};

// GET: Obtener comentarios
exports.getComentarios = async (req, res) => {
    try {
        const [comentarios] = await db.query(
            'SELECT * FROM comentarios WHERE actividad_id = ? ORDER BY fecha_creacion ASC', 
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
    const { texto } = req.body;
    try {
        await db.query(
            'INSERT INTO comentarios (actividad_id, texto) VALUES (?, ?)', 
            [req.params.id, texto]
        );
        res.status(201).json({ mensaje: 'Comentario agregado' });
    } catch (error) {
        console.error('Error al publicar comentario:', error);
        res.status(500).json({ error: error.message });
    }
};