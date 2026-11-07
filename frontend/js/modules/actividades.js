// js/modules/actividades.js
import { esAdmin } from './admin.js';
import { abrirEditor } from './editor.js';

// Evita que un texto con < > " ' rompa el HTML de la tarjeta
export function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Si viene solo el nombre del archivo, le agrega /uploads/
function normalizarRuta(ruta) {
    const r = String(ruta).trim();
    if (/^(https?:)?\/\//.test(r) || r.startsWith('data:')) return r;
    if (r.startsWith('/')) return r;
    return '/uploads/' + r;
}

// Devuelve siempre una lista de rutas válidas, sin importar cómo llegue el dato
export function obtenerFotos(act) {
    let lista = [];

    if (Array.isArray(act.imagenes) && act.imagenes.length > 0) {
        lista = act.imagenes;
    } else {
        const crudo = act.imagen_url || act.imagen;
        if (crudo) {
            if (Array.isArray(crudo)) {
                lista = crudo;
            } else {
                try {
                    const parsed = JSON.parse(crudo);
                    lista = Array.isArray(parsed) ? parsed : [crudo];
                } catch (_) {
                    // No es JSON: es una ruta o nombre de archivo simple
                    lista = [crudo];
                }
            }
        }
    }

    return lista.filter(Boolean).map(normalizarRuta);
}

function crearGaleriaHTML(fotos, titulo) {
    if (fotos.length === 0) {
        return `
            <div style="width: 100%; height: 300px; background: linear-gradient(135deg, #121212, #262626); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ff6b00;">
                <span style="font-size: 50px;">🏀</span>
                <span style="font-size: 14px; font-weight: bold; margin-top: 10px; color: #fff;">${escapar(titulo)}</span>
            </div>`;
    }

    const imgs = fotos.map(src =>
        `<img src="${escapar(src)}" alt="${escapar(titulo)}" loading="lazy">`
    ).join('');

    // Una sola foto: sin flechas, puntos ni contador
    if (fotos.length === 1) {
        return `<div class="carrusel"><div class="carrusel-pista">${imgs}</div></div>`;
    }

    const puntos = fotos.map((_, i) =>
        `<span class="carrusel-punto ${i === 0 ? 'activo' : ''}"></span>`
    ).join('');

    return `
        <div class="carrusel">
            <div class="carrusel-pista">${imgs}</div>
            <button type="button" class="carrusel-flecha izq oculta" aria-label="Foto anterior">‹</button>
            <button type="button" class="carrusel-flecha der" aria-label="Foto siguiente">›</button>
            <span class="carrusel-contador">1/${fotos.length}</span>
            <div class="carrusel-puntos">${puntos}</div>
        </div>`;
}

// Activa flechas, puntos y contador de una tarjeta
function inicializarCarrusel(article) {
    const pista = article.querySelector('.carrusel-pista');
    if (!pista) return;

    const total = pista.children.length;
    if (total < 2) return;

    const flechaIzq = article.querySelector('.carrusel-flecha.izq');
    const flechaDer = article.querySelector('.carrusel-flecha.der');
    const puntos = article.querySelectorAll('.carrusel-punto');
    const contador = article.querySelector('.carrusel-contador');

    const actualizar = () => {
        if (!pista.clientWidth) return; // sección oculta: no hay medidas todavía
        const i = Math.round(pista.scrollLeft / pista.clientWidth);
        puntos.forEach((p, k) => p.classList.toggle('activo', k === i));
        if (contador) contador.textContent = `${i + 1}/${total}`;
        if (flechaIzq) flechaIzq.classList.toggle('oculta', i === 0);
        if (flechaDer) flechaDer.classList.toggle('oculta', i === total - 1);
    };

    const mover = (dir) => pista.scrollBy({ left: dir * pista.clientWidth, behavior: 'smooth' });

    pista.addEventListener('scroll', actualizar, { passive: true });
    if (flechaIzq) flechaIzq.addEventListener('click', () => mover(-1));
    if (flechaDer) flechaDer.addEventListener('click', () => mover(1));
}

export async function cargarActividades() {
    const contenedor = document.getElementById('contenedor-actividades')
                     || document.getElementById('grid-actividades')
                     || document.querySelector('#actividades .contenido')
                     || document.querySelector('#seccion-actividades');

    if (!contenedor) return;

    contenedor.innerHTML = `
        <div style="text-align: center; color: #a855f7; padding: 40px; font-family: sans-serif;">
            <div style="font-size: 24px;">📸</div>
            <p style="margin-top: 8px; font-size: 14px; color: #94a3b8;">Cargando publicaciones...</p>
        </div>`;

    try {
        const res = await fetch('/api/actividades');
        if (!res.ok) throw new Error('Error al obtener actividades');
        const actividades = await res.json();

        contenedor.innerHTML = '';

        if (!actividades || actividades.length === 0) {
            contenedor.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 60px 20px; background: #000; border: 1px solid #262626; border-radius: 12px; max-width: 470px; margin: 20px auto; font-family: sans-serif;">
                    <div style="font-size: 40px; margin-bottom: 10px;">📷</div>
                    <h3 style="color: #fff; margin: 0 0 5px 0;">Aún no hay publicaciones</h3>
                    <p style="font-size: 13px; color: #8e8e8e; margin: 0;">Las fotos y novedades del club aparecerán aquí.</p>
                </div>`;
            return;
        }

        contenedor.style.display = 'flex';
        contenedor.style.flexDirection = 'column';
        contenedor.style.alignItems = 'center';
        contenedor.style.gap = '24px';
        contenedor.style.padding = '10px 0 40px 0';

        const esUsuarioAdmin = typeof esAdmin === 'function' ? esAdmin() : !!esAdmin;

        actividades.forEach(act => {
            const article = document.createElement('article');
            article.id = `post-${act.id}`;
            article.style.cssText = 'width: 100%; max-width: 470px; background: #000; border: 1px solid #262626; border-radius: 8px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.5);';

            const galeriaHTML = crearGaleriaHTML(obtenerFotos(act), act.titulo);

            article.innerHTML = `
                <!-- Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 38px; height: 38px; border-radius: 50%; padding: 2px; background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);">
                            <div style="width: 100%; height: 100%; border-radius: 50%; background: #000; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 11px; border: 2px solid #000;">
                                LD
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="color: #f5f5f5; font-size: 13.5px; font-weight: 600;">looneyducks_oficial</span>
                                <span style="color: #0095f6; font-size: 12px;">✔</span>
                            </div>
                            <span style="color: #a8a8a8; font-size: 11px;">Sacaba, Bolivia • ${escapar(act.gestion || act.anio || '2026')}</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${esUsuarioAdmin ? `<button class="btn-editar-act" style="background: transparent; border: none; color: #0095f6; cursor: pointer; font-size: 12px; font-weight: bold; padding: 0; letter-spacing: 0; text-transform: none;">Editar</button>` : ''}
                        ${esUsuarioAdmin ? `<button class="btn-eliminar" style="background: transparent; border: none; color: #ed4956; cursor: pointer; font-size: 12px; font-weight: bold;">Eliminar</button>` : ''}
                        <span style="color: #f5f5f5; font-size: 18px; cursor: pointer;">•••</span>
                    </div>
                </div>

                <!-- Galería de fotos (carrusel) -->
                ${galeriaHTML}

                <!-- Botones de Acción -->
                <div style="padding: 10px 14px 4px 14px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <button class="btn-like" style="background: none; border: none; cursor: pointer; padding: 0;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5f5f5" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Likes Count -->
                <div style="padding: 0 14px; margin-top: 4px;">
                    <span class="likes-count" style="color: #f5f5f5; font-size: 13.5px; font-weight: 600;">
                        ${act.total_likes || 0} Me gusta
                    </span>
                </div>

                <!-- Descripción -->
                <div style="padding: 6px 14px; color: #f5f5f5; font-size: 13.5px; line-height: 1.4;">
                    <span style="font-weight: 600; margin-right: 6px;">looneyducks_oficial</span>
                    <b style="color: #ff6b00;">${escapar(act.titulo)}</b>
                    <span style="color: #dbdbdb;">${escapar(act.descripcion)}</span>
                </div>

                <!-- Comentarios -->
                <div style="margin-top: 8px; border-top: 1px solid #262626; padding: 8px 14px; display: flex; align-items: center; justify-content: space-between;">
                    <input type="text" class="input-comment" placeholder="Añade un comentario..." style="background: transparent; border: none; outline: none; color: #fff; font-size: 13px; width: 80%;">
                    <button class="btn-publicar-comentario" style="background: none; border: none; color: #0095f6; font-weight: 600; font-size: 13px; cursor: pointer;">
                        Publicar
                    </button>
                </div>
            `;

            inicializarCarrusel(article);

            const btnLike = article.querySelector('.btn-like');
            const likesCountEl = article.querySelector('.likes-count');
            if (btnLike) btnLike.addEventListener('click', () => darMeGustaBD(act.id, likesCountEl, btnLike));

            const btnEditar = article.querySelector('.btn-editar-act');
            if (btnEditar) btnEditar.addEventListener('click', () => editarActividadBD(act));

            const btnEliminar = article.querySelector('.btn-eliminar');
            if (btnEliminar) btnEliminar.addEventListener('click', () => eliminarActividadBD(act.id));

            contenedor.appendChild(article);
        });

    } catch (err) {
        console.error('Error al cargar actividades:', err);
        contenedor.innerHTML = '<p style="color: #ed4956; text-align: center;">Error de conexión con el servidor.</p>';
    }
}

// Ventana para corregir año, título y descripción de una publicación (las fotos no cambian)
export function editarActividadBD(act) {
    abrirEditor({
        titulo: '✏️ Editar publicación',
        campos: [
            { id: 'anio', etiqueta: 'Año / Gestión', tipo: 'number', valor: act.anio ?? act.gestion ?? new Date().getFullYear(), requerido: true, min: 2018, max: 2099, step: 1 },
            { id: 'titulo', etiqueta: 'Título', tipo: 'text', valor: act.titulo || '', requerido: true, maxlength: 150 },
            { id: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', valor: act.descripcion || '' }
        ],
        onGuardar: async (v) => {
            if (!v.titulo) throw new Error('El título es obligatorio.');

            const res = await fetch(`/api/actividades/${Number(act.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ anio: Number(v.anio), titulo: v.titulo, descripcion: v.descripcion })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la actividad.');

            await cargarActividades();
            // La galería se arma con estas mismas publicaciones
            if (typeof window.cargarGaleria === 'function') window.cargarGaleria();
        }
    });
}

export async function darMeGustaBD(id, countEl, btnLike) {
    try {
        const res = await fetch(`/api/actividades/${id}/like`, { method: 'POST' });
        if (res.ok) {
            if (countEl) {
                let actual = parseInt(countEl.innerText) || 0;
                countEl.innerText = `${actual + 1} Me gusta`;
            }
            if (btnLike) {
                const svg = btnLike.querySelector('svg');
                if (svg) {
                    svg.setAttribute('fill', '#ed4956');
                    svg.setAttribute('stroke', '#ed4956');
                }
            }
        }
    } catch (err) {
        console.error('Error al enviar me gusta:', err);
    }
}

export async function eliminarActividadBD(id) {
    if (!confirm('¿Deseas eliminar esta publicación?')) return;
    try {
        const res = await fetch(`/api/actividades/${id}`, { method: 'DELETE' });
        if (res.ok) {
            document.getElementById(`post-${id}`)?.remove();
        } else {
            const data = await res.json();
            alert(data.error || 'No se pudo eliminar la actividad');
        }
    } catch (err) {
        console.error('Error al eliminar:', err);
    }
}