const PDFDocument = require('pdfkit');
const db = require('../config/db');

// Posiciones de futsal (solo se usan si el atleta no tiene disciplina guardada)
const POSICIONES_FUTSAL = ['guardameta', 'cierre', 'ala izquierdo', 'ala derecho', 'pívot'];

const esFutsal = (j) => {
    if (j.disciplina) return String(j.disciplina).toLowerCase() === 'futsal';
    const pos = String(j.posicion || '').toLowerCase().trim();
    return POSICIONES_FUTSAL.includes(pos) || pos.includes('futsal');
};

// estado 0 = activo, distinto de 0 = eliminado (igual que la pantalla)
const estaVisible = (j) => Number(j.estado) === 0;

// Misma lógica que calcularEdadYCategoria() de jugadores.js
function categoriaPorFecha(fecha) {
    if (!fecha) return 'Sin Fecha';
    const anio = fecha instanceof Date
        ? fecha.getFullYear()
        : parseInt(String(fecha).split(/[-/]/)[0]);
    if (isNaN(anio) || anio < 1900) return 'Inválida';

    const edad = new Date().getFullYear() - anio;
    if (edad <= 7) return 'Sub-7 (Iniciación)';
    if (edad <= 10) return 'Sub-10 (Pre-Infantil)';
    if (edad <= 13) return 'Sub-13 (Infantil)';
    if (edad <= 16) return 'Sub-16 (Cadetes)';
    if (edad <= 19) return 'Sub-19 (Juvenil)';
    return 'Mayores (Senior)';
}

exports.exportarPlantelPDF = async (req, res) => {
    try {
        const disciplina = (req.query.disciplina || req.query.rama || '').toLowerCase().trim();

        if (!['balonmano', 'futsal'].includes(disciplina)) {
            return res.status(400).json({ error: 'Disciplina inválida. Use "balonmano" o "futsal".' });
        }

        const tituloDisciplina = disciplina.toUpperCase();

        const [todos] = await db.query('SELECT * FROM jugadores');

        const jugadores = todos
            .filter(estaVisible)
            .filter(j => String(j.nombre || '').trim() !== '')
            .filter(j => disciplina === 'futsal' ? esFutsal(j) : !esFutsal(j))
            .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));

        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Plantel_LooneyDucks_${tituloDisciplina}.pdf"`);

        doc.pipe(res);

        // Encabezado
        doc.fillColor('#ff6b00').fontSize(16).font('Helvetica-Bold').text('CLUB DEPORTIVO LOONEY DUCKS', { align: 'center' });
        doc.fillColor('#666666').fontSize(9).font('Helvetica').text('FUNDADA EN 10 DE DICIEMBRE DE 2018 - SACABA, COCHABAMBA', { align: 'center' });
        doc.moveDown(1);

        doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text(`FORMULARIO OFICIAL - PLANTEL DE ${tituloDisciplina}`, { align: 'center', underline: true });
        doc.moveDown(1.5);

        const startX = 35;
        let startY = doc.y;
        const rowHeight = 20;

        const dibujarCabecera = (y) => {
            doc.rect(startX, y, 525, 20).fill('#ff6b00');
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
            doc.text('N°', startX + 5, y + 5, { width: 25, align: 'center' });
            doc.text('ATLETA', startX + 35, y + 5, { width: 160, align: 'left' });
            doc.text('POSICIÓN', startX + 200, y + 5, { width: 90, align: 'left' });
            doc.text('CATEGORÍA', startX + 295, y + 5, { width: 100, align: 'center' });
            doc.text('RAMA', startX + 400, y + 5, { width: 60, align: 'center' });
            doc.text('CLUB', startX + 460, y + 5, { width: 65, align: 'center' });
        };

        dibujarCabecera(startY);
        startY += rowHeight;

        if (jugadores.length === 0) {
            startY += 5;
            doc.fillColor('#000000').fontSize(9).font('Helvetica-Oblique')
               .text(`No hay atletas registrados en ${disciplina}.`, startX, startY, { align: 'center', width: 525 });
        } else {
            jugadores.forEach((j, index) => {
                if (startY > 750) {
                    doc.addPage();
                    startY = 50;
                    dibujarCabecera(startY);
                    startY += rowHeight;
                }

                if (index % 2 === 0) {
                    doc.rect(startX, startY, 525, rowHeight).fill('#f9f9f9');
                }

                doc.fillColor('#000000').fontSize(9).font('Helvetica');
                doc.text(String(index + 1), startX + 5, startY + 5, { width: 25, align: 'center' });
                doc.text(String(j.nombre), startX + 35, startY + 5, { width: 160, align: 'left', lineBreak: false });
                doc.text(String(j.posicion || '-'), startX + 200, startY + 5, { width: 90, align: 'left', lineBreak: false });
                doc.text(categoriaPorFecha(j.fecha_nacimiento), startX + 295, startY + 5, { width: 100, align: 'center', lineBreak: false });
                doc.text(String(j.rama || '-'), startX + 400, startY + 5, { width: 60, align: 'center', lineBreak: false });
                doc.text('Looney Ducks', startX + 460, startY + 5, { width: 65, align: 'center', lineBreak: false });

                startY += rowHeight;
            });
        }

        doc.end();

    } catch (error) {
        console.error('ERROR CRÍTICO AL GENERAR PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'No se pudo generar el documento PDF', detalle: error.message });
        }
    }
};