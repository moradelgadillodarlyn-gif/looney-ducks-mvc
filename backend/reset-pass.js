const mysql = require('mysql2/promise');
const { hashPassword } = require('./backend/utils/auth'); // Asegúrate de que la ruta a utils/auth sea correcta según donde esté este archivo
require('dotenv').config();

async function cambiarClave() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'looney_ducks_db',
            port: process.env.DB_PORT || 3306,
            ssl: {
                rejectUnauthorized: false
            }
        });

        // Generar la clave con el formato exacto que reconoce auth.js
        const claveEncriptada = hashPassword('12345');

        const [result] = await connection.execute(
            'UPDATE usuarios SET clave = ? WHERE usuario = ?',
            [claveEncriptada, 'admin']
        );

        if (result.affectedRows > 0) {
            console.log('✅ ¡Contraseña restablecida con el método correcto!');
            console.log('👉 Usuario: admin');
            console.log('👉 Nueva Clave: 12345');
        } else {
            console.log('❌ No se encontró el usuario admin.');
        }

        await connection.end();
    } catch (error) {
        console.error('❌ Error al cambiar la clave:', error.message);
    }
}

cambiarClave();
