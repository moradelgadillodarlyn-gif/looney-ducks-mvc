const db = require('../config/db'); // <-- ajusta si tu archivo se llama distinto

// Métricas: número entero (máx. 7 dígitos) con un "+" opcional al inicio o al final (+150, 15+, 8)
const METRICA_VALIDA = /^(\+\d{1,7}|\d{1,7}\+|\d{1,7})$/;

const InicioModel = {
    async getEstadisticas() {
        const [rows] = await db.query('SELECT atletas, titulos, disciplinas, anios FROM estadisticas_club WHERE id = 1');
        return rows[0];
    },
    async updateEstadisticas({ atletas, titulos, disciplinas, anios }) {
        const valores = { atletas, titulos, disciplinas, anios };
        for (const [campo, valor] of Object.entries(valores)) {
            if (!METRICA_VALIDA.test(String(valor ?? '').trim())) {
                throw new Error(`"${campo}" debe ser un número entero, con un "+" opcional al inicio o al final (ej. +150, 15+).`);
            }
        }
        await db.query(
            'UPDATE estadisticas_club SET atletas = ?, titulos = ?, disciplinas = ?, anios = ? WHERE id = 1',
            [String(atletas).trim(), String(titulos).trim(), String(disciplinas).trim(), String(anios).trim()]
        );
    },
    async getEncuentro() {
        const [rows] = await db.query('SELECT equipo_local, equipo_rival, lugar, fecha_hora, estado FROM proximo_encuentro WHERE id = 1');
        return rows[0];
    },
    async updateEncuentro({ equipo_local, equipo_rival, lugar, fecha_hora, estado }) {
        await db.query(
            'UPDATE proximo_encuentro SET equipo_local = ?, equipo_rival = ?, lugar = ?, fecha_hora = ?, estado = ? WHERE id = 1',
            [equipo_local, equipo_rival, lugar, fecha_hora, estado]
        );
    }
};

module.exports = InicioModel;