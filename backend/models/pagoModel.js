const pool = require('../config/db');

const PagoModel = {
    async getAll() {
        const [rows] = await pool.query(
            `SELECT p.*, j.nombre AS jugador_nombre, j.rama AS jugador_rama
             FROM pagos p
             JOIN jugadores j ON j.id = p.jugador_id
             WHERE p.estado = 0 AND j.estado = 0
             ORDER BY p.fecha_pago DESC`
        );
        return rows;
    },

    async getById(id) {
        const [rows] = await pool.query('SELECT * FROM pagos WHERE id = ? AND estado = 0', [id]);
        return rows[0];
    },

    // Matriz anual: todos los jugadores activos + qué meses de ese año ya pagaron
    async getMatrizAnual(anio) {
        const [jugadores] = await pool.query(
            'SELECT id, nombre, rama FROM jugadores WHERE estado = 0 ORDER BY nombre'
        );
        const [pagos] = await pool.query(
            'SELECT jugador_id, mes, monto FROM pagos WHERE anio = ? AND estado = 0', [anio]
        );

        const mesesAnio = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        return jugadores.map(j => {
            const registroMeses = {};
            mesesAnio.forEach(mes => {
                const pago = pagos.find(p => p.jugador_id === j.id && p.mes === mes);
                registroMeses[mes] = pago ? { estado: 'PAGADO', monto: pago.monto } : { estado: 'DEBE' };
            });
            return { id: j.id, nombre: j.nombre, rama: j.rama, meses: registroMeses };
        });
    },

    async create({ jugador_id, anio, mes, monto, usuarios_id }) {
        const [result] = await pool.query(
            `INSERT INTO pagos (jugador_id, anio, mes, monto, fecha_pago, usuarios_id, estado)
             VALUES (?, ?, ?, ?, NOW(), ?, 0)
             ON DUPLICATE KEY UPDATE monto = VALUES(monto), fecha_pago = NOW(), estado = 0, usuarios_id = VALUES(usuarios_id)`,
            [jugador_id, anio, mes, monto, usuarios_id || null]
        );
        return result.insertId;
    },

    // Eliminación lógica: NO borra la fila, solo marca estado = 1
    async softDelete(id) {
        await pool.query('UPDATE pagos SET estado = 1 WHERE id = ?', [id]);
    }
};

module.exports = PagoModel;
