const pool = require('../config/db');
const UsuarioModel = require('../models/usuarioModel');
const { hashPassword } = require('../utils/auth');

const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
const USUARIO_VALIDO = /^[A-Za-z0-9._-]{3,30}$/;
const CI_VALIDO = /^[A-Za-z0-9-]{4,20}$/;

function capitalizar(texto) {
    return texto.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

// Devuelve el nombre limpio con mayúscula inicial, o null si no es válido
function normalizarNombre(valor, max) {
    const limpio = String(valor ?? '').trim().replace(/\s+/g, ' ');
    if (limpio.length < 2 || limpio.length > max || !SOLO_LETRAS.test(limpio)) return null;
    return capitalizar(limpio);
}

// 8 dígitos, sin números repetitivos
function telefonoValido(telefono) {
    if (!/^\d{8}$/.test(telefono)) return false;
    if (/(\d)\1{3,}/.test(telefono)) return false;
    if (new Set(telefono.split('')).size <= 2) return false;
    return true;
}

// Los únicos roles permitidos son los que ya existen en la tabla usuarios
async function rolesExistentes() {
    const [rows] = await pool.query(
        "SELECT DISTINCT rol FROM usuarios WHERE rol IS NOT NULL AND rol <> ''"
    );
    return rows.map(r => r.rol);
}

// Devuelve { error } o { datos }. En edición la contraseña es opcional.
async function validarUsuario(body, { esEdicion = false } = {}) {
    const b = body || {};

    const usuario = String(b.usuario ?? '').trim();
    if (!USUARIO_VALIDO.test(usuario)) {
        return { error: 'El usuario debe tener entre 3 y 30 caracteres (letras, números, punto, guion o guion bajo).' };
    }

    const nombre = normalizarNombre(b.nombre, 50);
    if (!nombre) return { error: 'El nombre solo puede contener letras y espacios (máximo 50 caracteres).' };

    let apellido_paterno = null;
    if (String(b.apellido_paterno ?? '').trim()) {
        apellido_paterno = normalizarNombre(b.apellido_paterno, 50);
        if (!apellido_paterno) return { error: 'El apellido paterno solo puede contener letras.' };
    }

    let apellido_materno = null;
    if (String(b.apellido_materno ?? '').trim()) {
        apellido_materno = normalizarNombre(b.apellido_materno, 50);
        if (!apellido_materno) return { error: 'El apellido materno solo puede contener letras.' };
    }

    let ci = null;
    if (String(b.ci ?? '').trim()) {
        ci = String(b.ci).trim();
        if (!CI_VALIDO.test(ci)) return { error: 'El carnet de identidad no es válido (4 a 20 caracteres, solo letras, números o guion).' };
    }

    let celular = null;
    if (String(b.celular ?? '').trim()) {
        celular = String(b.celular).trim();
        if (!telefonoValido(celular)) return { error: 'El celular debe tener 8 dígitos y no puede ser un número repetitivo.' };
    }

    const roles = await rolesExistentes();
    const rol = String(b.rol ?? '').trim();
    if (!rol || !roles.includes(rol)) {
        return { error: 'El rol no es válido.' };
    }

    const clave = String(b.clave ?? '');
    if (!esEdicion || clave) {
        if (clave.length < 6 || clave.length > 100) {
            return { error: 'La contraseña debe tener entre 6 y 100 caracteres.' };
        }
    }

    return {
        datos: { usuario, nombre, apellido_paterno, apellido_materno, ci, celular, rol, clave: clave || null }
    };
}

const UsuarioController = {
    // Nunca devuelve la contraseña
    async getAll(req, res) {
        try {
            const [rows] = await pool.query(
                `SELECT id, usuario, nombre, apellido_paterno, apellido_materno, ci, celular, rol
                 FROM usuarios WHERE estado = 0 ORDER BY id`
            );
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async getRoles(req, res) {
        try {
            res.json(await rolesExistentes());
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async getById(req, res) {
        try {
            const [rows] = await pool.query(
                `SELECT id, usuario, nombre, apellido_paterno, apellido_materno, ci, celular, rol
                 FROM usuarios WHERE id = ? AND estado = 0`,
                [req.params.id]
            );
            if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
            res.json(rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async create(req, res) {
        try {
            const v = await validarUsuario(req.body);
            if (v.error) return res.status(400).json({ error: v.error });

            const d = v.datos;
            const id = await UsuarioModel.create({
                usuario: d.usuario,
                claveHasheada: await hashPassword(d.clave),
                nombre: d.nombre,
                apellido_paterno: d.apellido_paterno,
                apellido_materno: d.apellido_materno,
                ci: d.ci,
                celular: d.celular,
                rol: d.rol
            });
            res.status(201).json({ mensaje: 'Usuario creado correctamente', id });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Ese nombre de usuario ya existe.' });
            }
            res.status(500).json({ error: err.message });
        }
    },

    // Edición: solo cambia los campos permitidos; la contraseña solo si se escribe una nueva
    async update(req, res) {
        try {
            const v = await validarUsuario(req.body, { esEdicion: true });
            if (v.error) return res.status(400).json({ error: v.error });
            const d = v.datos;

            const [actual] = await pool.query('SELECT rol FROM usuarios WHERE id = ? AND estado = 0', [req.params.id]);
            if (!actual[0]) return res.status(404).json({ error: 'Usuario no encontrado' });

            // Evita que el administrador se quite a sí mismo el acceso
            const esMismoUsuario = Number(req.session?.usuario?.id) === Number(req.params.id);
            if (esMismoUsuario && actual[0].rol !== d.rol) {
                return res.status(400).json({ error: 'No puedes cambiar tu propio rol.' });
            }

            await pool.query(
                `UPDATE usuarios
                 SET usuario = ?, nombre = ?, apellido_paterno = ?, apellido_materno = ?, ci = ?, celular = ?, rol = ?
                 WHERE id = ? AND estado = 0`,
                [d.usuario, d.nombre, d.apellido_paterno, d.apellido_materno, d.ci, d.celular, d.rol, req.params.id]
            );

            if (d.clave) {
                await pool.query(
                    'UPDATE usuarios SET clave = ? WHERE id = ? AND estado = 0',
                    [await hashPassword(d.clave), req.params.id]
                );
            }

            res.json({ mensaje: 'Usuario actualizado correctamente' });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Ese nombre de usuario ya existe.' });
            }
            res.status(500).json({ error: err.message });
        }
    },

    // Eliminación lógica (estado = 1), no borra el registro de la BD
    async remove(req, res) {
        try {
            if (Number(req.session?.usuario?.id) === Number(req.params.id)) {
                return res.status(400).json({ error: 'No puedes eliminar tu propio usuario.' });
            }
            await UsuarioModel.softDelete(req.params.id);
            res.json({ mensaje: 'Usuario eliminado (lógicamente) con éxito' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = UsuarioController;