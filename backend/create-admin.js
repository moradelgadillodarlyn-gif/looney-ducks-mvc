/**
 * Script para crear o actualizar un usuario administrativo.
 *
 * Uso:
 *   node create-admin.js <usuario> <contraseña> <nombre> <apellido_paterno> <apellido_materno> <ci> <celular> [rol]
 *
 * Ejemplo:
 *   node create-admin.js admin MiClaveSegura123 Juan Perez Lopez 12345678 70011122 Admin
 */
const pool = require('./config/db');
const { hashPassword } = require('./utils/auth');

const [, , usuario, password, nombre, apellido_paterno, apellido_materno, ci, celular, rol] = process.argv;

if (!usuario || !password || !nombre) {
    console.log('❌ Uso: node create-admin.js <usuario> <contraseña> <nombre> [apellido_paterno] [apellido_materno] [ci] [celular] [rol]');
    process.exit(1);
}

async function main() {
    const claveHasheada = hashPassword(password);
    const rolFinal = rol || 'Admin';

    const sql = `
      INSERT INTO usuarios (usuario, clave, nombre, apellido_paterno, apellido_materno, ci, celular, rol, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON DUPLICATE KEY UPDATE
        clave = VALUES(clave), nombre = VALUES(nombre), apellido_paterno = VALUES(apellido_paterno),
        apellido_materno = VALUES(apellido_materno), ci = VALUES(ci), celular = VALUES(celular),
        rol = VALUES(rol), estado = 0
    `;

    try {
        await pool.query(sql, [usuario, claveHasheada, nombre, apellido_paterno || null, apellido_materno || null, ci || null, celular || null, rolFinal]);
        console.log(`✅ Usuario "${usuario}" creado/actualizado correctamente con rol "${rolFinal}".`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creando el usuario:', err.message);
        process.exit(1);
    }
}

main();
