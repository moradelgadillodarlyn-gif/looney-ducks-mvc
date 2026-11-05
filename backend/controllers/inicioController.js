const InicioModel = require('../models/inicioModel');

const limpiar = (v, max) => String(v ?? '').trim().slice(0, max);

// Métricas: número entero (máx. 7 dígitos) con un "+" opcional al inicio o al final (+150, 15+, 8)
const METRICA_VALIDA = /^(\+\d{1,7}|\d{1,7}\+|\d{1,7})$/;

const InicioController = {
    async getEstadisticas(req, res) {
        try {
            res.json(await InicioModel.getEstadisticas());
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async updateEstadisticas(req, res) {
        const datos = {
            atletas: limpiar(req.body.atletas, 20),
            titulos: limpiar(req.body.titulos, 20),
            disciplinas: limpiar(req.body.disciplinas, 20),
            anios: limpiar(req.body.anios, 20)
        };
        if (Object.values(datos).some(v => !v)) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
        }
        if (!Object.values(datos).every(v => METRICA_VALIDA.test(v))) {
            return res.status(400).json({
                error: 'Cada métrica debe ser un número entero, con un "+" opcional al inicio o al final (ej. +150, 15+, 8). Sin letras ni decimales.'
            });
        }
        try {
            await InicioModel.updateEstadisticas(datos);
            res.json({ mensaje: 'Estadísticas actualizadas' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async getEncuentro(req, res) {
        try {
            res.json(await InicioModel.getEncuentro());
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async updateEncuentro(req, res) {
        const datos = {
            equipo_local: limpiar(req.body.equipo_local, 60),
            equipo_rival: limpiar(req.body.equipo_rival, 60),
            lugar: limpiar(req.body.lugar, 120),
            fecha_hora: limpiar(req.body.fecha_hora, 80),
            estado: limpiar(req.body.estado, 30)
        };
        if (Object.values(datos).some(v => !v)) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
        }
        try {
            await InicioModel.updateEncuentro(datos);
            res.json({ mensaje: 'Próximo encuentro actualizado' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = InicioController;