// ==========================================
// JS/MODULES/PAGOS.JS - GESTIÓN DE CAJA Y CUOTAS
// ==========================================

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const COSTO_POR_MES = 80;
const ANIO_INICIAL_CAJA = 2024;

// Posiciones de futsal (misma regla que el panel de planteles y el PDF).
// Solo se usan si el atleta no tiene disciplina guardada.
const POSICIONES_FUTSAL = ['guardameta', 'cierre', 'ala izquierdo', 'ala derecho', 'pívot'];

function esDeFutsal(j) {
    if (j.disciplina) return String(j.disciplina).toLowerCase() === 'futsal';
    const pos = String(j.posicion || '').toLowerCase().trim();
    return POSICIONES_FUTSAL.includes(pos) || pos.includes('futsal');
}

// Evita que un texto con < > " ' se interprete como HTML
function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

let pestanaCajaActual = 'balonmano';
let aniosPoblados = false;

// Llena el selector de gestión: desde 2024 hasta el año que viene
// (así un pago de noviembre a enero se puede ver)
function poblarAniosGestion() {
    const select = document.getElementById('filtro-gestion-anio');
    if (!select || aniosPoblados) return;

    const actual = new Date().getFullYear();
    const seleccionado = Number(select.value) || actual;

    let opciones = '';
    for (let a = actual + 1; a >= ANIO_INICIAL_CAJA; a--) {
        const etiqueta = a === actual ? `${a} (Gestión Actual)`
                       : a === actual + 1 ? `${a} (Próxima gestión)`
                       : String(a);
        opciones += `<option value="${a}">${etiqueta}</option>`;
    }
    select.innerHTML = opciones;
    select.value = (seleccionado >= ANIO_INICIAL_CAJA && seleccionado <= actual + 1) ? String(seleccionado) : String(actual);
    aniosPoblados = true;
}

/**
 * Cambia la pestaña visual de caja entre Balonmano y Futsal y carga su respectiva matriz
 */
window.cambiarPestanaCaja = function(disciplina) {
    pestanaCajaActual = disciplina === 'futsal' ? 'futsal' : 'balonmano';

    const secBalonmano = document.getElementById('seccion-caja-balonmano');
    const secFutsal = document.getElementById('seccion-caja-futsal');
    const btnBalonmano = document.getElementById('btn-caja-balonmano');
    const btnFutsal = document.getElementById('btn-caja-futsal');

    if (pestanaCajaActual === 'balonmano') {
        if (secBalonmano) secBalonmano.style.display = 'block';
        if (secFutsal) secFutsal.style.display = 'none';
        if (btnBalonmano) btnBalonmano.style.background = '#ff6b00';
        if (btnFutsal) btnFutsal.style.background = '#334155';
        cargarMatrizPorDisciplina('balonmano', 'cuerpo-matriz-balonmano');
    } else {
        if (secBalonmano) secBalonmano.style.display = 'none';
        if (secFutsal) secFutsal.style.display = 'block';
        if (btnBalonmano) btnBalonmano.style.background = '#334155';
        if (btnFutsal) btnFutsal.style.background = '#00d2ff';
        cargarMatrizPorDisciplina('futsal', 'cuerpo-matriz-futsal');
    }
};

/**
 * Poblar el desplegable (<select>) de atletas del formulario de cobro.
 * Si ya se tiene la lista, se pasa para no pedirla de nuevo al servidor.
 */
export async function cargarAtletasEnSelect(listaAtletas) {
    const selectAtleta = document.getElementById('pop-jugador') 
                        || document.getElementById('atletaSelect')
                        || document.querySelector('select[name="jugador_id"]');

    if (!selectAtleta) return;

    try {
        let atletas = listaAtletas;
        if (!atletas) {
            const res = await fetch('/api/jugadores');
            if (!res.ok) throw new Error('Error al obtener atletas');
            atletas = await res.json();
        }

        selectAtleta.innerHTML = '<option value="" disabled selected>Seleccionar atleta...</option>';

        atletas.forEach(atleta => {
            const option = document.createElement('option');
            option.value = atleta.id;
            option.textContent = atleta.nombre_completo || `${atleta.nombre || ''} ${atleta.apellido || ''}`.trim();
            selectAtleta.appendChild(option);
        });
    } catch (err) {
        console.error('Error al cargar la lista de atletas en el select:', err);
    }
}

/**
 * Carga la matriz de pagos de una disciplina para la gestión (año) elegida
 */
export async function cargarMatrizPorDisciplina(disciplina, idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) return;

    poblarAniosGestion();
    const selectAnio = document.getElementById('filtro-gestion-anio');
    const anio = selectAnio ? selectAnio.value : new Date().getFullYear();

    contenedor.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:20px; color:#94a3b8;">Cargando cuotas de ${disciplina}...</td></tr>`;

    try {
        const [resJugadores, resPagos] = await Promise.all([
            fetch('/api/jugadores'),
            fetch(`/api/pagos?anio=${anio}`)
        ]);

        if (!resJugadores.ok || !resPagos.ok) throw new Error('Error al obtener datos financieros.');

        const todosLosJugadores = await resJugadores.json();
        const pagos = await resPagos.json();

        await cargarAtletasEnSelect(todosLosJugadores);

        const jugadores = todosLosJugadores.filter(j =>
            disciplina === 'futsal' ? esDeFutsal(j) : !esDeFutsal(j)
        );

        contenedor.innerHTML = '';

        if (!jugadores || jugadores.length === 0) {
            contenedor.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:20px; color:#94a3b8;">No hay atletas registrados en ${disciplina}.</td></tr>`;
            return;
        }

        jugadores.forEach(j => {
            const tr = document.createElement('tr');
            const nombreAtleta = j.nombre_completo || `${j.nombre || ''} ${j.apellido || ''}`.trim();

            let htmlFila = `<td style="text-align:left; font-weight:bold;">${escapar(nombreAtleta)}</td>`;

            MESES.forEach(mes => {
                const pagoRealizado = pagos.find(p =>
                    (p.jugador_id === j.id || p.atleta_id === j.id) &&
                    String(p.mes || '').toLowerCase() === mes.toLowerCase()
                );

                if (pagoRealizado) {
                    htmlFila += `<td style="background: rgba(16, 185, 129, 0.2); color: #10b981; text-align:center; font-weight:bold; font-size:12px;">✅</td>`;
                } else {
                    htmlFila += `<td style="background: rgba(239, 68, 68, 0.1); color: #ef4444; text-align:center; font-size:12px;">❌</td>`;
                }
            });

            htmlFila += `
                <td style="text-align:center;">
                    <button type="button" class="btn-cobrar" style="background:#10b981; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;">
                        Cobrar
                    </button>
                </td>`;

            tr.innerHTML = htmlFila;
            tr.querySelector('.btn-cobrar').addEventListener('click', () => window.abrirModalCobro(j.id));
            contenedor.appendChild(tr);
        });

        calcularMontoTotal(pagos);

    } catch (err) {
        console.error('Error al cargar la matriz:', err);
        contenedor.innerHTML = '<tr><td colspan="14" style="text-align:center; color:#ef4444; padding:20px;">Error de conexión.</td></tr>';
    }
}

/**
 * Función general de carga requerida por app.js:
 * recarga la pestaña que está abierta (no vuelve siempre a Balonmano)
 */
export function cargarMatrizMeses() {
    window.cambiarPestanaCaja(pestanaCajaActual);
}

/**
 * Suma y actualiza el total acumulado en caja
 */
export function calcularMontoTotal(pagos = []) {
    const elTotal = document.getElementById('monto-total-caja');
    if (!elTotal) return;

    const total = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
    elTotal.textContent = `${total.toFixed(2)} Bs`;
}

export function actualizarMontoInput() {
    const selectCantidad = document.getElementById('pop-cantidad-meses') || document.querySelector('select[name="cantidad_meses"]');
    const inputMonto = document.getElementById('pop-monto');
    
    if (!selectCantidad || !inputMonto) return;

    const mesesSeleccionados = parseInt(selectCantidad.value) || 1;
    inputMonto.value = mesesSeleccionados * COSTO_POR_MES;
}

export function exportarMatrizExcel(disciplina = 'balonmano') {
    const tabla = document.getElementById(`tabla-matriz-${disciplina}`) || document.querySelector('table');
    if (!tabla) return alert('No hay datos para exportar.');

    const html = tabla.outerHTML.replace(/ /g, '%20');
    const a = document.createElement('a');
    a.href = 'data:application/vnd.ms-excel,' + html;
    a.download = `Matriz_Pagos_${disciplina.toUpperCase()}_${new Date().getFullYear()}.xls`;
    a.click();
}

export function exportarMatrizPDF() {
    window.print();
}

// Botón "Cobrar" de la matriz: elige al atleta en el formulario y baja hasta él
window.abrirModalCobro = function(jugadorId) {
    const select = document.getElementById('pop-jugador');
    if (select) select.value = jugadorId;
    document.getElementById('form-cobro-meses')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.actualizarMontoInput = actualizarMontoInput;
window.exportarMatrizExcel = exportarMatrizExcel;
window.exportarMatrizPDF = exportarMatrizPDF;

export function exportarPlantelExcel(disciplina = 'balonmano') {
    const tabla = document.getElementById(`tabla-${disciplina}`) || document.querySelector('table');
    if (!tabla) return alert('No hay plantel registrado para exportar.');

    const html = tabla.outerHTML.replace(/ /g, '%20');
    const a = document.createElement('a');
    a.href = 'data:application/vnd.ms-excel,' + html;
    a.download = `Plantel_${disciplina.toUpperCase()}_${new Date().getFullYear()}.xls`;
    a.click();
}

window.exportarPlantelExcel = exportarPlantelExcel;