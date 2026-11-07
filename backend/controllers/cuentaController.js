const CuentaModel = require('../models/cuentaModel');
const auth = require('../utils/auth');
const { hashPassword } = auth;

// Compara la contraseña escrita con el hash guardado.
// Si tu utils/auth.js la exporta con otro nombre, agrégalo aquí.
const verificarClave = auth.verifyPassword || auth.comparePassword || auth.verificarClave || auth.checkPassword;

const ROLES = ['entrenador', 'atleta', 'padre'];

// ---------- Límites ----------
const LIMITES_POR_ROL = { atleta: 100, padre: 100, entrenador: 2 }; // entrenador: lo asigna el administrador
const MAX_CUENTAS_POR_CELULAR = 2;

const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
const USUARIO_VALIDO = /^[A-Za-z][A-Za-z0-9._]{3,29}$/;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------- Límite de intentos (en memoria) para las rutas públicas ----------
// Solo se anotan los intentos FALLIDOS (o los registros creados). Antes se contaba cada
// petición, y una persona que entraba varias veces con la contraseña correcta quedaba bloqueada.
const intentos = new Map();
function estaBloqueado(clave, max, ventanaMs) {
    const ahora = Date.now();
    const lista = (intentos.get(clave) || []).filter(t => ahora - t < ventanaMs);
    intentos.set(clave, lista);
    return lista.length >= max;
}
function anotarIntento(clave) {
    if (intentos.size > 5000) intentos.clear();
    const lista = intentos.get(clave) || [];
    lista.push(Date.now());
    intentos.set(clave, lista);
}
function olvidarIntentos(clave) {
    intentos.delete(clave);
}

// ---------- Validaciones (mismas reglas que el formulario) ----------
function capitalizar(texto) {
    return texto.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

// Devuelve el nombre limpio y con mayúscula inicial, o null si no es válido
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

// Devuelve { error } o { datos }. En edición la contraseña es opcional.
function validarCuenta(body, { esEdicion = false } = {}) {
    const b = body || {};
    const rol = String(b.rol ?? '').toLowerCase();
    if (!ROLES.includes(rol)) {
        return { error: 'El rol debe ser entrenador, atleta o padre.' };
    }

    const nombre = normalizarNombre(b.nombre, 100);
    if (!nombre) {
        return { error: 'El nombre solo puede contener letras y espacios (entre 2 y 100 caracteres).' };
    }

    let apellido_paterno = null;
    let apellido_materno = null;
    if (rol === 'atleta') {
        apellido_paterno = normalizarNombre(b.apellido_paterno, 50);
        apellido_materno = normalizarNombre(b.apellido_materno, 50);
        if (!apellido_paterno) return { error: 'El apellido paterno es obligatorio y solo puede tener letras.' };
        if (!apellido_materno) return { error: 'El apellido materno es obligatorio y solo puede tener letras.' };
    }

    const usuario = String(b.usuario ?? '').trim();
    if (!USUARIO_VALIDO.test(usuario)) {
        return { error: 'El usuario debe tener entre 4 y 30 caracteres, empezar con una letra y usar solo letras, números, punto o guion bajo.' };
    }

    const celular = String(b.celular ?? '').trim();
    if (!telefonoValido(celular)) {
        return { error: 'El celular debe tener 8 dígitos y no puede ser un número repetitivo.' };
    }

    const correo = String(b.correo ?? '').trim().toLowerCase();
    if (correo.length > 120 || !CORREO_VALIDO.test(correo)) {
        return { error: 'El correo electrónico no es válido.' };
    }

    const clave = String(b.clave ?? '');
    if (!esEdicion || clave) {
        if (clave.length < 6 || clave.length > 100) {
            return { error: 'La contraseña debe tener entre 6 y 100 caracteres.' };
        }
    }

    return {
        datos: {
            rol,
            nombre,
            apellido_paterno,
            apellido_materno,
            usuario: usuario.toLowerCase(),
            celular,
            correo,
            clave: clave || null
        }
    };
}

// Revisa los cupos: celular repetido y límite por rol.
// excluirId = la cuenta que se está editando (para no contarla dos veces). Devuelve un mensaje o null.
async function revisarCupos({ rol, celular }, excluirId = 0) {
    if (await CuentaModel.contarPorCelular(celular, excluirId) >= MAX_CUENTAS_POR_CELULAR) {
        return `Ese número de celular ya está registrado en ${MAX_CUENTAS_POR_CELULAR} cuentas. Usa otro número.`;
    }
    const limite = LIMITES_POR_ROL[rol];
    if (await CuentaModel.contarPorRol(rol, excluirId) >= limite) {
        return rol === 'entrenador'
            ? `Ya hay ${limite} entrenadores asignados.`
            : `Se alcanzó el límite de ${limite} cuentas de ${rol}.`;
    }
    return null;
}

const CuentaController = {
    // ---------- PÚBLICO: crear una cuenta (solo atleta o padre) ----------
    async registrar(req, res) {
        if (estaBloqueado(`reg:${req.ip}`, 10, 60 * 60 * 1000)) {
            return res.status(429).json({ error: 'Demasiados registros desde este dispositivo. Inténtalo más tarde.' });
        }

        const v = validarCuenta(req.body);
        if (v.error) return res.status(400).json({ error: v.error });

        // El rol de entrenador solo lo asigna el administrador desde su panel
        if (v.datos.rol === 'entrenador') {
            return res.status(403).json({ error: 'El rol de entrenador lo asigna el administrador. Crea tu cuenta como atleta o padre.' });
        }

        if (String(req.body.clave_confirmacion ?? '') !== v.datos.clave) {
            return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
        }

        try {
            if (await CuentaModel.existeCorreo(v.datos.correo)) {
                return res.status(409).json({ error: 'Ese correo electrónico ya está registrado en otra cuenta.' });
            }
            const errorCupo = await revisarCupos(v.datos);
            if (errorCupo) return res.status(409).json({ error: errorCupo });

            const id = await CuentaModel.create({
                ...v.datos,
                claveHasheada: await hashPassword(v.datos.clave)
            });
            anotarIntento(`reg:${req.ip}`); // solo cuentan los registros realmente creados
            res.status(201).json({ exito: true, mensaje: 'Cuenta creada correctamente.', id });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso. Elige otro.' });
            }
            res.status(500).json({ error: err.message });
        }
    },

    // ---------- PÚBLICO: iniciar sesión con usuario o correo ----------
    async login(req, res) {
        const identificador = String(req.body.identificador ?? '').trim().toLowerCase();
        const clave = String(req.body.clave ?? '');

        if (!identificador || !clave) {
            return res.status(400).json({ error: 'Escribe tu usuario o correo y tu contraseña.' });
        }
        const claveIntentos = `log:${req.ip}:${identificador}`;
        if (estaBloqueado(claveIntentos, 8, 15 * 60 * 1000)) {
            return res.status(429).json({ error: 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.' });
        }
        if (typeof verificarClave !== 'function') {
            console.error('❌ utils/auth.js no exporta una función para comparar contraseñas (verifyPassword / comparePassword).');
            return res.status(500).json({ error: 'Error de configuración del servidor.' });
        }

        try {
            // Puede haber más de una coincidencia (datos antiguos con correo repetido):
            // se toma la que acepte la contraseña escrita.
            const candidatas = await CuentaModel.getParaLogin(identificador);
            let cuenta = null;
            for (const c of candidatas) {
                if (await verificarClave(clave, c.clave)) { cuenta = c; break; }
            }

            // Mismo mensaje si el usuario no existe o la contraseña falla (no revela cuál)
            if (!cuenta) {
                anotarIntento(claveIntentos);
                return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
            }
            olvidarIntentos(claveIntentos);

            req.session.cuenta = {
                id: cuenta.id,
                rol: cuenta.rol,
                usuario: cuenta.usuario,
                nombre: cuenta.nombre
            };
            res.json({ exito: true, cuenta: req.session.cuenta });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // ---------- PÚBLICO: ¿hay una sesión abierta? (cuenta o administrador) ----------
    sesion(req, res) {
        if (req.session?.usuario) return res.json({ autenticado: true, tipo: 'admin' });
        if (req.session?.cuenta) return res.json({ autenticado: true, tipo: 'cuenta', cuenta: req.session.cuenta });
        res.json({ autenticado: false });
    },

    // ---------- PÚBLICO: cerrar sesión de una cuenta ----------
    logout(req, res) {
        if (req.session) delete req.session.cuenta;
        res.json({ exito: true });
    },

    // ---------- PÚBLICO: recuperar la contraseña con celular o correo ----------
    async recuperarClave(req, res) {
        const usuario = String(req.body.usuario ?? '').trim().toLowerCase();
        const contacto = String(req.body.contacto ?? '').trim().toLowerCase();
        const claveNueva = String(req.body.claveNueva ?? '');
        const claveConfirmacion = String(req.body.claveConfirmacion ?? '');

        if (!usuario || !contacto || !claveNueva) {
            return res.status(400).json({ error: 'Completa todos los campos.' });
        }
        const claveIntentos = `rec:${req.ip}:${usuario}`;
        if (estaBloqueado(claveIntentos, 5, 15 * 60 * 1000)) {
            return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' });
        }
        if (claveNueva.length < 6 || claveNueva.length > 100) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener entre 6 y 100 caracteres.' });
        }
        if (claveNueva !== claveConfirmacion) {
            return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
        }

        try {
            const cuenta = await CuentaModel.getParaRecuperar(usuario);

            // Mismo mensaje si el usuario no existe o el dato no coincide (no revela cuál falló)
            const coincide = cuenta && (contacto.includes('@')
                ? String(cuenta.correo).toLowerCase() === contacto
                : String(cuenta.celular) === contacto);

            if (!coincide) {
                anotarIntento(claveIntentos);
                return res.status(400).json({ error: 'Los datos no coinciden con ninguna cuenta registrada.' });
            }

            await CuentaModel.actualizarClave(cuenta.id, await hashPassword(claveNueva));
            olvidarIntentos(claveIntentos);
            res.json({ exito: true, mensaje: 'Contraseña actualizada correctamente.' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // ---------- ADMINISTRADOR ----------
    async listar(req, res) {
        try {
            res.json(await CuentaModel.getAll());
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Aquí el administrador puede cambiar el rol de una cuenta a "entrenador"
    async actualizar(req, res) {
        const v = validarCuenta(req.body, { esEdicion: true });
        if (v.error) return res.status(400).json({ error: v.error });

        try {
            if (await CuentaModel.existeCorreo(v.datos.correo, Number(req.params.id))) {
                return res.status(409).json({ error: 'Ese correo electrónico ya está registrado en otra cuenta.' });
            }
            const errorCupo = await revisarCupos(v.datos, Number(req.params.id));
            if (errorCupo) return res.status(409).json({ error: errorCupo });

            const filas = await CuentaModel.update(req.params.id, v.datos);
            if (filas === 0) return res.status(404).json({ error: 'Cuenta no encontrada.' });

            if (v.datos.clave) {
                await CuentaModel.actualizarClave(req.params.id, await hashPassword(v.datos.clave));
            }
            res.json({ exito: true, mensaje: 'Cuenta actualizada correctamente.' });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso.' });
            }
            res.status(500).json({ error: err.message });
        }
    },

    // Eliminación lógica (estado = 1)
    async eliminar(req, res) {
        try {
            await CuentaModel.softDelete(req.params.id);
            res.json({ mensaje: 'Cuenta eliminada (lógicamente) con éxito' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = CuentaController;