const mysql = require('mysql2/promise');
const { hashPassword } = require('./utils/auth');
require('dotenv').config();

async function cambiarClave() {
    try {
        // Configuramos la conexión detectando si hay puerto o si estamos en producción
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'looney_ducks_db',
            port: process.env.DB_PORT || 3306
        };

        // Si estamos conectando a un servidor externo/remoto (como Aiven en Render), activamos el SSL
        if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
            dbConfig.ssl = { rejectUnauthorized: false };
        }

        const connection = await mysql.createConnection(dbConfig);

        const claveEncriptada = hashPassword('12345');

        const [result] = await connection.execute(
            'UPDATE usuarios SET clave = ? WHERE usuario = ?',
            [claveEncriptada, 'admin']
        );

        if (result.affectedRows > 0) {
            console.log('✅ ¡Contraseña restablecida con éxito para la nube!');
            console.log('👉 Usuario: admin');
            console.log('👉 Nueva Clave: 12345');
        } else {
            console.log('❌ No se encontró el usuario admin en la base de datos.');
        }

        await connection.end();
    } catch (error) {
        console.error('❌ Error al cambiar la clave:', error.message);
    }
}

cambiarClave();
