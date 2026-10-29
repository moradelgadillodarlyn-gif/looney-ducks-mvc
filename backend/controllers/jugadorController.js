const JugadorModel = require('../models/jugadorModel');

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

    // Inscripción pública
    async create(req, res) {
        const { nombre, posicion, fecha_nacimiento, rama } = req.body;
        if (!nombre || !fecha_nacimiento || !rama) {
            return res.status(400).json({ error: 'Nombre, fecha de nacimiento y rama son obligatorios.' });
        }
        try {
            const usuarios_id = req.session?.usuario?.id || null; // Si lo inscribe la directiva, queda registrado quién fue
            const id = await JugadorModel.create({ nombre, posicion, fecha_nacimiento, rama, usuarios_id });
            res.status(201).json({ mensaje: 'Atleta inscrito correctamente', id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async update(req, res) {
        try {
            await JugadorModel.update(req.params.id, req.body);
            res.json({ mensaje: 'Jugador actualizado correctamente' });
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