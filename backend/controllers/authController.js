const UsuarioModel = require('../models/usuarioModel');
const { verifyPassword, hashPassword } = require('../utils/auth');

const AuthController = {
    async login(req, res) {
        const { usuario, clave } = req.body;
        if (!usuario || !clave) {
            return res.status(400).json({ exito: false, mensaje: 'Usuario y contraseña son requeridos.' });
        }
        try {
            const user = await UsuarioModel.getByUsuarioConClave(usuario);
            if (!user || !verifyPassword(clave, user.clave)) {
                return res.status(401).json({ exito: false, mensaje: 'Usuario o contraseña incorrectos. ¡Intenta de nuevo!' });
            }
            req.session.usuario = { id: user.id, usuario: user.usuario, nombre: user.nombre, rol: user.rol };
            res.json({ exito: true, mensaje: 'Bienvenido al vestuario', usuario: req.session.usuario });
        } catch (err) {
            console.error('Error en login:', err);
            res.status(500).json({ exito: false, mensaje: 'Error en el servidor' });
        }
    },

    logout(req, res) {
        req.session.destroy(() => res.json({ exito: true, mensaje: 'Sesión cerrada.' }));
    },

    sesion(req, res) {
        if (req.session && req.session.usuario) {
            return res.json({ activa: true, usuario: req.session.usuario });
        }
        res.json({ activa: false });
    },

    async cambiarClave(req, res) {
        const { claveActual, claveNueva } = req.body;
        const idUsuario = req.session.usuario.id;

        if (!claveActual || !claveNueva) {
            return res.status(400).json({ exito: false, mensaje: 'Debes ingresar la contraseña actual y la nueva.' });
        }
        if (claveNueva.length < 6) {
            return res.status(400).json({ exito: false, mensaje: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        }

        try {
            const fila = await UsuarioModel.getClaveById(idUsuario);
            if (!fila) return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
            if (!verifyPassword(claveActual, fila.clave)) {
                return res.status(401).json({ exito: false, mensaje: 'La contraseña actual es incorrecta.' });
            }
            await UsuarioModel.actualizarClave(idUsuario, hashPassword(claveNueva));
            res.json({ exito: true, mensaje: 'Contraseña actualizada correctamente.' });
        } catch (err) {
            console.error('Error cambiando la clave:', err);
            res.status(500).json({ exito: false, mensaje: 'Error en el servidor' });
        }
    }
};

module.exports = AuthController;
