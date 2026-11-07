const PagoModel = require('../models/pagoModel');

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const PagoController = {
    async getAll(req, res) {
        try {
            // /api/pagos?anio=2026 devuelve solo esa gestión
            const pagos = await PagoModel.getAll(req.query.anio);
            res.json(pagos);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async getMatrizAnual(req, res) {
        try {
            const matriz = await PagoModel.getMatrizAnual(req.params.anio);
            res.json(matriz);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async create(req, res) {
        const { jugador_id, anio, mes, monto } = req.body;
        if (!jugador_id || !anio || !mes || monto === undefined) {
            return res.status(400).json({ error: 'Faltan datos del cobro.' });
        }

        const hoy = new Date();
        const diaActual = hoy.getDate();
        const alertaNotificacion = diaActual > 10
            ? `⚠️ ALERTA DE ATRASO: El pago para el mes de ${mes} se realizó el día ${diaActual}. El límite de cancelación son los primeros 10 días del mes. Atleta registrado en estado de mora controlada.`
            : `✅ NOTIFICACIÓN DE CANCELACIÓN: ¡Pago procesado con éxito! Mensualidad de ${mes} al día. Comprobante digital enviado al libro de actas.`;

        try {
            const usuarios_id = req.session?.usuario?.id || null;
            const id = await PagoModel.create({ jugador_id, anio, mes, monto, usuarios_id });
            res.status(201).json({ exito: true, mensaje: 'Guardado', notificacion: alertaNotificacion, id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Edición de un pago: mes, año y monto
    async update(req, res) {
        const { anio, mes, monto } = req.body;
        const anioNum = Number(anio);
        const montoNum = Number(monto);

        if (!MESES.includes(mes)) {
            return res.status(400).json({ error: 'El mes no es válido.' });
        }
        if (!Number.isInteger(anioNum) || anioNum < 2018 || anioNum > 2100) {
            return res.status(400).json({ error: 'El año no es válido.' });
        }
        if (!Number.isFinite(montoNum) || montoNum <= 0) {
            return res.status(400).json({ error: 'El monto debe ser un número mayor a 0.' });
        }

        try {
            const filas = await PagoModel.update(req.params.id, { anio: anioNum, mes, monto: montoNum });
            if (filas === 0) {
                return res.status(404).json({ error: 'Pago no encontrado.' });
            }
            res.json({ exito: true, mensaje: 'Pago actualizado correctamente' });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Ese atleta ya tiene un pago registrado (o anulado) en ese mes y año.' });
            }
            res.status(500).json({ error: err.message });
        }
    },

    // Eliminación lógica (cambia el estado en la BD)
    async remove(req, res) {
        try {
            await PagoModel.softDelete(req.params.id);
            res.json({ mensaje: 'Pago actualizado/eliminado lógicamente con éxito' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = PagoController;