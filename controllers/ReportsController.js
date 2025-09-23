import { REPORT_TYPES, REPORT_MAX_RANGE, REPORT_FORMAT } from "../constants/reports.js";
import { parseAndNormalize } from "../utils/date.js";
import { createReport, fileStreamRes, getReportById, historialReportes, listForUser } from "../models/reportsModel.js";
import { buildPDF } from "../utils/pdfBuilder.js";
import { BuildXslx } from "../utils/xlsxBuilder.js";

const MIME = {
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};


export const generateReport = async (req, res) => {
    try {
        const { type, format, date_to, date_from, email_to, filters = {} } = req.body;
        const userId = req.usuario.id;

        if (!REPORT_TYPES.has(type)) throw new Error('Tipo invalido.');
        if (!REPORT_FORMAT.has(format)) throw new Error('Formato invalido');
        if (filters && typeof filters !== 'object') throw new Error('El filtro debe ser un JSON');
        if (!date_to || !date_from) throw new Error('Debes seleccionar una fecha.');

        const { fromUTC, toUTC, rangeDays } = parseAndNormalize(date_from, date_to);
        if (rangeDays > REPORT_MAX_RANGE) throw new Error(`El rango de días es mayor a ${REPORT_MAX_RANGE} días.`);

        const report = await createReport({
            user_id: userId,
            date_from: fromUTC,
            date_to: toUTC,
            type,
            format,
            email_to: email_to || null,
            filters
        });

        return res.status(201).json({ ok: true, data: { report_id: report.id, report_status: report.status}});

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al crear el reporte.'});
    }
};

export const listReports = async (req, res, next) => {
    try {
        const userId = req.usuario.id;
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '20', 10)));
        const type = req.query.type;
        const status = req.query.status;

        if (type && !REPORT_TYPES.has(type)) throw new Error('Tipo invalido.');
        if (status && !['pending', 'failed', 'ready', 'processing'].includes(status)) throw new Error('Status invalido');

        const result = await listForUser({
            user_id: userId,
            page,
            pageSize,
            type,
            status
        });

        return res.json({ ok:true, data: { result }});
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener la lista de reportes.'});
    }
};

export const getReport = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { id } = req.params;
        const report = await getReportById(id);

        if (!report) throw new Error('Reporte no encontrado.');
        if (report.user_id !== userId) throw new Error('Usuario no autorizado.');

        const {file_path, ...resto} = report;
        return res.status(200).json({ ok:true, data: {...resto, has_file: Boolean(file_path)}});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al obtener el reporte.'});
    }
};

export const downloadReport = async (req, res) => {
    try {
        
        const { id } = req.params;
        const report = await getReportById(id);

        if (!report) throw new Error('No se encontró el reporte.');;

        if (report.status !== 'ready') throw new Error('El reporte aún no esta listo.');
        if (!report.file_path) throw new Error('Archivo no disponible.');

        await fileStreamRes(res, report);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error en la descarga.'});
    }
};

export const exportReport = async ({ format, outPath, model, html, renderHTML}) => {
    
    if (!REPORT_FORMAT.has(format)) {
        throw new Error('Formato invalido.');
    }

    if (!outPath) {
        throw new Error('Debes especificar el path de salida.');
    }

    if (format === 'pdf') {
        const htmlSource = html ?? (typeof renderHTML === 'function') ? renderHTML(model) : null;
        if (!htmlSource) {
            throw new Error('Se necesita un archivo html.');
        }
        const path = await buildPDF({ html: htmlSource, outhPath });
        return { ok: true, format: 'pdf', contentType: MIME.pdf, path };
    }

    if (!model) {
        throw new Error('Para XLSX debes pasar model');
    }

    const path = await BuildXslx({ ...model, outPath });
    return { ok:true, format: 'xlsx', contentType: MIME.xlsx, path };

}

export const getReports = async (req, res) => {
    try {
        const reportes = await historialReportes();
        if (!reportes) {
            return res.status(404).json({ msg: 'No se encontraron reportes'});
        };

        return res.status(200).json({ ok:true, reportes});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al traer los reportes'});
    }
}