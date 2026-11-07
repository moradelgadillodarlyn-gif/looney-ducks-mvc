const pool = require('../config/db');

const CAMPOS_PUBLICOS = 'id, usuario, nombre, apellido_paterno, apellido_materno, ci, celular, rol, estado, fechaActualizacion';

const UsuarioModel = {
    async getAll() {
        const [rows] = await pool.query(
            `SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE estado = 0 ORDER BY nombre`
        );
        return rows;
    },

    async getById(id) {
        const [rows] = await pool.query(
            `SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ? AND estado = 0`, [id]
        );
        return rows[0];
    },

    // Usado solo para login: sí incluye la clave hasheada
    async getByUsuarioConClave(usuario) {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE usuario = ? AND estado = 0', [usuario]
        );
        return rows[0];
    },

    async getClaveById(id) {
        const [rows] = await pool.query('SELECT clave FROM usuarios WHERE id = ? AND estado = 0', [id]);
        return rows[0];
    },

    async create({ usuario, claveHasheada, nombre, apellido_paterno, apellido_materno, ci, celular, rol }) {
        const [result] = await pool.query(
            `INSERT INTO usuarios (usuario, clave, nombre, apellido_paterno, apellido_materno, ci, celular, rol, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [usuario, claveHasheada, nombre, apellido_paterno || null, apellido_materno || null, ci || null, celular || null, rol || 'Directiva']
        );
        return result.insertId;
    },

    async update(id, { nombre, apellido_paterno, apellido_materno, ci, celular, rol }) {
        await pool.query(
            `UPDATE usuarios SET nombre=?, apellido_paterno=?, apellido_materno=?, ci=?, celular=?, rol=?
             WHERE id = ? AND estado = 0`,
            [nombre, apellido_paterno || null, apellido_materno || null, ci || null, celular || null, rol, id]
        );
    },

    async actualizarClave(id, claveHasheada) {
        await pool.query('UPDATE usuarios SET clave = ? WHERE id = ? AND estado = 0', [claveHasheada, id]);
    },

    // Eliminación lógica: NO borra la fila, solo marca estado = 1
    // También libera el nombre de usuario (le agrega "~id") para poder volver a usarlo.
    async softDelete(id) {
        await pool.query(
            `UPDATE usuarios
             SET estado = 1,
                 usuario = CONCAT(LEFT(usuario, 50 - CHAR_LENGTH(id) - 1), '~', id)
             WHERE id = ? AND estado = 0`,
            [id]
        );
    }
};

module.exports = UsuarioModel;
