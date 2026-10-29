const UsuarioModel = require('../models/usuarioModel');
const { hashPassword } = require('../utils/auth');

const UsuarioController = {
    async getAll(req, res) {
        try {
            res.json(await UsuarioModel.getAll());
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async getById(req, res) {
        try {
            const usuario = await UsuarioModel.getById(req.params.id);
            if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
            res.json(usuario);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async create(req, res) {
        const { usuario, clave, nombre, apellido_paterno, apellido_materno, ci, celular, rol } = req.body;
        if (!usuario || !clave || !nombre) {
            return res.status(400).json({ error: 'usuario, clave y nombre son obligatorios.' });
        }
        try {
            const id = await UsuarioModel.create({
                usuario, claveHasheada: hashPassword(clave), nombre,
                apellido_paterno, apellido_materno, ci, celular, rol
            });
            res.status(201).json({ mensaje: 'Usuario creado correctamente', id });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Ese nombre de usuario ya existe.' });
            }
            res.status(500).json({ error: err.message });
        }
    },

    async update(req, res) {
        try {
            await UsuarioModel.update(req.params.id, req.body);
            res.json({ mensaje: 'Usuario actualizado correctamente' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Eliminación lógica (estado = 1), no borra el registro de la BD
    async remove(req, res) {
        try {
            await UsuarioModel.softDelete(req.params.id);
            res.json({ mensaje: 'Usuario eliminado (lógicamente) con éxito' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = UsuarioController;
