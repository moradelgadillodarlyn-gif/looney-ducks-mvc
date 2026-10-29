// js/modules/admin.js
export let esAdmin = false;
let intentosFallidos = 0;
const tiempoBloqueoSegundos = 60;

// Helper para compatibilidad con llamadas de función esAdmin()
export function esAdminFn() {
    return esAdmin;
}

export function setEsAdmin(valor) {
    esAdmin = valor;
}

export function actualizarVistaSegunRol() {
    const elementosAdmin = document.querySelectorAll('.only-admin');
    elementosAdmin.forEach(el => {
        el.style.display = esAdmin ? 'block' : 'none';
    });
}

export async function revisarSesionActiva(callbackPanel) {
    try {
        const res = await fetch('/api/sesion');
        const data = await res.json();
        esAdmin = !!data.activa;
        actualizarVistaSegunRol();
        if (data.activa && typeof callbackPanel === 'function') callbackPanel();
    } catch (err) {
        console.error('Error al verificar sesión:', err);
    }
}

export function inicializarLogin(alLoginExitoso) {
    const formAdminLogin = document.getElementById('form-admin-login');
    if (!formAdminLogin) return;

    formAdminLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputUser = document.getElementById('log-user');
        const inputPass = document.getElementById('log-pass');
        const errorEl = document.getElementById('error-log');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: inputUser.value, clave: inputPass.value })
            });
            const data = await res.json();

            if (res.ok && (data.exito || data.success)) {
                intentosFallidos = 0;
                esAdmin = true;
                actualizarVistaSegunRol();
                formAdminLogin.reset();
                if (typeof alLoginExitoso === 'function') alLoginExitoso();
            } else {
                intentosFallidos++;
                if (intentosFallidos >= 3) {
                    bloquearLogin();
                } else if (errorEl) {
                    errorEl.textContent = `❌ Incorrecto. Intentos restantes: ${3 - intentosFallidos}`;
                }
            }
        } catch (err) {
            if (errorEl) errorEl.textContent = 'Error de conexión.';
        }
    });
}

function bloquearLogin() {
    const btnSubmit = document.querySelector('#form-admin-login button[type="submit"]');
    if (btnSubmit) btnSubmit.disabled = true;
    let tiempo = tiempoBloqueoSegundos;

    const timer = setInterval(() => {
        tiempo--;
        const errorEl = document.getElementById('error-log');
        if (errorEl) errorEl.textContent = `🚫 Bloqueado por ${tiempo}s`;

        if (tiempo <= 0) {
            clearInterval(timer);
            intentosFallidos = 0;
            if (btnSubmit) btnSubmit.disabled = false;
            if (errorEl) errorEl.textContent = '✅ Puedes intentar de nuevo.';
        }
    }, 1000);
}

export async function cerrarSesionAdmin() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
        console.error('Error al cerrar sesión:', err);
    } finally {
        esAdmin = false;
        actualizarVistaSegunRol();
        if (typeof window.verSeccion === 'function') {
            window.verSeccion('inicio');
        }
    }
}

export function inicializarCambioClave() {
    const form = document.getElementById('form-cambiar-clave');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const claveActual = document.getElementById('cc-actual')?.value;
        const claveNueva = document.getElementById('cc-nueva')?.value;
        const claveConfirmar = document.getElementById('cc-confirmar')?.value;
        const mensajeEl = document.getElementById('mensaje-cambiar-clave');

        if (!claveActual || !claveNueva || !claveConfirmar) {
            if (mensajeEl) { mensajeEl.style.color = 'var(--danger, #ef4444)'; mensajeEl.textContent = 'Completa todos los campos.'; }
            return;
        }
        if (claveNueva.length < 6) {
            if (mensajeEl) { mensajeEl.style.color = 'var(--danger, #ef4444)'; mensajeEl.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.'; }
            return;
        }
        if (claveNueva !== claveConfirmar) {
            if (mensajeEl) { mensajeEl.style.color = 'var(--danger, #ef4444)'; mensajeEl.textContent = 'La confirmación no coincide con la nueva contraseña.'; }
            return;
        }

        try {
            const res = await fetch('/api/cambiar-clave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ claveActual, claveNueva })
            });
            const data = await res.json();

            if (res.ok && data.exito) {
                if (mensajeEl) { mensajeEl.style.color = 'var(--success, #10b981)'; mensajeEl.textContent = '✅ ' + (data.mensaje || 'Contraseña actualizada.'); }
                form.reset();
            } else {
                if (mensajeEl) { mensajeEl.style.color = 'var(--danger, #ef4444)'; mensajeEl.textContent = '❌ ' + (data.mensaje || 'No se pudo actualizar la contraseña.'); }
            }
        } catch (err) {
            console.error('Error al cambiar la clave:', err);
            if (mensajeEl) { mensajeEl.style.color = 'var(--danger, #ef4444)'; mensajeEl.textContent = 'Error de conexión con el servidor.'; }
        }
    });
}

export function alternarOjito(inputId, btn) {
    const el = document.getElementById(inputId);
    if (!el) return;
    if (el.type === 'password') {
        el.type = 'text';
        if (btn) btn.textContent = '🙈';
    } else {
        el.type = 'password';
        if (btn) btn.textContent = '👁️';
    }
}