// js/modules/galeria.js
import { obtenerFotos, escapar } from './actividades.js';

let todasLasFotos = [];   // { src, titulo, gestion }
let fotosVisibles = [];   // lista después de aplicar el filtro de año
let anioActivo = 'todos';
let indiceVisor = 0;
let visorListo = false;

export async function cargarGaleria() {
    const contenedor = document.getElementById('galeria-contenedor');
    if (!contenedor) return;

    contenedor.innerHTML = '<p class="galeria-vacio">Cargando fotos...</p>';

    try {
        const res = await fetch('/api/actividades');
        if (!res.ok) throw new Error('Error al obtener actividades');
        const actividades = await res.json();

        todasLasFotos = [];
        (actividades || []).forEach(act => {
            obtenerFotos(act).forEach(src => {
                todasLasFotos.push({
                    src,
                    titulo: act.titulo || '',
                   gestion: String(act.gestion || act.anio || '')
                });
            });
        });

        anioActivo = 'todos';
        dibujarFiltros();
        dibujarFotos();
        prepararVisor();
    } catch (err) {
        console.error('Error al cargar la galería:', err);
        contenedor.innerHTML = '<p class="galeria-vacio">No se pudieron cargar las fotos.</p>';
    }
}

function dibujarFiltros() {
    const filtros = document.getElementById('galeria-filtros');
    if (!filtros) return;

    const anios = [...new Set(todasLasFotos.map(f => f.gestion).filter(Boolean))]
        .sort((a, b) => b - a);

    // Con un solo año no hace falta filtro
    if (anios.length < 2) {
        filtros.innerHTML = '';
        return;
    }

    filtros.innerHTML = ['todos', ...anios].map(a => `
        <button type="button" class="galeria-filtro ${a === anioActivo ? 'activo' : ''}" data-anio="${escapar(a)}">
            ${a === 'todos' ? 'Todos' : escapar(a)}
        </button>`).join('');

    filtros.querySelectorAll('.galeria-filtro').forEach(btn => {
        btn.addEventListener('click', () => {
            anioActivo = btn.dataset.anio;
            dibujarFiltros();
            dibujarFotos();
        });
    });
}

function dibujarFotos() {
    const contenedor = document.getElementById('galeria-contenedor');
    if (!contenedor) return;

    fotosVisibles = anioActivo === 'todos'
        ? todasLasFotos
        : todasLasFotos.filter(f => f.gestion === anioActivo);

    if (fotosVisibles.length === 0) {
        contenedor.innerHTML = '<p class="galeria-vacio">Aún no hay fotos. Las que se publiquen en Actividades aparecerán aquí.</p>';
        return;
    }

    contenedor.innerHTML = fotosVisibles.map((f, i) => `
        <div class="galeria-item" data-indice="${i}">
            <img src="${escapar(f.src)}" alt="${escapar(f.titulo)}" loading="lazy" onerror="this.closest('.galeria-item').remove()">
            <p>${escapar(f.titulo)}${f.gestion ? ' • ' + escapar(f.gestion) : ''}</p>
        </div>`).join('');

    contenedor.querySelectorAll('.galeria-item').forEach(item => {
        item.addEventListener('click', () => abrirVisor(Number(item.dataset.indice)));
    });
}

// ---------- Visor de foto ampliada ----------
function prepararVisor() {
    if (visorListo) return;
    const visor = document.getElementById('galeria-visor');
    if (!visor) return;

    document.getElementById('visor-cerrar')?.addEventListener('click', cerrarVisor);
    document.getElementById('visor-izq')?.addEventListener('click', () => moverVisor(-1));
    document.getElementById('visor-der')?.addEventListener('click', () => moverVisor(1));

    // Clic en el fondo oscuro cierra el visor
    visor.addEventListener('click', (e) => {
        if (e.target === visor) cerrarVisor();
    });

    document.addEventListener('keydown', (e) => {
        if (visor.style.display !== 'flex') return;
        if (e.key === 'Escape') cerrarVisor();
        else if (e.key === 'ArrowLeft') moverVisor(-1);
        else if (e.key === 'ArrowRight') moverVisor(1);
    });

    visorListo = true;
}

function abrirVisor(indice) {
    const visor = document.getElementById('galeria-visor');
    if (!visor) return;
    indiceVisor = indice;
    mostrarFotoVisor();
    visor.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarVisor() {
    const visor = document.getElementById('galeria-visor');
    if (visor) visor.style.display = 'none';
    document.body.style.overflow = '';
}

function moverVisor(dir) {
    if (fotosVisibles.length === 0) return;
    indiceVisor = (indiceVisor + dir + fotosVisibles.length) % fotosVisibles.length;
    mostrarFotoVisor();
}

function mostrarFotoVisor() {
    const f = fotosVisibles[indiceVisor];
    if (!f) return;
    const img = document.getElementById('visor-img');
    const pie = document.getElementById('visor-pie');
    if (img) { img.src = f.src; img.alt = f.titulo; }
    if (pie) {
        pie.textContent = `${f.titulo}${f.gestion ? ' • ' + f.gestion : ''}  (${indiceVisor + 1}/${fotosVisibles.length})`;
    }
}