function requireAuth(req, res, next) {
    if (req.session && req.session.usuario) return next();
    return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' });
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.usuario && req.session.usuario.rol === 'Admin') return next();
    return res.status(403).json({ error: 'Solo un usuario con rol Admin puede hacer esto.' });
}

module.exports = { requireAuth, requireAdmin };
