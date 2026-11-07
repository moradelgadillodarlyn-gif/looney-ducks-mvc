// js/modules/editor.js
// Ventana emergente genérica para crear/editar registros + filtros de teclado reutilizables.
// La usan registro.js y usuarios.js.

const ID_EDITOR = 'editor-generico';

// ---------- Filtros (limpian lo que se escribe mientras se escribe) ----------

// Solo letras y espacios; cada palabra empieza con mayúscula y sigue en minúscula
export const filtrarNombre = (v) =>
    String(v)
        .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '')
        .replace(/^\s+/, '')
        .replace(/\s{2,}/g, ' ')
        .toLowerCase()
        .replace(/(^|\s)\S/g, (l) => l.toUpperCase());

// Solo dígitos, máximo 8
export const filtrarTelefono = (v) => String(v).replace(/\D/g, '').slice(0, 8);

// ---------- Ventana de edición ----------

function alPresionarTecla(e) {
    if (e.key === 'Escape') cerrarEditor();
}

export function cerrarEditor() {
    const el = document.getElementById(ID_EDITOR);
    if (el) el.remove();
    document.removeEventListener('keydown', alPresionarTecla);
}

function capitalizar(texto) {
    const t = String(texto);
    return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * abrirEditor({ titulo, textoGuardar, campos, onGuardar })
 *
 * campos: [{
 *   id, etiqueta, tipo ('text' | 'tel' | 'email' | 'password' | 'number' | 'select' | 'textarea'),
 *   valor, requerido, maxlength, filtro(texto) -> texto limpio,
 *   opciones (solo select: ['a','b'] o [{ valor, texto }]),
 *   mostrarSi(valoresActuales) -> boolean   (campos que aparecen según otro campo)
 * }]
 *
 * onGuardar(valores) puede ser async. Si lanza un Error, se muestra el mensaje dentro
 * de la ventana y no se cierra; si termina bien, la ventana se cierra sola.
 */
export function abrirEditor({ titulo = 'Editar', textoGuardar = 'Guardar cambios', campos = [], onGuardar } = {}) {
    cerrarEditor();

    const overlay = document.createElement('div');
    overlay.id = ID_EDITOR;
    overlay.className = 'modal-edicion';
    overlay.style.display = 'flex';

    const form = document.createElement('form');
    form.className = 'modal-contenido';
    form.noValidate = true;
    form.autocomplete = 'off';

    const h3 = document.createElement('h3');
    h3.textContent = titulo;
    form.appendChild(h3);

    const controles = new Map(); // id -> { campo, caja, input }

    campos.forEach((campo) => {
        const caja = document.createElement('div');
        caja.className = 'editor-campo';

        const label = document.createElement('label');
        label.htmlFor = `ed-campo-${campo.id}`;
        label.textContent = campo.etiqueta + (campo.requerido ? ' *' : '');
        caja.appendChild(label);

        const tipo = campo.tipo || 'text';
        let input;

        if (tipo === 'select') {
            input = document.createElement('select');
            const opciones = campo.opciones || [];
            if (!campo.valor) input.appendChild(new Option('Selecciona...', ''));
            opciones.forEach((op) => {
                const valor = typeof op === 'object' ? op.valor : op;
                const texto = typeof op === 'object' ? op.texto : capitalizar(op);
                input.appendChild(new Option(texto, valor));
            });
            input.value = campo.valor ?? '';
        } else if (tipo === 'textarea') {
            input = document.createElement('textarea');
            input.rows = 3;
            if (campo.maxlength) input.maxLength = campo.maxlength;
            input.value = campo.valor ?? '';
        } else {
            input = document.createElement('input');
            input.type = tipo;
            if (campo.maxlength) input.maxLength = campo.maxlength;
            input.value = campo.valor ?? '';
            if (tipo === 'password') input.autocomplete = 'new-password';
        }

        input.id = `ed-campo-${campo.id}`;
        input.name = campo.id;

        // Filtro mientras se escribe, conservando el cursor
        if (typeof campo.filtro === 'function' && tipo !== 'select') {
            input.addEventListener('input', () => {
                const limpio = campo.filtro(input.value);
                if (limpio !== input.value) {
                    const pos = input.selectionStart;
                    input.value = limpio;
                    try { input.setSelectionRange(pos, pos); } catch (_) { /* sin cursor */ }
                }
            });
        }

        if (tipo === 'password') {
            const envoltorio = document.createElement('div');
            envoltorio.className = 'cuenta-clave';
            const ojo = document.createElement('button');
            ojo.type = 'button';
            ojo.className = 'btn-ojo';
            ojo.textContent = '👁️';
            ojo.setAttribute('aria-label', 'Mostrar u ocultar contraseña');
            ojo.addEventListener('click', () => {
                input.type = input.type === 'password' ? 'text' : 'password';
            });
            envoltorio.appendChild(input);
            envoltorio.appendChild(ojo);
            caja.appendChild(envoltorio);
        } else {
            caja.appendChild(input);
        }

        form.appendChild(caja);
        controles.set(campo.id, { campo, caja, input });
    });

    const error = document.createElement('p');
    error.className = 'cuenta-mensaje error';
    form.appendChild(error);

    const botones = document.createElement('div');
    botones.className = 'modal-botones';
    const btnGuardar = document.createElement('button');
    btnGuardar.type = 'submit';
    btnGuardar.className = 'btn-primary';
    btnGuardar.textContent = textoGuardar;
    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.className = 'btn-cancelar';
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.addEventListener('click', cerrarEditor);
    botones.appendChild(btnGuardar);
    botones.appendChild(btnCancelar);
    form.appendChild(botones);

    // Campos que solo aparecen según el valor de otro (ej. apellidos si el rol es atleta)
    const leerValores = () => {
        const v = {};
        controles.forEach(({ input }, id) => { v[id] = input.value; });
        return v;
    };
    const actualizarVisibilidad = () => {
        const v = leerValores();
        controles.forEach(({ campo, caja }) => {
            if (typeof campo.mostrarSi === 'function') {
                caja.style.display = campo.mostrarSi(v) ? '' : 'none';
            }
        });
    };
    form.addEventListener('input', actualizarVisibilidad);
    form.addEventListener('change', actualizarVisibilidad);
    actualizarVisibilidad();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        error.textContent = '';

        const valores = {};
        for (const [id, { campo, caja, input }] of controles) {
            if (caja.style.display === 'none') continue; // campo oculto: no se envía
            const valor = campo.tipo === 'password' ? input.value : input.value.trim();
            if (campo.requerido && !valor) {
                error.textContent = `Completa el campo "${campo.etiqueta.split(' (')[0]}".`;
                input.focus();
                return;
            }
            valores[id] = valor;
        }

        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';
        try {
            if (typeof onGuardar === 'function') await onGuardar(valores);
            cerrarEditor();
        } catch (err) {
            error.textContent = err?.message || 'No se pudo guardar.';
            btnGuardar.disabled = false;
            btnGuardar.textContent = textoGuardar;
        }
    });

    overlay.appendChild(form);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', alPresionarTecla);

    const primero = Array.from(controles.values()).find(({ caja }) => caja.style.display !== 'none');
    if (primero) primero.input.focus();
}