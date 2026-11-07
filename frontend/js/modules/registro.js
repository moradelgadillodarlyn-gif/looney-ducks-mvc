// js/modules/registro.js
// Registro de cuentas (entrenador, atleta, padre) y recuperación de contraseña.
import { filtrarNombre, filtrarTelefono } from './editor.js';

const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
const USUARIO_VALIDO = /^[A-Za-z][A-Za-z0-9._]{3,29}$/;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const $ = (id) => document.getElementById(id);

// 8 dígitos, sin números repetitivos (misma regla que el tutor)
function telefonoValido(telefono) {
    if (!/^\d{8}$/.test(telefono)) return false;
    if (/(\d)\1{3,}/.test(telefono)) return false;
    if (new Set(telefono.split('')).size <= 2) return false;
    return true;
}

function mostrarMensaje(id, texto, tipo) {
    const el = $(id);
    if (!el) return;
    el.textContent = texto;
    el.className = `cuenta-mensaje ${tipo || ''}`;
}

// Limpia lo que se escribe mientras se escribe, conservando el cursor
function aplicarFiltro(input, filtro) {
    if (!input) return;
    input.addEventListener('input', () => {
        const limpio = filtro(input.value);
        if (limpio !== input.value) {
            const pos = input.selectionStart;
            input.value = limpio;
            try { input.setSelectionRange(pos, pos); } catch (_) { /* sin cursor */ }
        }
    });
}

const filtrarUsuario = (v) => String(v).replace(/[^A-Za-z0-9._]/g, '').toLowerCase().slice(0, 30);

// Mensaje exacto de por qué un usuario no es válido (o null si está bien)
function errorUsuario(u) {
    if (!u) return 'Escribe un nombre de usuario.';
    if (u.length < 4) return 'El usuario debe tener al menos 4 caracteres.';
    if (!/^[A-Za-z]/.test(u)) return 'El usuario debe empezar con una letra (no con número, punto o guion bajo).';
    if (!USUARIO_VALIDO.test(u)) return 'El usuario solo puede tener letras, números, punto y guion bajo (máximo 30 caracteres).';
    return null;
}

// ==========================================
// REGISTRO DE CUENTA
// ==========================================
export function inicializarRegistroCuenta() {
    const form = $('form-cuenta');
    if (!form) return;

    const rol = $('cta-rol');
    const bloqueApellidos = $('cta-bloque-apellidos');
    const etiquetaNombre = $('cta-etiqueta-nombre');
    const nombre = $('cta-nombre');
    const paterno = $('cta-paterno');
    const materno = $('cta-materno');
    const usuario = $('cta-usuario');
    const celular = $('cta-celular');
    const correo = $('cta-correo');
    const clave = $('cta-clave');
    const confirmar = $('cta-confirmar');

    aplicarFiltro(nombre, filtrarNombre);
    aplicarFiltro(paterno, filtrarNombre);
    aplicarFiltro(materno, filtrarNombre);
    aplicarFiltro(celular, filtrarTelefono);

    // Usuario: se limpia al escribir y se AVISA cuando se quitan caracteres
    // (antes desaparecían sin explicación: espacios, tildes, guiones...)
    const ayudaUsuario = $('cta-usuario-ayuda');
    const textoAyuda = ayudaUsuario ? ayudaUsuario.textContent : '';
    let temporizadorAyuda = null;
    usuario.addEventListener('input', () => {
        const original = usuario.value;
        const huboQuitados = original.replace(/[^A-Za-z0-9._]/g, '').length !== original.length;
        const limpio = filtrarUsuario(original);
        if (limpio !== original) {
            const pos = usuario.selectionStart;
            usuario.value = limpio;
            try { usuario.setSelectionRange(pos, pos); } catch (_) { /* sin cursor */ }
        }
        if (ayudaUsuario && huboQuitados) {
            ayudaUsuario.textContent = 'Se quitaron caracteres no permitidos: solo letras, números, punto (.) y guion bajo (_).';
            ayudaUsuario.style.color = '#f59e0b';
            clearTimeout(temporizadorAyuda);
            temporizadorAyuda = setTimeout(() => {
                ayudaUsuario.textContent = textoAyuda;
                ayudaUsuario.style.color = '';
            }, 4000);
        }
    });

    // El atleta pide apellido paterno y materno; los demás, un solo nombre completo
    function actualizarCampos() {
        const esAtleta = rol.value === 'atleta';
        bloqueApellidos.style.display = esAtleta ? 'block' : 'none';
        paterno.required = esAtleta;
        materno.required = esAtleta;
        etiquetaNombre.textContent = esAtleta ? 'Nombre(s)' : 'Nombre completo';
        nombre.placeholder = esAtleta ? 'Ej. Juan Carlos' : 'Ej. Juan Carlos Pérez Rojas';
    }
    rol.addEventListener('change', actualizarCampos);
    actualizarCampos();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        mostrarMensaje('cta-mensaje', '', '');

        // Si el navegador autocompletó el usuario, no dispara "input": se limpia aquí también
        usuario.value = filtrarUsuario(usuario.value.trim());

        const esAtleta = rol.value === 'atleta';
        const datos = {
            rol: rol.value,
            nombre: nombre.value.trim(),
            usuario: usuario.value.trim(),
            celular: celular.value.trim(),
            correo: correo.value.trim().toLowerCase(),
            clave: clave.value,
            clave_confirmacion: confirmar.value
        };

        if (!datos.rol) return mostrarMensaje('cta-mensaje', 'Elige un rol.', 'error');
        if (datos.nombre.length < 2 || !SOLO_LETRAS.test(datos.nombre)) {
            return mostrarMensaje('cta-mensaje', 'El nombre solo puede contener letras y espacios.', 'error');
        }
        if (esAtleta) {
            datos.apellido_paterno = paterno.value.trim();
            datos.apellido_materno = materno.value.trim();
            if (!datos.apellido_paterno || !SOLO_LETRAS.test(datos.apellido_paterno)) {
                return mostrarMensaje('cta-mensaje', 'El apellido paterno es obligatorio y solo puede tener letras.', 'error');
            }
            if (!datos.apellido_materno || !SOLO_LETRAS.test(datos.apellido_materno)) {
                return mostrarMensaje('cta-mensaje', 'El apellido materno es obligatorio y solo puede tener letras.', 'error');
            }
        }
        const falloUsuario = errorUsuario(datos.usuario);
        if (falloUsuario) {
            return mostrarMensaje('cta-mensaje', falloUsuario, 'error');
        }
        if (!telefonoValido(datos.celular)) {
            return mostrarMensaje('cta-mensaje', 'El celular debe tener 8 dígitos y no puede ser un número repetitivo.', 'error');
        }
        if (!CORREO_VALIDO.test(datos.correo)) {
            return mostrarMensaje('cta-mensaje', 'El correo electrónico no es válido.', 'error');
        }
        if (datos.clave.length < 6) {
            return mostrarMensaje('cta-mensaje', 'La contraseña debe tener al menos 6 caracteres.', 'error');
        }
        if (datos.clave !== datos.clave_confirmacion) {
            return mostrarMensaje('cta-mensaje', 'Las contraseñas no coinciden.', 'error');
        }

        const btn = form.querySelector('button[type="submit"]');
        const textoOriginal = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Creando cuenta...';

        try {
            const res = await fetch('/api/cuentas/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                // Avisa a acceso.js qué usuario se creó (el autocompletado del navegador no dispara "input")
                document.dispatchEvent(new CustomEvent('usuario-registrado', { detail: { usuario: datos.usuario } }));
                mostrarMensaje('cta-mensaje', '✅ ¡Cuenta creada correctamente!', 'ok');
                form.reset();
                actualizarCampos();
            } else {
                mostrarMensaje('cta-mensaje', data.error || 'No se pudo crear la cuenta.', 'error');
            }
        } catch (err) {
            console.error('Error al crear la cuenta:', err);
            mostrarMensaje('cta-mensaje', 'Error de conexión con el servidor.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }
    });
}

// ==========================================
// RECUPERAR CONTRASEÑA (confirmando con celular o correo)
// ==========================================
export function inicializarRecuperacion() {
    const form = $('form-recuperar');
    if (!form) return;

    const usuario = $('rec-usuario');
    const contacto = $('rec-contacto');
    const clave = $('rec-clave');
    const confirmar = $('rec-confirmar');

    aplicarFiltro(usuario, filtrarUsuario);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        mostrarMensaje('rec-mensaje', '', '');

        const datos = {
            usuario: usuario.value.trim(),
            contacto: contacto.value.trim().toLowerCase(),
            claveNueva: clave.value,
            claveConfirmacion: confirmar.value
        };

        if (!datos.usuario || !datos.contacto) {
            return mostrarMensaje('rec-mensaje', 'Completa el usuario y el celular o correo.', 'error');
        }
        if (datos.contacto.includes('@')) {
            if (!CORREO_VALIDO.test(datos.contacto)) {
                return mostrarMensaje('rec-mensaje', 'El correo electrónico no es válido.', 'error');
            }
        } else if (!/^\d{8}$/.test(datos.contacto)) {
            return mostrarMensaje('rec-mensaje', 'Escribe tu celular (8 dígitos) o tu correo completo.', 'error');
        }
        if (datos.claveNueva.length < 6) {
            return mostrarMensaje('rec-mensaje', 'La nueva contraseña debe tener al menos 6 caracteres.', 'error');
        }
        if (datos.claveNueva !== datos.claveConfirmacion) {
            return mostrarMensaje('rec-mensaje', 'Las contraseñas no coinciden.', 'error');
        }

        const btn = form.querySelector('button[type="submit"]');
        const textoOriginal = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Verificando...';

        try {
            const res = await fetch('/api/cuentas/recuperar-clave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                document.dispatchEvent(new CustomEvent('usuario-registrado', { detail: { usuario: datos.usuario.toLowerCase() } }));
                mostrarMensaje('rec-mensaje', '✅ ' + (data.mensaje || 'Contraseña actualizada.'), 'ok');
                form.reset();
            } else {
                mostrarMensaje('rec-mensaje', data.error || 'No se pudo cambiar la contraseña.', 'error');
            }
        } catch (err) {
            console.error('Error al recuperar la contraseña:', err);
            mostrarMensaje('rec-mensaje', 'Error de conexión con el servidor.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }
    });
}