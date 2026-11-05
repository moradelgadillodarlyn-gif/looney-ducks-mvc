// js/modules/jugadores.js

// Nadie nacido después de este año puede inscribirse (2026 en adelante queda bloqueado)
const ANIO_MAX_NACIMIENTO = 2025;

// Evita que un texto con < > " ' se interprete como HTML
function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Posiciones que pertenecen a futsal (el resto se considera balonmano)
const POSICIONES_FUTSAL = ['guardameta', 'cierre', 'ala izquierdo', 'ala derecho', 'pívot'];

export function calcularEdadYCategoria(fechaNacimientoStr) {
    if (!fechaNacimientoStr) return { edad: '-', categoria: 'Sin Fecha' };
    const anioNacimiento = parseInt(fechaNacimientoStr.toString().split(/[-/]/)[0]);
    if (isNaN(anioNacimiento) || anioNacimiento < 1900) return { edad: '-', categoria: 'Inválida' };

    const edad = new Date().getFullYear() - anioNacimiento;
    let categoria = 'Mayores (Senior)';
    if (edad <= 7) categoria = 'Sub-7 (Iniciación)';
    else if (edad <= 10) categoria = 'Sub-10 (Pre-Infantil)';
    else if (edad <= 13) categoria = 'Sub-13 (Infantil)';
    else if (edad <= 16) categoria = 'Sub-16 (Cadetes)';
    else if (edad <= 19) categoria = 'Sub-19 (Juvenil)';

    return { edad, categoria };
}

export function actualizarPosiciones() {
    const disciplinaSelect = document.getElementById("reg-disciplina");
    const posicionSelect = document.getElementById("reg-posicion");
    if (!disciplinaSelect || !posicionSelect) return;

    const disciplina = disciplinaSelect.value;
    posicionSelect.innerHTML = '<option value="">Selecciona la posición</option>';
    if (!disciplina) { posicionSelect.disabled = true; return; }

    posicionSelect.disabled = false;
    const posiciones = {
        "Handball": ["Portero/a", "Central", "Lateral Izquierdo", "Lateral Derecho", "Extremo Izquierdo", "Extremo Derecho", "Pivote"],
        "Futsal": ["Guardameta", "Cierre", "Ala Izquierdo", "Ala Derecho", "Pívot"]
    };

    (posiciones[disciplina] || []).forEach(pos => {
        const opt = document.createElement("option");
        opt.value = pos;
        opt.textContent = pos;
        posicionSelect.appendChild(opt);
    });
}

export function inicializarValidacionTutor() {
    const tutorNombre = document.getElementById('reg-tutor-nombre');
    const tutorTelefono = document.getElementById('reg-tutor-telefono');

    if (tutorNombre) {
        tutorNombre.addEventListener('input', (e) => {
            let cursorPosition = e.target.selectionStart;
            let valor = e.target.value;
            // Solo letras (con acentos/ñ) y espacios; sin números ni símbolos
            valor = valor.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '');
            // Capitaliza cada palabra correctamente (Primera mayúscula, resto minúscula)
            valor = valor.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
            e.target.value = valor;
            e.target.setSelectionRange(cursorPosition, cursorPosition);
        });
    }

    if (tutorTelefono) {
        tutorTelefono.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/\D/g, '').slice(0, 8);
            e.target.value = valor;
        });
    }
}

export function esTelefonoTutorValido(telefono) {
    if (!/^\d{8}$/.test(telefono)) return false;
    if (/(\d)\1{3,}/.test(telefono)) return false; 
    const distintos = new Set(telefono.split('')).size;
    if (distintos <= 2) return false; 
    return true;
}

export function verificarEdad() {
    const diaSelect = document.getElementById('reg-dia');
    const mesSelect = document.getElementById('reg-mes');
    const anioSelect = document.getElementById('reg-anio');
    const bloqueTutor = document.getElementById('bloque-tutor');
    const tutorNombre = document.getElementById('reg-tutor-nombre');
    const tutorTelefono = document.getElementById('reg-tutor-telefono');

    if (!diaSelect || !mesSelect || !anioSelect || !bloqueTutor) return null;

    const dia = parseInt(diaSelect.value);
    const mes = parseInt(mesSelect.value);
    const anio = parseInt(anioSelect.value);

    if (!dia || !mes || !anio) {
        bloqueTutor.style.display = 'none';
        if (tutorNombre) tutorNombre.required = false;
        if (tutorTelefono) tutorTelefono.required = false;
        return null;
    }

    const fechaNacimiento = new Date(anio, mes - 1, dia);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const aunNoCumple = (hoy.getMonth() < fechaNacimiento.getMonth()) ||
        (hoy.getMonth() === fechaNacimiento.getMonth() && hoy.getDate() < fechaNacimiento.getDate());
    if (aunNoCumple) edad--;

    const esMenorDeEdad = edad < 18;
    bloqueTutor.style.display = esMenorDeEdad ? 'block' : 'none';
    if (tutorNombre) tutorNombre.required = esMenorDeEdad;
    if (tutorTelefono) tutorTelefono.required = esMenorDeEdad;

    return { edad, esMenorDeEdad };
}

export async function guardarInscripcion(event) {
    event.preventDefault();

    const nombre = document.getElementById('reg-nombre')?.value.trim();
    const disciplina = document.getElementById('reg-disciplina')?.value;
    const posicion = document.getElementById('reg-posicion')?.value;
    const dia = document.getElementById('reg-dia')?.value;
    const mes = document.getElementById('reg-mes')?.value;
    const anio = document.getElementById('reg-anio')?.value;
    const genero = document.getElementById('reg-genero')?.value;

    if (!nombre || !disciplina || !posicion || !dia || !mes || !anio || !genero) {
        alert('Por favor completa todos los campos obligatorios.');
        return;
    }

    if (parseInt(anio) > ANIO_MAX_NACIMIENTO) {
        alert(`No se pueden inscribir atletas nacidos en ${ANIO_MAX_NACIMIENTO + 1} o después.`);
        return;
    }

    // Verifica que la fecha exista realmente (ej. 31 de febrero no es válida)
    const fechaComprobada = new Date(Number(anio), Number(mes) - 1, Number(dia));
    if (fechaComprobada.getFullYear() !== Number(anio) ||
        fechaComprobada.getMonth() !== Number(mes) - 1 ||
        fechaComprobada.getDate() !== Number(dia)) {
        alert('La fecha de nacimiento no es válida. Revisa el día y el mes.');
        return;
    }

    const resultadoEdad = verificarEdad();
    const datos = {
        nombre,
        disciplina,
        posicion,
        fecha_nacimiento: `${anio}-${mes}-${dia}`,
        rama: genero
    };

    if (resultadoEdad && resultadoEdad.esMenorDeEdad) {
        const tutorNombre = document.getElementById('reg-tutor-nombre')?.value.trim();
        const tutorTelefono = document.getElementById('reg-tutor-telefono')?.value.trim();

        if (!tutorNombre || !tutorTelefono) {
            alert('El atleta es menor de edad: los datos del padre/madre/tutor son obligatorios.');
            return;
        }
        if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(tutorNombre)) {
            alert('El nombre del tutor solo puede contener letras.');
            return;
        }
        if (!esTelefonoTutorValido(tutorTelefono)) {
            alert('El teléfono del tutor debe tener 8 dígitos y no puede ser un número repetitivo (ej. 11111111).');
            return;
        }

        datos.tutor_nombre = tutorNombre;
        datos.tutor_telefono = tutorTelefono;
    }

    const formulario = document.getElementById('form-inscripcion');
    const btnSubmit = formulario?.querySelector('button[type="submit"]');
    const textoOriginalBtn = btnSubmit?.textContent;
    if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Enviando...'; }

    try {
        const res = await fetch('/api/jugadores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            alert('✅ ¡Inscripción enviada correctamente! Nos pondremos en contacto pronto.');
            formulario.reset();
            const bloqueTutor = document.getElementById('bloque-tutor');
            if (bloqueTutor) bloqueTutor.style.display = 'none';
            const posicionSelect = document.getElementById('reg-posicion');
            if (posicionSelect) {
                posicionSelect.innerHTML = '<option value="">Primero elige una disciplina</option>';
                posicionSelect.disabled = true;
            }
        } else {
            const data = await res.json().catch(() => ({}));
            alert(data.error || 'Ocurrió un error al enviar la inscripción.');
        }
    } catch (err) {
        console.error('Error al guardar inscripción:', err);
        alert('Error de conexión con el servidor.');
    } finally {
        if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = textoOriginalBtn; }
    }
}

export async function cargarJugadores() {
    try {
        const res = await fetch('/api/jugadores');
        if (!res.ok) return;
        const lista = await res.json();

        const tbodyBalonmano = document.getElementById('tabla-balonmano');
        const tbodyFutsal = document.getElementById('tabla-futsal');
        if (!tbodyBalonmano || !tbodyFutsal) return;

        tbodyBalonmano.innerHTML = '';
        tbodyFutsal.innerHTML = '';

        lista.forEach(j => {
            const nombreAtleta = escapar(j.nombre || j.nombre_completo || 'Sin Nombre');
            const { edad, categoria } = calcularEdadYCategoria(j.fecha_nacimiento || j.fechaNacimiento);

            // Misma regla que usa el PDF del plantel
            const posicionAtleta = String(j.posicion || '').toLowerCase().trim();
            const esFutsal = String(j.disciplina || '').toLowerCase() === 'futsal'
                || POSICIONES_FUTSAL.includes(posicionAtleta)
                || posicionAtleta.includes('futsal');

            const fila = `<tr>
                <td style="text-align:left;"><b>${nombreAtleta}</b><br><small style="color:#94a3b8;">${escapar(j.posicion)}</small></td>
                <td>${escapar(j.rama || '-')}</td>
                <td><b style="color:#ff6b00;">${categoria}</b><br><small>(${edad} años)</small></td>
                <td style="text-align:center;">
                    <span onclick="window.alternarDestacado(${Number(j.id)})" style="cursor:pointer; font-size: 16px;">
                        ${j.destacado ? '⭐' : '☆'}
                    </span>
                </td>
                <td>
                    <button onclick="window.eliminarJugador(${Number(j.id)})" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">
                        ELIMINAR
                    </button>
                </td>
            </tr>`;

            if (esFutsal) tbodyFutsal.innerHTML += fila;
            else tbodyBalonmano.innerHTML += fila;
        });
    } catch (err) {
        console.error('Error al cargar jugadores:', err);
    }
}

export async function eliminarJugador(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este atleta?')) return;
    try {
        const res = await fetch(`/api/jugadores/${id}`, { method: 'DELETE' });
        if (res.ok) {
            cargarJugadores();
        } else {
            alert('Error al eliminar el atleta.');
        }
    } catch (err) {
        console.error('Error al eliminar jugador:', err);
    }
}

export async function alternarDestacado(id) {
    try {
        const res = await fetch(`/api/jugadores/${id}/destacado`, { method: 'PATCH' });
        if (res.ok) {
            cargarJugadores();
        }
    } catch (err) {
        console.error('Error al cambiar estado destacado:', err);
    }
}

export function poblarFechas() {
    const diaSelect = document.getElementById('reg-dia') || document.querySelector('select[name="dia"]');
    const mesSelect = document.getElementById('reg-mes') || document.querySelector('select[name="mes"]');
    const anioSelect = document.getElementById('reg-anio') || document.querySelector('select[name="anio"]');

    if (diaSelect && diaSelect.options.length <= 1) {
        diaSelect.innerHTML = '<option value="">Día</option>';
        for (let i = 1; i <= 31; i++) {
            const opt = document.createElement('option');
            opt.value = i < 10 ? `0${i}` : i;
            opt.textContent = i;
            diaSelect.appendChild(opt);
        }
    }

    if (mesSelect && mesSelect.options.length <= 1) {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        mesSelect.innerHTML = '<option value="">Mes</option>';
        meses.forEach((m, idx) => {
            const opt = document.createElement('option');
            const val = idx + 1;
            opt.value = val < 10 ? `0${val}` : val;
            opt.textContent = m;
            mesSelect.appendChild(opt);
        });
    }

    if (anioSelect && anioSelect.options.length <= 1) {
        anioSelect.innerHTML = '<option value="">Año de nacimiento</option>';
        for (let i = ANIO_MAX_NACIMIENTO; i >= 1950; i--) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            anioSelect.appendChild(opt);
        }
    }
}

export function formatearNombreInput(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
        let cursorPosition = e.target.selectionStart;
        let valor = e.target.value;
        
        // 1. Bloquear y eliminar cualquier número o símbolo extraño en tiempo real
        valor = valor.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '');
        
        // 2. Formatear cada palabra: Primera letra en Mayúscula y el resto en minúscula
        valor = valor.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());

        e.target.value = valor;
        e.target.setSelectionRange(cursorPosition, cursorPosition);
    });
}