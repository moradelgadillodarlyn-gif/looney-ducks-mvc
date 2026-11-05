// js/modules/inicio.js
const $ = (id) => document.getElementById(id);

// Métricas: número entero (máx. 7 dígitos) con un "+" opcional al inicio o al final (+150, 15+, 8)
const METRICA_VALIDA = /^(\+\d{1,7}|\d{1,7}\+|\d{1,7})$/;
const CAMPOS_METRICAS = ['ed-atletas', 'ed-titulos', 'ed-disciplinas', 'ed-anios'];

function limpiarMetrica(valor) {
    const texto = String(valor ?? '');
    const todos = texto.replace(/\D/g, '');
    const digitos = todos.slice(0, 7);
    const posMas = texto.indexOf('+');

    if (posMas === -1) return digitos;

    const antes = texto.slice(0, posMas).replace(/\D/g, '').length;
    if (antes === 0) return '+' + digitos;                // +150
    if (antes >= todos.length) return digitos + '+';      // 15+
    return digitos;                                        // "+" en medio: se quita
}

// Quita letras, puntos, comas y espacios mientras se escribe o se pega
function activarCamposMetricas() {
    CAMPOS_METRICAS.forEach(id => {
        const campo = $(id);
        if (!campo) return;

        campo.setAttribute('inputmode', 'tel');   // teclado numérico con "+" en el celular
        campo.setAttribute('autocomplete', 'off');

        campo.addEventListener('input', () => {
            const limpio = limpiarMetrica(campo.value);
            if (limpio !== campo.value) {
                const pos = Math.max(0, (campo.selectionStart ?? 0) - (campo.value.length - limpio.length));
                campo.value = limpio;
                campo.setSelectionRange(pos, pos);
            }
        });
    });
}

async function cargarInicio() {
    try {
        const [stats, enc] = await Promise.all([
            fetch('/api/inicio/estadisticas').then(r => r.json()),
            fetch('/api/inicio/encuentro').then(r => r.json())
        ]);

        if (stats && !stats.error) {
            $('stat-atletas').textContent = stats.atletas;
            $('stat-titulos').textContent = stats.titulos;
            $('stat-disciplinas').textContent = stats.disciplinas;
            $('stat-anios').textContent = stats.anios;
            window._statsActuales = stats;
        }
        if (enc && !enc.error) {
            $('match-estado').textContent = enc.estado;
            $('match-local').textContent = enc.equipo_local;
            $('match-rival').textContent = enc.equipo_rival;
            $('match-info').textContent = `📍 ${enc.lugar} | 📅 ${enc.fecha_hora}`;
            window._encuentroActual = enc;
        }
    } catch (err) {
        console.error('Error al cargar datos de inicio:', err);
    }
}

async function guardar(url, datos, modalId) {
    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const data = await res.json();
        if (!res.ok) {
            alert('❌ ' + (data.error || 'No se pudo guardar.'));
            return;
        }
        window.cerrarModal(modalId);
        cargarInicio();
    } catch (err) {
        alert('Error de conexión con el servidor.');
    }
}

export function inicializarInicio() {
    window.cerrarModal = (id) => { $(id).style.display = 'none'; };

    activarCamposMetricas();

    window.abrirEditorStats = () => {
        const s = window._statsActuales || {};
        $('ed-atletas').value = limpiarMetrica(s.atletas);
        $('ed-titulos').value = limpiarMetrica(s.titulos);
        $('ed-disciplinas').value = limpiarMetrica(s.disciplinas);
        $('ed-anios').value = limpiarMetrica(s.anios);
        $('modal-stats').style.display = 'flex';
    };

    window.abrirEditorEncuentro = () => {
        const e = window._encuentroActual || {};
        $('ed-local').value = e.equipo_local || '';
        $('ed-rival').value = e.equipo_rival || '';
        $('ed-lugar').value = e.lugar || '';
        $('ed-fecha').value = e.fecha_hora || '';
        $('ed-estado').value = e.estado || '';
        $('modal-encuentro').style.display = 'flex';
    };

    $('form-stats')?.addEventListener('submit', (e) => {
        e.preventDefault();

        const datos = {
            atletas: $('ed-atletas').value.trim(),
            titulos: $('ed-titulos').value.trim(),
            disciplinas: $('ed-disciplinas').value.trim(),
            anios: $('ed-anios').value.trim()
        };

        if (!Object.values(datos).every(v => METRICA_VALIDA.test(v))) {
            alert('Cada métrica debe ser un número entero, con un "+" opcional al inicio o al final (ej. +150, 15+, 8). Sin letras ni decimales.');
            return;
        }

        guardar('/api/inicio/estadisticas', datos, 'modal-stats');
    });

    $('form-encuentro')?.addEventListener('submit', (e) => {
        e.preventDefault();
        guardar('/api/inicio/encuentro', {
            equipo_local: $('ed-local').value,
            equipo_rival: $('ed-rival').value,
            lugar: $('ed-lugar').value,
            fecha_hora: $('ed-fecha').value,
            estado: $('ed-estado').value
        }, 'modal-encuentro');
    });

    cargarInicio();
}