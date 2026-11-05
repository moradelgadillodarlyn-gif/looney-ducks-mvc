const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const crypto = require('crypto');
const express = require('express');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Render funciona detrás de un proxy: necesario para que las sesiones funcionen
app.set('trust proxy', 1);

const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const jugadorRoutes = require('./routes/jugadorRoutes');
const pagoRoutes = require('./routes/pagoRoutes');
const actividadRoutes = require('./routes/actividadRoutes');
const inicioRoutes = require('./routes/inicioRoutes');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Imágenes subidas
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Clave de las sesiones: usa SESSION_SECRET si existe. Si no, genera una aleatoria al arrancar
// (las sesiones ya se pierden al reiniciar el servidor, así que no se pierde nada extra).
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  SESSION_SECRET no está definida: se usa una clave aleatoria temporal.');
}

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2, // 2 horas
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rutas por módulo
app.use('/api', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/jugadores', jugadorRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/actividades', actividadRoutes);
app.use('/api/inicio', inicioRoutes);

app.listen(PORT, () => {
    console.log(`Sistema Administrativo (MVC) en: http://localhost:${PORT}`);
});