// ==========================================
//   JS/APP.JS - ARCHIVO PRINCIPAL (ORQUESTADOR)
// ==========================================

// 1. IMPORTACIÓN DE MÓDULOS
import { 
    revisarSesionActiva, 
    inicializarLogin, 
    cerrarSesionAdmin, 
    esAdmin,
    inicializarCambioClave,
    alternarOjito
} from './modules/admin.js';

import { 
    cargarJugadores, 
    eliminarJugador, 
    alternarDestacado, 
    actualizarPosiciones, 
    poblarFechas,
    formatearNombreInput,
    verificarEdad,
    guardarInscripcion,
    inicializarValidacionTutor
} from './modules/jugadores.js';

import {
    cargarMatrizMeses,
    calcularMontoTotal,
    exportarMatrizExcel,
    exportarMatrizPDF,
    exportarPlantelExcel
} from './modules/pagos.js';

// Módulo Actividades Seguro (no rompe si falta algún export)
import * as ActividadesModule from './modules/actividades.js';
const { 
    cargarActividades,
    inicializarFormularioActividades,
    eliminarActividad,
    darMeGusta,
    agregarComentario,
    alternarGuardado,
    compartirPost
} = ActividadesModule;

// ==========================================
// 2. NAVEGACIÓN Y CONTROL DE VISTAS (SPA)
// ==========================================

export function verSeccion(id) {
    const secciones = [
        'inicio', 
        'actividades', 
        'galeria', 
        'registro', 
        'login', 
        'panel', 
        'cambiar-clave'
    ];

    secciones.forEach(secId => {
        const el = document.getElementById(`sec-${secId}`) || document.getElementById(secId);
        if (el) {
            el.style.display = 'none';
        }
    });

    const objetivo = document.getElementById(`sec-${id}`) || document.getElementById(id);
    if (objetivo) {
        objetivo.style.display = 'block';
    } else {
        console.warn(`No se encontró el elemento HTML para la sección: "${id}"`);
    }

    if (id === 'panel') {
        if (typeof cargarJugadores === 'function') cargarJugadores();
        if (typeof cargarMatrizMeses === 'function') cargarMatrizMeses();
    } else if (id === 'actividades') {
        if (typeof cargarActividades === 'function') cargarActividades();
    } else if (id === 'registro') {
        if (typeof poblarFechas === 'function') poblarFechas();
    }
}

export function mostrarSubModulo(submodulo) {
    const subPlanteles = document.getElementById('submod-planteles');
    const subCaja = document.getElementById('submod-caja');
    const btnPlanteles = document.getElementById('btn-sec-planteles');
    const btnCaja = document.getElementById('btn-sec-caja');

    if (submodulo === 'planteles') {
        if (subPlanteles) subPlanteles.style.display = 'block';
        if (subCaja) subCaja.style.display = 'none';
        if (btnPlanteles) btnPlanteles.style.background = '#ff6b00';
        if (btnCaja) btnCaja.style.background = '#334155';
    } else if (submodulo === 'caja') {
        if (subPlanteles) subPlanteles.style.display = 'none';
        if (subCaja) subCaja.style.display = 'block';
        if (btnPlanteles) btnPlanteles.style.background = '#334155';
        if (btnCaja) btnCaja.style.background = '#10b981';
    }
}

export function cambiarPestanaPlantel(disciplina) {
    const contenedorBalonmano = document.getElementById('contenedor-balonmano');
    const contenedorFutsal = document.getElementById('contenedor-futsal');
    const btnBalonmano = document.getElementById('btn-tab-balonmano');
    const btnFutsal = document.getElementById('btn-tab-futsal');

    if (disciplina === 'balonmano') {
        if (contenedorBalonmano) contenedorBalonmano.style.display = 'block';
        if (contenedorFutsal) contenedorFutsal.style.display = 'none';
        if (btnBalonmano) btnBalonmano.style.background = '#ff6b00';
        if (btnFutsal) btnFutsal.style.background = '#334155';
    } else if (disciplina === 'futsal') {
        if (contenedorBalonmano) contenedorBalonmano.style.display = 'none';
        if (contenedorFutsal) contenedorFutsal.style.display = 'block';
        if (btnBalonmano) btnBalonmano.style.background = '#334155';
        if (btnFutsal) btnFutsal.style.background = '#00d2ff';
    }
}

// Vinculación global explícita para compatibilidad con eventos inline HTML (onclick)
window.verSeccion = verSeccion;
window.mostrarSubModulo = mostrarSubModulo;
window.cambiarPestanaPlantel = cambiarPestanaPlantel;

// ==========================================
// 3. REGISTRO DE EVENTOS DEL DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof revisarSesionActiva === 'function') {
        revisarSesionActiva(() => verSeccion('panel'));
    }
    if (typeof inicializarLogin === 'function') {
        inicializarLogin(() => verSeccion('panel'));
    }
    if (typeof inicializarCambioClave === 'function') {
        inicializarCambioClave();
    }
    
    if (typeof cargarActividades === 'function') {
        cargarActividades();
    }
    if (typeof inicializarFormularioActividades === 'function') {
        inicializarFormularioActividades();
    }

    if (typeof poblarFechas === 'function') {
        poblarFechas();
    }
    if (typeof inicializarValidacionTutor === 'function') {
        inicializarValidacionTutor();
    }

    const inputNombre = document.getElementById('reg-nombre') || document.querySelector('input[name="nombre"]');
    if (inputNombre && typeof formatearNombreInput === 'function') {
        formatearNombreInput(inputNombre);
    }

    const formActividad = document.getElementById('formActividad');
    if (formActividad) {
        formActividad.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!esAdmin) return alert('No tienes permisos de administrador.');

            const formData = new FormData();
            formData.append('anio', document.getElementById('anioInput')?.value || '2026');
            formData.append('titulo', document.getElementById('tituloInput')?.value || '');
            formData.append('descripcion', document.getElementById('descripcionInput')?.value || '');

            const fileInput = document.getElementById('imagenInput');
            if (fileInput && fileInput.files[0]) {
                formData.append('imagen', fileInput.files[0]);
            }

            try {
                const res = await fetch('/api/actividades', { method: 'POST', body: formData });
                if (res.ok) {
                    alert('✅ Actividad agregada correctamente');
                    formActividad.reset();
                    if (typeof cargarActividades === 'function') cargarActividades();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Error al agregar la actividad.');
                }
            } catch (err) {
                console.error('Error al guardar la actividad:', err);
            }
        });
    }

    const formCobro = document.getElementById('form-cobro-meses');
    if (formCobro) {
        formCobro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const jugador_id = document.getElementById('pop-jugador')?.value;
            const mesInicio = document.getElementById('pop-mes')?.value;
            const cantidadMeses = parseInt(document.getElementById('pop-cantidad-meses')?.value || '1');
            const elAnio = document.getElementById('filtro-gestion-anio');
            const anio = elAnio ? elAnio.value : new Date().getFullYear();
            const metodo_pago = document.getElementById('pop-metodo')?.value || 'EFECTIVO';

            if (!jugador_id) return alert('Selecciona un atleta primero.');

            const listaMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            let indexInicio = listaMeses.indexOf(mesInicio);

            try {
                for (let i = 0; i < cantidadMeses; i++) {
                    let mesAProcesar = listaMeses[(indexInicio + i) % 12];
                    await fetch('/api/pagos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jugador_id, anio, mes: mesAProcesar, monto: 80, metodo_pago })
                    });
                }
                alert(`✅ Se registró el pago de ${cantidadMeses} mes(es).`);
                if (typeof cargarMatrizMeses === 'function') cargarMatrizMeses();
            } catch (err) {
                alert('Error de conexión al registrar los pagos.');
            }
        });
    }
});

// ==========================================
// 4. EXPOSICIÓN AL ÁMBITO GLOBAL (WINDOW)
// ==========================================
window.verSeccion = verSeccion;
window.mostrarSubModulo = mostrarSubModulo;
window.cambiarPestanaPlantel = cambiarPestanaPlantel;

// Módulo Admin
window.cerrarSesionAdmin = cerrarSesionAdmin;

// Módulo Jugadores
window.eliminarJugador = eliminarJugador;
window.alternarDestacado = alternarDestacado;
window.actualizarPosiciones = actualizarPosiciones;
window.verificarEdad = verificarEdad;
window.guardarInscripcion = guardarInscripcion;
window.toggleClavePanel = alternarOjito;

// Módulo Pagos / Caja
window.cargarMatrizMeses = cargarMatrizMeses;
window.calcularMontoTotal = calcularMontoTotal;
window.exportarMatrizExcel = exportarMatrizExcel;
window.exportarMatrizPDF = exportarMatrizPDF;
window.exportarPlantelExcel = exportarPlantelExcel;

// Módulo Actividades
window.eliminarActividad = eliminarActividad;
window.darMeGusta = darMeGusta;
window.agregarComentario = agregarComentario;
window.alternarGuardado = alternarGuardado;
window.compartirPost = compartirPost;