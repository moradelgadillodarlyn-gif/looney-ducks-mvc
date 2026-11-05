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
    exportarMatrizPDF
} from './modules/pagos.js';

import { inicializarInicio } from './modules/inicio.js';
import { cargarGaleria } from './modules/galeria.js';

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
            el.classList.remove('active');
        }
    });

    const objetivo = document.getElementById(`sec-${id}`) || document.getElementById(id);
    if (objetivo) {
        objetivo.style.display = 'block';
        objetivo.classList.add('active');
    } else {
        console.warn(`No se encontró el elemento HTML para la sección: "${id}"`);
    }

    if (id === 'panel') {
        if (typeof cargarJugadores === 'function') cargarJugadores();
        if (typeof cargarMatrizMeses === 'function') cargarMatrizMeses();
    } else if (id === 'actividades') {
        if (typeof cargarActividades === 'function') cargarActividades();
    } else if (id === 'galeria') {
        cargarGaleria();
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
    // Siempre abrir en Inicio y solo verificar si hay sesión de admin
    // (para mostrar los botones de editar), sin saltar al panel.
    verSeccion('inicio');
    if (typeof revisarSesionActiva === 'function') {
        revisarSesionActiva();
    }

    if (typeof inicializarLogin === 'function') {
        inicializarLogin(() => verSeccion('panel'));
    }
    if (typeof inicializarCambioClave === 'function') {
        inicializarCambioClave();
    }

    // Estadísticas y próximo encuentro de la página de inicio
    if (typeof inicializarInicio === 'function') {
        inicializarInicio();
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
            const archivos = fileInput ? Array.from(fileInput.files) : [];
            if (archivos.length > 12) return alert('Máximo 12 imágenes por publicación.');
            archivos.forEach(f => formData.append('imagenes', f));

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
            const anio = Number(elAnio ? elAnio.value : new Date().getFullYear());
            const metodo_pago = document.getElementById('pop-metodo')?.value || 'EFECTIVO';

            if (!jugador_id) return alert('Selecciona un atleta primero.');

            const listaMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const indexInicio = listaMeses.indexOf(mesInicio);

            let registrados = 0;
            const fallidos = [];

            for (let i = 0; i < cantidadMeses; i++) {
                const posicion = indexInicio + i;
                const mesAProcesar = listaMeses[posicion % 12];
                const anioPago = anio + Math.floor(posicion / 12); // pasado diciembre, sigue el año siguiente

                try {
                    const res = await fetch('/api/pagos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jugador_id, anio: anioPago, mes: mesAProcesar, monto: 80, metodo_pago })
                    });

                    if (res.ok) {
                        registrados++;
                    } else {
                        const data = await res.json().catch(() => ({}));
                        fallidos.push(`${mesAProcesar} ${anioPago}: ${data.error || 'no se pudo registrar'}`);
                    }
                } catch (err) {
                    fallidos.push(`${mesAProcesar} ${anioPago}: error de conexión`);
                }
            }

            if (fallidos.length === 0) {
                alert(`✅ Se registró el pago de ${registrados} mes(es).`);
            } else {
                alert(`Se registraron ${registrados} de ${cantidadMeses} mes(es).\n\nNo se pudieron registrar:\n- ${fallidos.join('\n- ')}`);
            }

            if (typeof cargarMatrizMeses === 'function') cargarMatrizMeses();
        });
    }
}); // ✅ ESTE CIERRE FALTABA: termina la función de DOMContentLoaded

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
window.exportarMatrizPDF = exportarMatrizPDF;

// Módulo Actividades
window.eliminarActividad = eliminarActividad;
window.darMeGusta = darMeGusta;
window.agregarComentario = agregarComentario;
window.alternarGuardado = alternarGuardado;
window.compartirPost = compartirPost;

// Garantiza que Inicio se vea al terminar de cargar todo
window.addEventListener('load', () => {
    setTimeout(() => verSeccion('inicio'), 500);
});