const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

(async () => {
    try {
        await db.query(`CREATE TABLE IF NOT EXISTS estadisticas_club (
            id INT PRIMARY KEY,
            atletas VARCHAR(20) NOT NULL,
            titulos VARCHAR(20) NOT NULL,
            disciplinas VARCHAR(20) NOT NULL,
            anios VARCHAR(20) NOT NULL
        )`);
        await db.query(`INSERT INTO estadisticas_club VALUES (1, '+250', '15+', '2', '8')
            ON DUPLICATE KEY UPDATE id = id`);

        await db.query(`CREATE TABLE IF NOT EXISTS proximo_encuentro (
            id INT PRIMARY KEY,
            equipo_local VARCHAR(60) NOT NULL,
            equipo_rival VARCHAR(60) NOT NULL,
            lugar VARCHAR(120) NOT NULL,
            fecha_hora VARCHAR(80) NOT NULL,
            estado VARCHAR(30) NOT NULL
        )`);
        await db.query(`INSERT INTO proximo_encuentro VALUES
            (1, 'Looney Ducks', 'Rival Local', 'Coliseo Municipal de Sacaba', 'Sábado 16:00 HB', 'Próximamente')
            ON DUPLICATE KEY UPDATE id = id`);

        console.log('✅ Tablas creadas correctamente en la base de Aiven.');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
    process.exit();
})();