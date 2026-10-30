const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt'); // Importado para encriptar la contraseña

const app = express(); // <--- Aquí se crea la aplicación de Express primero
const PORT = process.env.PORT || 3000;

const Usuario = require('./models/usuarioModel'); // Importado para actualizar la base de datos

const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const jugadorRoutes = require('./routes/jugadorRoutes');
const pagoRoutes = require('./routes/pagoRoutes');
const actividadRoutes = require('./routes/actividadRoutes');

app.use(express.json());

// Archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Servir la carpeta de imágenes subidas para hacerlas accesibles desde la web
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'cambia_esto',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 2, httpOnly: true } // 2 horas
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ==========================================
//    RUTAS (Controladores por módulo)
// ==========================================
app.use('/api', authRoutes);                 // /api/login, /api/logout, /api/sesion, /api/cambiar-clave
app.use('/api/usuarios', usuarioRoutes);      // CRUD usuarios (directiva)
app.use('/api/jugadores', jugadorRoutes);     // CRUD jugadores
app.use('/api/pagos', pagoRoutes);            // CRUD pagos + matriz anual
app.use('/api/actividades', actividadRoutes); // CRUD actividades (con imágenes)

// ==========================================
//    RUTA TEMPORAL PARA RESTABLECER CONTRASEÑA
// ==========================================
app.get('/reset-pass', async (req, res) => {
    try {
        const usuarioAdmin = await Usuario.getByUsuarioConClave('admin');
        if (!usuarioAdmin) {
            return res.status(404).send('❌ El usuario "admin" no existe en la base de datos.');
        }

        const nuevaClaveHash = await bcrypt.hash('12345', 10);
        await Usuario.actualizarClave(usuarioAdmin.id, nuevaClaveHash);

        res.send('✅ Contraseña del usuario "admin" restablecida con éxito a: 12345');
    } catch (error) {
        res.status(500).send('❌ Error al restablecer la contraseña: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Sistema Administrativo (MVC) en: http://localhost:${PORT}`);
});