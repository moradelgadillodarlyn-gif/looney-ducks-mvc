// js/modules/acceso.js
// Pantalla de acceso que aparece antes de entrar al sitio:
// iniciar sesión (atleta / padre / entrenador), crear cuenta y recuperar contraseña.
// Se activa sola al importarla desde app.js.

const $ = (id) => document.getElementById(id);

const PANELES = ['login', 'cuenta', 'recuperar'];
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

let ultimoUsuario = ''; // para rellenar el login después de crear la cuenta o cambiar la clave

function mensaje(texto, tipo) {
    const el = $('acc-mensaje');
    if (!el) return;
    el.textContent = texto;
    el.className = `cuenta-mensaje ${tipo || ''}`;
}

function limpiarMensajes() {
    ['acc-mensaje', 'cta-mensaje', 'rec-mensaje'].forEach((id) => {
        const el = $(id);
        if (el) { el.textContent = ''; el.className = 'cuenta-mensaje'; }
    });
}

// ---------- Cambio entre login / crear cuenta / recuperar ----------
export function mostrarPanelAcceso(nombre) {
    PANELES.forEach((p) => $(`acceso-${p}`)?.classList.toggle('activo', p === nombre));
    $('tab-login')?.classList.toggle('activo', nombre === 'login');
    $('tab-cuenta')?.classList.toggle('activo', nombre === 'cuenta');
    $('acceso-tabs')?.classList.toggle('oculto', nombre === 'recuperar');
    limpiarMensajes();
}

function abrirAcceso() {
    $('pantalla-acceso')?.classList.remove('oculto');
    document.body.classList.add('acceso-bloqueado');
}

function cerrarAcceso() {
    $('pantalla-acceso')?.classList.add('oculto');
    document.body.classList.remove('acceso-bloqueado');
}

// ---------- Nombre de la cuenta en el menú ----------
function mostrarChip(cuenta) {
    const chip = $('nav-cuenta');
    const nombre = $('nav-cuenta-nombre');
    if (!chip || !nombre) return;
    const rol = String(cuenta.rol || '');
    nombre.textContent = `${cuenta.nombre} · ${rol.charAt(0).toUpperCase()}${rol.slice(1)}`;
    chip.style.display = 'flex';
}

// ---------- Iniciar sesión ----------
async function enviarLogin(e) {
    e.preventDefault();
    mensaje('', '');

    const identificador = $('acc-usuario').value.trim();
    const clave = $('acc-clave').value;

    if (!identificador) return mensaje('Escribe tu usuario o tu correo electrónico.', 'error');
    // Al iniciar sesión solo se revisa el formato del correo; el usuario lo valida el servidor
    // (así no se rechaza a quien tenga un usuario creado con reglas anteriores).
    if (identificador.includes('@') && !CORREO_VALIDO.test(identificador)) {
        return mensaje('El correo electrónico no es válido.', 'error');
    }
    if (!clave) return mensaje('Escribe tu contraseña.', 'error');

    const btn = $('form-acceso').querySelector('button[type="submit"]');
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Ingresando...';

    try {
        const res = await fetch('/api/cuentas/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identificador, clave })
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.cuenta) {
            mostrarChip(data.cuenta);
            $('form-acceso').reset();
            cerrarAcceso();
            if (typeof window.verSeccion === 'function') window.verSeccion('inicio');
        } else {
            mensaje(data.error || 'No se pudo iniciar sesión.', 'error');
        }
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        mensaje('Error de conexión con el servidor.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}

// ---------- Cerrar sesión ----------
async function cerrarSesionCuenta() {
    try { await fetch('/api/cuentas/logout', { method: 'POST' }); } catch (_) { /* da igual */ }
    location.reload();
}

// ---------- Acceso del administrador (usa el login de siempre) ----------
function entrarComoAdmin() {
    cerrarAcceso();
    if (typeof window.verSeccion === 'function') window.verSeccion('login');
}

// ---------- Después de crear la cuenta o cambiar la clave: volver al login ----------
// registro.js escribe el resultado en #cta-mensaje / #rec-mensaje; aquí se detecta el éxito.
function volverAlLoginTras(idMensaje, texto) {
    const el = $(idMensaje);
    if (!el) return;
    let pendiente = null;
    new MutationObserver(() => {
        if (el.classList.contains('ok') && !pendiente) {
            pendiente = setTimeout(() => {
                pendiente = null;
                mostrarPanelAcceso('login');
                if (ultimoUsuario && $('acc-usuario')) $('acc-usuario').value = ultimoUsuario;
                $('acc-clave')?.focus();
                mensaje(texto, 'ok');
            }, 1600);
        }
    }).observe(el, { attributes: true, attributeFilter: ['class'], childList: true });
}

// ---------- Revisar si ya hay una sesión abierta ----------
async function revisarSesion() {
    try {
        const res = await fetch('/api/cuentas/sesion');
        const data = await res.json();
        if (data.autenticado) {
            if (data.tipo === 'cuenta' && data.cuenta) mostrarChip(data.cuenta);
            cerrarAcceso();
            return;
        }
    } catch (err) {
        console.error('No se pudo verificar la sesión:', err);
    }
    abrirAcceso();
}

function iniciar() {
    $('form-acceso')?.addEventListener('submit', enviarLogin);

    ['cta-usuario', 'rec-usuario'].forEach((id) => {
        $(id)?.addEventListener('input', (e) => { ultimoUsuario = e.target.value.trim().toLowerCase(); });
    });
    // registro.js avisa con el usuario exacto que se creó / recuperó (incluye valores autocompletados)
    document.addEventListener('usuario-registrado', (e) => {
        if (e.detail && e.detail.usuario) ultimoUsuario = e.detail.usuario;
    });
    volverAlLoginTras('cta-mensaje', 'Cuenta creada. Ahora inicia sesión.');
    volverAlLoginTras('rec-mensaje', 'Contraseña actualizada. Ya puedes iniciar sesión.');

    revisarSesion();
}

// Para los onclick del HTML
window.mostrarPanelAcceso = mostrarPanelAcceso;
window.cerrarSesionCuenta = cerrarSesionCuenta;
window.entrarComoAdmin = entrarComoAdmin;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}