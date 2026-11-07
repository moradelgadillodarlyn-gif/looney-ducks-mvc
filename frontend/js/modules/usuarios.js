// js/modules/usuarios.js
// Panel de administración: usuarios del sistema y cuentas registradas (entrenador / atleta / padre)
import { abrirEditor, filtrarNombre, filtrarTelefono } from './editor.js';

// Evita que un texto con < > " ' se interprete como HTML
function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

const ROLES_CUENTA = ['entrenador', 'atleta', 'padre'];

let usuariosCache = [];
let cuentasCache = [];
let rolesUsuarios = [];

const filtrarUsuarioSistema = (v) => String(v).replace(/[^A-Za-z0-9._-]/g, '').slice(0, 30);
const filtrarUsuarioCuenta = (v) => String(v).replace(/[^A-Za-z0-9._]/g, '').toLowerCase().slice(0, 30);
const filtrarCarnet = (v) => String(v).replace(/[^A-Za-z0-9-]/g, '').slice(0, 20);

// Envía una petición con JSON y devuelve la respuesta ya leída
async function enviarJSON(url, metodo, cuerpo) {
    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}

function nombreCompleto(u) {
    return [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(' ');
}

// ==========================================
// USUARIOS DEL SISTEMA
// ==========================================
export async function cargarUsuarios() {
    const tbody = document.getElementById('tabla-usuarios');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">Cargando usuarios...</td></tr>';

    try {
        const [resUsuarios, resRoles] = await Promise.all([
            fetch('/api/usuarios'),
            fetch('/api/usuarios/roles')
        ]);
        if (!resUsuarios.ok) throw new Error('Sin permiso o error del servidor.');

        usuariosCache = await resUsuarios.json();
        rolesUsuarios = resRoles.ok ? await resRoles.json() : [];

        if (usuariosCache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">No hay usuarios registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = usuariosCache.map(u => `
            <tr>
                <td style="text-align:left;"><b>${escapar(nombreCompleto(u))}</b></td>
                <td>${escapar(u.usuario)}</td>
                <td>${escapar(u.rol || '-')}</td>
                <td>${escapar(u.celular || '-')}</td>
                <td>
                    <button type="button" class="btn-tabla azul" onclick="window.editarUsuario(${Number(u.id)})">EDITAR</button>
                    <button type="button" class="btn-tabla rojo" onclick="window.eliminarUsuario(${Number(u.id)})">ELIMINAR</button>
                </td>
            </tr>`).join('');
    } catch (err) {
        console.error('Error al cargar usuarios:', err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ef4444; padding:20px;">No se pudieron cargar los usuarios.</td></tr>';
    }
}

function camposUsuario(u, esNuevo) {
    return [
        { id: 'usuario', etiqueta: 'Usuario', tipo: 'text', valor: u.usuario || '', requerido: true, maxlength: 30, filtro: filtrarUsuarioSistema },
        { id: 'nombre', etiqueta: 'Nombre', tipo: 'text', valor: u.nombre || '', requerido: true, maxlength: 50, filtro: filtrarNombre },
        { id: 'apellido_paterno', etiqueta: 'Apellido paterno', tipo: 'text', valor: u.apellido_paterno || '', maxlength: 50, filtro: filtrarNombre },
        { id: 'apellido_materno', etiqueta: 'Apellido materno', tipo: 'text', valor: u.apellido_materno || '', maxlength: 50, filtro: filtrarNombre },
        { id: 'ci', etiqueta: 'Carnet de identidad', tipo: 'text', valor: u.ci || '', maxlength: 20, filtro: filtrarCarnet },
        { id: 'celular', etiqueta: 'Celular (8 dígitos)', tipo: 'tel', valor: u.celular || '', maxlength: 8, filtro: filtrarTelefono },
        { id: 'rol', etiqueta: 'Rol', tipo: 'select', valor: u.rol || '', requerido: true, opciones: rolesUsuarios },
        {
            id: 'clave',
            etiqueta: esNuevo ? 'Contraseña (mín. 6 caracteres)' : 'Nueva contraseña (déjala vacía para no cambiarla)',
            tipo: 'password',
            valor: '',
            requerido: esNuevo,
            maxlength: 100
        }
    ];
}

export function nuevoUsuario() {
    abrirEditor({
        titulo: '➕ Nuevo usuario del sistema',
        textoGuardar: 'Crear usuario',
        campos: camposUsuario({}, true),
        onGuardar: async (v) => {
            const { ok, data } = await enviarJSON('/api/usuarios', 'POST', v);
            if (!ok) throw new Error(data.error || 'No se pudo crear el usuario.');
            await cargarUsuarios();
        }
    });
}

export function editarUsuario(id) {
    const u = usuariosCache.find(x => Number(x.id) === Number(id));
    if (!u) return alert('No se encontró el usuario. Recarga el panel e inténtalo de nuevo.');

    abrirEditor({
        titulo: '✏️ Editar usuario',
        campos: camposUsuario(u, false),
        onGuardar: async (v) => {
            const { ok, data } = await enviarJSON(`/api/usuarios/${Number(id)}`, 'PUT', v);
            if (!ok) throw new Error(data.error || 'No se pudo actualizar el usuario.');
            await cargarUsuarios();
        }
    });
}

export async function eliminarUsuario(id) {
    const u = usuariosCache.find(x => Number(x.id) === Number(id));
    if (!confirm(`¿Eliminar al usuario "${u ? u.usuario : id}"?`)) return;

    const { ok, data } = await enviarJSON(`/api/usuarios/${Number(id)}`, 'DELETE');
    if (!ok) return alert(data.error || 'No se pudo eliminar el usuario.');
    cargarUsuarios();
}

// ==========================================
// CUENTAS REGISTRADAS (entrenadores, atletas y padres)
// ==========================================
export async function cargarCuentas() {
    const tbody = document.getElementById('tabla-cuentas');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">Cargando cuentas...</td></tr>';

    try {
        const res = await fetch('/api/cuentas');
        if (!res.ok) throw new Error('Sin permiso o error del servidor.');
        cuentasCache = await res.json();

        if (cuentasCache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">Todavía no hay cuentas registradas.</td></tr>';
            return;
        }

        tbody.innerHTML = cuentasCache.map(c => `
            <tr>
                <td style="text-align:left;"><b>${escapar(nombreCompleto(c))}</b></td>
                <td>${escapar(c.rol)}</td>
                <td>${escapar(c.usuario)}</td>
                <td>${escapar(c.celular)}</td>
                <td>${escapar(c.correo)}</td>
                <td>
                    <button type="button" class="btn-tabla azul" onclick="window.editarCuenta(${Number(c.id)})">EDITAR</button>
                    <button type="button" class="btn-tabla rojo" onclick="window.eliminarCuenta(${Number(c.id)})">ELIMINAR</button>
                </td>
            </tr>`).join('');
    } catch (err) {
        console.error('Error al cargar cuentas:', err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#ef4444; padding:20px;">No se pudieron cargar las cuentas.</td></tr>';
    }
}

export function editarCuenta(id) {
    const c = cuentasCache.find(x => Number(x.id) === Number(id));
    if (!c) return alert('No se encontró la cuenta. Recarga el panel e inténtalo de nuevo.');

    abrirEditor({
        titulo: '✏️ Editar cuenta',
        campos: [
            { id: 'rol', etiqueta: 'Rol', tipo: 'select', valor: c.rol, requerido: true, opciones: ROLES_CUENTA },
            { id: 'nombre', etiqueta: 'Nombre (completo, o nombre(s) si es atleta)', tipo: 'text', valor: c.nombre || '', requerido: true, maxlength: 100, filtro: filtrarNombre },
            { id: 'apellido_paterno', etiqueta: 'Apellido paterno', tipo: 'text', valor: c.apellido_paterno || '', requerido: true, maxlength: 50, filtro: filtrarNombre, mostrarSi: (v) => v.rol === 'atleta' },
            { id: 'apellido_materno', etiqueta: 'Apellido materno', tipo: 'text', valor: c.apellido_materno || '', requerido: true, maxlength: 50, filtro: filtrarNombre, mostrarSi: (v) => v.rol === 'atleta' },
            { id: 'usuario', etiqueta: 'Usuario', tipo: 'text', valor: c.usuario || '', requerido: true, maxlength: 30, filtro: filtrarUsuarioCuenta },
            { id: 'celular', etiqueta: 'Celular (8 dígitos)', tipo: 'tel', valor: c.celular || '', requerido: true, maxlength: 8, filtro: filtrarTelefono },
            { id: 'correo', etiqueta: 'Correo electrónico', tipo: 'email', valor: c.correo || '', requerido: true, maxlength: 120 },
            { id: 'clave', etiqueta: 'Nueva contraseña (déjala vacía para no cambiarla)', tipo: 'password', valor: '', maxlength: 100 }
        ],
        onGuardar: async (v) => {
            const { ok, data } = await enviarJSON(`/api/cuentas/${Number(id)}`, 'PUT', v);
            if (!ok) throw new Error(data.error || 'No se pudo actualizar la cuenta.');
            await cargarCuentas();
        }
    });
}

export async function eliminarCuenta(id) {
    const c = cuentasCache.find(x => Number(x.id) === Number(id));
    if (!confirm(`¿Eliminar la cuenta de "${c ? nombreCompleto(c) : id}"?`)) return;

    const { ok, data } = await enviarJSON(`/api/cuentas/${Number(id)}`, 'DELETE');
    if (!ok) return alert(data.error || 'No se pudo eliminar la cuenta.');
    cargarCuentas();
}

// Carga las dos tablas del panel
export function cargarPanelUsuarios() {
    cargarUsuarios();
    cargarCuentas();
}

// Para los botones con onclick dentro del HTML
window.nuevoUsuario = nuevoUsuario;
window.editarUsuario = editarUsuario;
window.eliminarUsuario = eliminarUsuario;
window.editarCuenta = editarCuenta;
window.eliminarCuenta = eliminarCuenta;
window.cargarPanelUsuarios = cargarPanelUsuarios;