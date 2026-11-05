// Ejecutar UNA vez:  cd backend   y luego   node migrar-jugadores.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function agregarColumna(nombre, definicion) {
    const [filas] = await db.query(
        `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jugadores' AND COLUMN_NAME = ?`,
        [nombre]
    );
    if (filas[0].total > 0) {
        console.log(`- ${nombre}: ya existía`);
        return;
    }
    await db.query(`ALTER TABLE jugadores ADD COLUMN ${nombre} ${definicion}`);
    console.log(`- ${nombre}: agregada`);
}

(async () => {
    try {
        await agregarColumna('disciplina', 'VARCHAR(20) NULL AFTER posicion');
        await agregarColumna('tutor_nombre', 'VARCHAR(100) NULL');
        await agregarColumna('tutor_telefono', 'VARCHAR(8) NULL');
        await agregarColumna('destacado', 'TINYINT(1) NOT NULL DEFAULT 0');

        // Los atletas ya existentes: la disciplina se deduce de su posición
        const [futsal] = await db.query(
            `UPDATE jugadores SET disciplina = 'Futsal'
             WHERE disciplina IS NULL
               AND (LOWER(posicion) IN ('guardameta','cierre','ala izquierdo','ala derecho','pívot')
                    OR LOWER(posicion) LIKE '%futsal%')`
        );
        const [handball] = await db.query(
            `UPDATE jugadores SET disciplina = 'Handball' WHERE disciplina IS NULL`
        );
        console.log(`Futsal asignados: ${futsal.affectedRows} | Handball asignados: ${handball.affectedRows}`);
        console.log('✅ Migración terminada');
    } catch (err) {
        console.error('❌ Error en la migración:', err.message);
    } finally {
        process.exit(0);
    }
})();