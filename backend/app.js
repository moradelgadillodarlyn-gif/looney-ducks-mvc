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