// ==========================================
// JS/MODULES/PAGOS.JS - GESTIÓN DE CAJA Y CUOTAS
// ==========================================

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Poblar los desplegables (<select>) de atletas en la interfaz.
 */
export async function cargarAtletasEnSelect() {
    const selectAtleta = document.getElementById('atletaSelect') 
                      || document.getElementById('pop-jugador')
                      || document.querySelector('select[name="jugador_id"]')
                      || document.querySelector('select[name="atleta_id"]');

    if (!selectAtleta) return;

    try {
        const res = await fetch('/api/jugadores');
        if (!res.ok) throw new Error('Error al obtener atletas');
        
        const atletas = await res.json();
        
        // Limpiar opciones preservando la opción por defecto
        selectAtleta.innerHTML = '<option value="" disabled selected>Seleccionar atleta...</option>';

        atletas.forEach(atleta => {
            const option = document.createElement('option');
            option.value = atleta.id;
            // Soporta variantes de propiedad de nombre
            const nombreCompleto = atleta.nombre_completo || `${atleta.nombre || ''} ${atleta.apellido || ''}`.trim();
            option.textContent = nombreCompleto;
            selectAtleta.appendChild(option);
        });
    } catch (err) {
        console.error('Error al cargar la lista de atletas en el select:', err);
    }
}

/**
 * Carga la matriz visual de pagos mensualizados por atleta.
 */
export async function cargarMatrizMeses() {
    const contenedor = document.getElementById('tabla-matriz-pagos') || document.getElementById('contenedor-matriz');
    const selectAnio = document.getElementById('filtro-gestion-anio');
    const anio = selectAnio ? selectAnio.value : new Date().getFullYear();

    if (!contenedor) return;

    contenedor.innerHTML = '<tr><td colspan="14" style="text-align:center; padding:20px; color:#94a3b8;">Cargando estado de cuotas...</td></tr>';

    try {
        // Petición paralela: Cargar alumnos en select, jugadores y pagos
        await cargarAtletasEnSelect();

        const [resJugadores, resPagos] = await Promise.all([
            fetch('/api/jugadores'),
            fetch(`/api/pagos?anio=${anio}`)
        ]);

        if (!resJugadores.ok || !resPagos.ok) throw new Error('Error al obtener datos financieros.');

        const jugadores = await resJugadores.json();
        const pagos = await resPagos.json();

        contenedor.innerHTML = '';

        if (!jugadores || jugadores.length === 0) {
            contenedor.innerHTML = '<tr><td colspan="14" style="text-align:center; padding:20px; color:#94a3b8;">No hay atletas registrados.</td></tr>';
            return;
        }

        jugadores.forEach(j => {
            const tr = document.createElement('tr');
            const nombreAtleta = j.nombre_completo || `${j.nombre || ''} ${j.apellido || ''}`.trim();
            
            // Columna Atleta
            let htmlFila = `<td style="text-align:left; font-weight:bold;">${nombreAtleta}</td>`;

            // Renderizado de cada mes (Enero - Diciembre)
            MESES.forEach(mes => {
                const pagoRealizado = pagos.find(p => (p.jugador_id === j.id || p.atleta_id === j.id) && p.mes.toLowerCase() === mes.toLowerCase());
                
                if (pagoRealizado) {
                    htmlFila += `<td style="background: rgba(16, 185, 129, 0.2); color: #10b981; text-align:center; font-weight:bold; font-size:12px;">✅</td>`;
                } else {
                    htmlFila += `<td style="background: rgba(239, 68, 68, 0.1); color: #ef4444; text-align:center; font-size:12px;">❌</td>`;
                }
            });

            // Columna Acción rápido Cobro
            htmlFila += `
                <td style="text-align:center;">
                    <button onclick="abrirModalCobro(${j.id}, '${nombreAtleta}')" style="background:#10b981; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;">
                        Cobrar
                    </button>
                </td>`;

            tr.innerHTML = htmlFila;
            contenedor.appendChild(tr);
        });

        calcularMontoTotal(pagos);

    } catch (err) {
        console.error('Error al cargar la matriz de pagos:', err);
        contenedor.innerHTML = '<tr><td colspan="14" style="text-align:center; color:#ef4444; padding:20px;">Error de conexión al cargar la caja.</td></tr>';
    }
}

/**
 * Suma y actualiza en pantalla el total acumulado en caja.
 */
export function calcularMontoTotal(pagos = []) {
    const elTotal = document.getElementById('monto-total-caja');
    if (!elTotal) return;

    const total = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
    elTotal.textContent = `${total.toFixed(2)} Bs`;
}

/**
 * Exporta la matriz de cobros a Excel.
 */
export function exportarMatrizExcel() {
    const tabla = document.getElementById('tabla-matriz-completa') || document.querySelector('table');
    if (!tabla) return alert('No hay datos para exportar.');

    const html = tabla.outerHTML.replace(/ /g, '%20');
    const a = document.createElement('a');
    a.href = 'data:application/vnd.ms-excel,' + html;
    a.download = `Matriz_Pagos_${new Date().getFullYear()}.xls`;
    a.click();
}

/**
 * Genera una vista de impresión optimizada para PDF.
 */
export function exportarMatrizPDF() {
    window.print();
}

/**
 * Exporta la lista general del plantel a Excel.
 */
export function exportarPlantelExcel() {
    const tabla = document.getElementById('tabla-plantel-completo') || document.querySelector('table');
    if (!tabla) return alert('No hay plantel registrado para exportar.');

    const html = tabla.outerHTML.replace(/ /g, '%20');
    const a = document.createElement('a');
    a.href = 'data:application/vnd.ms-excel,' + html;
    a.download = `Plantel_LooneyDucks_${new Date().getFullYear()}.xls`;
    a.click();
}

// Función auxiliar global para precargar datos en el formulario de cobro
window.abrirModalCobro = function(jugadorId, nombreJugador) {
    const inputId = document.getElementById('pop-jugador') || document.getElementById('atletaSelect');
    const elNombre = document.getElementById('pop-nombre-atleta');
    const modal = document.getElementById('pop-cobro') || document.getElementById('modal-cobro');

    if (inputId) inputId.value = jugadorId;
    if (elNombre) elNombre.textContent = nombreJugador;
    if (modal) modal.style.display = 'block';
};