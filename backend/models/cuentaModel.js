const pool = require('../config/db');

const CuentaModel = {
    // Listado para el administrador (nunca devuelve la contraseña)
    async getAll() {
        const [rows] = await pool.query(
            `SELECT id, rol, nombre, apellido_paterno, apellido_materno, usuario, celular, correo, fecha_creacion
             FROM cuentas
             WHERE estado = 0
             ORDER BY rol, nombre`
        );
        return rows;
    },

    // Datos mínimos para verificar la identidad al recuperar la contraseña
    async getParaRecuperar(usuario) {
        const [rows] = await pool.query(
            'SELECT id, celular, correo FROM cuentas WHERE usuario = ? AND estado = 0',
            [usuario]
        );
        return rows[0];
    },

    // Para iniciar sesión: se busca por usuario o por correo (ambos se guardan en minúsculas).
    // Devuelve TODAS las coincidencias (el usuario primero): si por datos antiguos un correo
    // estuviera repetido, el controlador prueba la contraseña con cada una.
    async getParaLogin(identificador) {
        const [rows] = await pool.query(
            `SELECT id, rol, nombre, usuario, clave
             FROM cuentas
             WHERE (usuario = ? OR correo = ?) AND estado = 0
             ORDER BY (usuario = ?) DESC, id
             LIMIT 5`,
            [identificador, identificador, identificador]
        );
        return rows;
    },

    // ¿Ya hay una cuenta activa con ese correo? (excluirId = la cuenta que se está editando)
    async existeCorreo(correo, excluirId = 0) {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS total FROM cuentas WHERE correo = ? AND estado = 0 AND id <> ?',
            [correo, excluirId]
        );
        return Number(rows[0].total) > 0;
    },

    // Cuántas cuentas activas hay con ese rol (excluirId evita contar la cuenta que se está editando)
    async contarPorRol(rol, excluirId = 0) {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS total FROM cuentas WHERE rol = ? AND estado = 0 AND id <> ?',
            [rol, excluirId]
        );
        return Number(rows[0].total);
    },

    // Cuántas cuentas activas usan ese celular
    async contarPorCelular(celular, excluirId = 0) {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS total FROM cuentas WHERE celular = ? AND estado = 0 AND id <> ?',
            [celular, excluirId]
        );
        return Number(rows[0].total);
    },

    async create(d) {
        const [result] = await pool.query(
            `INSERT INTO cuentas
             (rol, nombre, apellido_paterno, apellido_materno, usuario, clave, celular, correo, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [d.rol, d.nombre, d.apellido_paterno, d.apellido_materno, d.usuario, d.claveHasheada, d.celular, d.correo]
        );
        return result.insertId;
    },

    // Devuelve cuántas filas coincidieron (0 = no existe o está eliminada)
    async update(id, d) {
        const [result] = await pool.query(
            `UPDATE cuentas
             SET rol = ?, nombre = ?, apellido_paterno = ?, apellido_materno = ?,
                 usuario = ?, celular = ?, correo = ?
             WHERE id = ? AND estado = 0`,
            [d.rol, d.nombre, d.apellido_paterno, d.apellido_materno, d.usuario, d.celular, d.correo, id]
        );
        return result.affectedRows;
    },

    async actualizarClave(id, claveHasheada) {
        await pool.query('UPDATE cuentas SET clave = ? WHERE id = ? AND estado = 0', [claveHasheada, id]);
    },

    // Eliminación lógica: no borra la fila, solo marca estado = 1.
    // Además libera el usuario y el correo (les agrega "~id"; el "~" no es válido al registrarse,
    // así que nunca choca) para que la persona pueda volver a crear su cuenta.
    async softDelete(id) {
        await pool.query(
            `UPDATE cuentas
             SET estado = 1,
                 usuario = CONCAT(LEFT(usuario, 30 - CHAR_LENGTH(id) - 1), '~', id),
                 correo  = CONCAT(LEFT(correo, 120 - CHAR_LENGTH(id) - 1), '~', id)
             WHERE id = ? AND estado = 0`,
            [id]
        );
    }
};

module.exports = CuentaModel;