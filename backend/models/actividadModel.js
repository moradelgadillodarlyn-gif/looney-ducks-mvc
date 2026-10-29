const db = require('../config/db');

const ActividadModel = {
    // Obtener todas las actividades con número de likes
    obtenerTodas: async () => {
        const query = `
            SELECT a.*, 
                   COUNT(l.id) as total_likes 
            FROM actividades a 
            LEFT JOIN actividad_likes l ON a.id = l.actividad_id 
            GROUP BY a.id 
            ORDER BY a.fecha_creacion DESC, a.id DESC`;
        const [rows] = await db.query(query);
        return rows;
    },
    // Reemplaza la función crear en tu actividadModel.js por esta:
crear: async ({ titulo, descripcion, gestion, imagen }) => {
    const query = 'INSERT INTO actividades (titulo, descripcion, anio, imagen) VALUES (?, ?, ?, ?)';
    const [result] = await db.query(query, [titulo, descripcion, gestion, imagen]);
    return result;
},

    // Eliminar actividad por ID
    eliminar: async (id) => {
        const [result] = await db.query('DELETE FROM actividades WHERE id = ?', [id]);
        return result;
    },

    // Agregar Like
    agregarLike: async (actividadId, ip) => {
        const [existing] = await db.query(
            'SELECT id FROM actividad_likes WHERE actividad_id = ? AND user_ip = ?',
            [actividadId, ip]
        );
        if (existing.length > 0) {
            // Si ya dio like, quitamos el like (toggle)
            await db.query('DELETE FROM actividad_likes WHERE id = ?', [existing[0].id]);
            return { action: 'unliked' };
        } else {
            await db.query(
                'INSERT INTO actividad_likes (actividad_id, user_ip) VALUES (?, ?)',
                [actividadId, ip]
            );
            return { action: 'liked' };
        }
    },

    // Obtener Comentarios de una actividad
    obtenerComentarios: async (actividadId) => {
        const [rows] = await db.query(
            'SELECT * FROM actividad_comentarios WHERE actividad_id = ? ORDER BY created_at DESC',
            [actividadId]
        );
        return rows;
    },

    // Guardar Comentario
    agregarComentario: async (actividadId, autor, comentario) => {
        const [result] = await db.query(
            'INSERT INTO actividad_comentarios (actividad_id, autor, comentario) VALUES (?, ?, ?)',
            [actividadId, autor, comentario]
        );
        return result;
    }
};

module.exports = ActividadModel;