const pool = require('../config/db');

const JugadorModel = {
    async getAll() {
        const [rows] = await pool.query(
            'SELECT * FROM jugadores WHERE estado = 0 ORDER BY nombre'
        );
        return rows;
    },

    async getById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM jugadores WHERE id = ? AND estado = 0', [id]
        );
        return rows[0];
    },

    async create({ nombre, disciplina, posicion, fecha_nacimiento, rama, tutor_nombre, tutor_telefono, usuarios_id }) {
        const [result] = await pool.query(
            `INSERT INTO jugadores
                (nombre, disciplina, posicion, fecha_nacimiento, rama, tutor_nombre, tutor_telefono, usuarios_id, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                nombre,
                disciplina || null,
                posicion || null,
                fecha_nacimiento,
                rama,
                tutor_nombre || null,
                tutor_telefono || null,
                usuarios_id || null
            ]
        );
        return result.insertId;
    },

    async update(id, { nombre, disciplina, posicion, fecha_nacimiento, rama }) {
        await pool.query(
            `UPDATE jugadores
             SET nombre=?, disciplina=COALESCE(?, disciplina), posicion=?, fecha_nacimiento=?, rama=?
             WHERE id = ? AND estado = 0`,
            [nombre, disciplina ?? null, posicion || null, fecha_nacimiento, rama, id]
        );
    },

    // Marca o desmarca al atleta como destacado (⭐)
    async toggleDestacado(id) {
        await pool.query(
            'UPDATE jugadores SET destacado = IF(destacado = 1, 0, 1) WHERE id = ? AND estado = 0',
            [id]
        );
    },

    // Eliminación lógica: NO borra la fila, solo marca estado = 1
    async softDelete(id) {
        await pool.query('UPDATE jugadores SET estado = 1 WHERE id = ?', [id]);
    }
};

module.exports = JugadorModel;