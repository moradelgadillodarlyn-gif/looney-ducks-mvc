const JugadorModel = require('../models/jugadorModel');

// Nadie nacido después de este año puede inscribirse (2026 en adelante queda bloqueado)
const ANIO_MAX_NACIMIENTO = 2025;
const ANIO_MIN_NACIMIENTO = 1950;

const POSICIONES_POR_DISCIPLINA = {
    Handball: ['Portero/a', 'Central', 'Lateral Izquierdo', 'Lateral Derecho', 'Extremo Izquierdo', 'Extremo Derecho', 'Pivote'],
    Futsal: ['Guardameta', 'Cierre', 'Ala Izquierdo', 'Ala Derecho', 'Pívot']
};
const DISCIPLINAS_VALIDAS = Object.keys(POSICIONES_POR_DISCIPLINA);

const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;

// Mismas reglas que el formulario: 8 dígitos, sin números repetitivos
function telefonoTutorValido(telefono) {
    if (!/^\d{8}$/.test(telefono)) return false;
    if (/(\d)\1{3,}/.test(telefono)) return false;
    if (new Set(telefono.split('')).size <= 2) return false;
    return true;
}

function calcularEdadExacta(anio, mes, dia) {
    const hoy = new Date();
    let edad = hoy.getFullYear() - anio;
    if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) edad--;
    return edad;
}

function calcularEdadYCategoria(fecha_nacimiento) {
    if (!fecha_nacimiento) return { edad: 0, categoria: 'Mayores' };

    const hoy = new Date();
    const cumple = new Date(fecha_nacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    if (hoy.getMonth() < cumple.getMonth() || (hoy.getMonth() === cumple.getMonth() && hoy.getDate() < cumple.getDate())) {
        edad--;
    }
    let categoria = 'Mayores';
    if (edad <= 12) categoria = 'Sub-12';
    else if (edad <= 15) categoria = 'Sub-15';
    else if (edad <= 18) categoria = 'Juvenil';
    return { edad, categoria };
}

// Validación única: la usan tanto la inscripción (create) como la edición (update).
// Devuelve { error } o { datos } ya limpios.
function validarJugador(body) {
    const { nombre, disciplina, posicion, fecha_nacimiento, rama, tutor_nombre, tutor_telefono } = body || {};

    if (!nombre || !disciplina || !fecha_nacimiento || !rama) {
        return { error: 'Nombre, disciplina, fecha de nacimiento y rama son obligatorios.' };
    }

    // Nombre: solo letras y espacios, máximo 100 caracteres
    const nombreLimpio = String(nombre).trim();
    if (nombreLimpio.length < 2 || nombreLimpio.length > 100 || !SOLO_LETRAS.test(nombreLimpio)) {
        return { error: 'El nombre solo puede contener letras y espacios (máximo 100 caracteres).' };
    }

    if (!DISCIPLINAS_VALIDAS.includes(disciplina)) {
        return { error: 'La disciplina debe ser Handball o Futsal.' };
    }

    if (!['Masculino', 'Femenino'].includes(rama)) {
        return { error: 'La rama debe ser Masculino o Femenino.' };
    }

    if (posicion && !POSICIONES_POR_DISCIPLINA[disciplina].includes(posicion)) {
        return { error: 'La posición no corresponde a la disciplina elegida.' };
    }

    // Fecha: formato AAAA-MM-DD (si llega con hora se recorta), que exista de verdad y dentro del rango permitido
    const [anio, mes, dia] = String(fecha_nacimiento).slice(0, 10).split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    const fechaExiste = [anio, mes, dia].every(Number.isInteger) &&
        fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;

    if (!fechaExiste) {
        return { error: 'La fecha de nacimiento no es válida.' };
    }
    if (anio > ANIO_MAX_NACIMIENTO) {
        return { error: `No se pueden inscribir atletas nacidos en ${ANIO_MAX_NACIMIENTO + 1} o después.` };
    }
    if (anio < ANIO_MIN_NACIMIENTO) {
        return { error: 'El año de nacimiento no es válido.' };
    }

    // Menores de edad: los datos del tutor son obligatorios
    let tutorNombreLimpio = null;
    let tutorTelefonoLimpio = null;
    if (calcularEdadExacta(anio, mes, dia) < 18) {
        tutorNombreLimpio = String(tutor_nombre ?? '').trim();
        tutorTelefonoLimpio = String(tutor_telefono ?? '').trim();

        if (!tutorNombreLimpio || tutorNombreLimpio.length > 100 || !SOLO_LETRAS.test(tutorNombreLimpio)) {
            return { error: 'El atleta es menor de edad: el nombre del tutor es obligatorio y solo puede tener letras.' };
        }
        if (!telefonoTutorValido(tutorTelefonoLimpio)) {
            return { error: 'El teléfono del tutor debe tener 8 dígitos y no puede ser un número repetitivo.' };
        }
    }

    return {
        datos: {
            nombre: nombreLimpio,
            disciplina,
            posicion: posicion || null,
            fecha_nacimiento: `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
            rama,
            tutor_nombre: tutorNombreLimpio,
            tutor_telefono: tutorTelefonoLimpio
        }
    };
}

const JugadorController = {
    async getAll(req, res) {
        try {
            const jugadores = await JugadorModel.getAll();
            const procesados = jugadores.map(j => {
                const nombreCompleto = j.nombre_completo || `${j.nombre || ''} ${j.apellido || ''}`.trim();
                return {
                    ...j,
                    nombre_completo: nombreCompleto,
                    ...calcularEdadYCategoria(j.fecha_nacimiento)
                };
            });
            res.json(procesados);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async getById(req, res) {
        try {
            const jugador = await JugadorModel.getById(req.params.id);
            if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' });

            const nombreCompleto = jugador.nombre_completo || `${jugador.nombre || ''} ${jugador.apellido || ''}`.trim();
            res.json({
                ...jugador,
                nombre_completo: nombreCompleto,
                ...calcularEdadYCategoria(jugador.fecha_nacimiento)
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Inscripción pública (por eso se valida todo aquí, no solo en el formulario)
    async create(req, res) {
        const v = validarJugador(req.body);
        if (v.error) return res.status(400).json({ error: v.error });

        try {
            const usuarios_id = req.session?.usuario?.id || null; // Si lo inscribe la directiva, queda registrado quién fue
            const id = await JugadorModel.create({ ...v.datos, usuarios_id });
            res.status(201).json({ mensaje: 'Atleta inscrito correctamente', id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Edición (solo administrador): mismas reglas que la inscripción
    async update(req, res) {
        const v = validarJugador(req.body);
        if (v.error) return res.status(400).json({ error: v.error });

        try {
            await JugadorModel.update(req.params.id, v.datos);
            res.json({ mensaje: 'Jugador actualizado correctamente' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async toggleDestacado(req, res) {
        try {
            await JugadorModel.toggleDestacado(req.params.id);
            res.json({ mensaje: 'Estado destacado actualizado' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // Eliminación lógica (estado = 1), no borra el registro de la BD
    async remove(req, res) {
        try {
            await JugadorModel.softDelete(req.params.id);
            res.json({ mensaje: 'Jugador eliminado (lógicamente) con éxito' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = JugadorController;