// controllers/recibos.controller.js
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import PdfPrinter from "pdfmake";
import { fileURLToPath } from "url";
import { enviarEmailConLink, enviarEmailNormal } from "../utils/enviarEmailAdjunto.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const API_PUBLIC_URL = process.env.API_PUBLIC_URL || "http://localhost:5002";
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "http://localhost:5173";
const JWT_SECRET     = process.env.JWT_PASSWORD || "dev-secret-change-me";


const PROJECT_ROOT = path.resolve(__dirname, "..");
const RECIBOS_DIR  = path.join(PROJECT_ROOT, "recibos");

await fs.promises.mkdir(RECIBOS_DIR, { recursive: true });


export const generarReciboVenta = async (req, res) => {
  try {
    const venta = req.body;

    if (!venta || !venta.codigo) {
      return res.status(400).json({ error: "Datos de la venta incompletos" });
    }

    const nombreArchivo = `recibo-${venta.codigo}.pdf`;
    const filepath = path.join(RECIBOS_DIR, nombreArchivo);

    if (fs.existsSync(filepath)) {
      const token = jwt.sign({ codigo: venta.codigo }, JWT_SECRET, { expiresIn: "48h" });
      return res.json({
        ok: true,
        msg: "Archivo ya existente",
        descarga_auth_url: `${API_PUBLIC_URL}/api/recibos/by-codigo/${venta.codigo}`,
        descarga_jwt_url:  `${API_PUBLIC_URL}/api/recibos/link?token=${token}`,
      });
    }

    
    const fonts = {
      Roboto: {
        normal: path.join(__dirname, "../fonts/Roboto-Regular.ttf"),
        bold: path.join(__dirname, "../fonts/Roboto-Bold.ttf"),
        italics: path.join(__dirname, "../fonts/Roboto-Italic.ttf"),
        bolditalics: path.join(__dirname, "../fonts/Roboto-BoldItalic.ttf"),
      },
    };

    const printer = new PdfPrinter(fonts);

    
    const logoBase64 = fs.readFileSync(
      path.join(__dirname, "../public/logoIclub.png"),
      { encoding: "base64" }
    );

    const asMoney = (n) => `$${Number(n ?? 0).toFixed(2)}`;

    const docDefinition = {
      pageMargins: [40, 20, 40, 40],
      content: [
        {
          columns: [
            { image: "logo", width: 120, alignment: "left", margin: [0, 0, 0, 0] },
            { width: "*", text: "" },
            {
              stack: [
                { text: "iClub Catamarca", bold: true, fontSize: 13 },
                { text: "Intendente Yamil Fadel\nesq. Illia s/n", fontSize: 10 },
                { text: "Tel: 3834292951 - 3834345859", fontSize: 10 },
              ],
              alignment: "right",
              margin: [0, 0, 0, 0],
            },
          ],
          margin: [0, 0, 0, 40],
        },

        { text: "RECIBO DE COMPRA", style: "header", alignment: "center" },
        {
          text: `Código: #${venta.codigo}`,
          alignment: "center",
          bold: true,
          margin: [0, -5, 0, 30],
        },

        {
          columns: [
            {
              text: [
                { text: "Cliente: ", bold: true },
                `${venta?.cliente?.nombre || ""} ${venta?.cliente?.apellido || ""}\n`,
                { text: "Email: ", bold: true },
                `${venta?.cliente?.email || ""}\n`,
                { text: "Teléfono: ", bold: true },
                `${venta?.cliente?.telefono || ""}`,
              ],
              fontSize: 10,
            },
            {
              text: [
                { text: "Fecha: ", bold: true },
                `${new Date(venta.fecha || Date.now()).toLocaleDateString()}`,
              ],
              alignment: "right",
              fontSize: 10,
            },
          ],
          margin: [0, 0, 0, 20],
        },

        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto"],
            body: [
              [
                { text: "Producto", style: "tableHeader" },
                { text: "Cantidad", style: "tableHeader", alignment: "center" },
                { text: "Precio", style: "tableHeader", alignment: "right" },
              ],
              ...(Array.isArray(venta.productos) ? venta.productos : []).map((p) => [
                p?.nombre ?? "",
                { text: String(p?.cantidad ?? 0), alignment: "center" },
                { text: asMoney(p?.precio), alignment: "right" },
              ]),
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 60],
        },

        { text: `Impuestos: ${asMoney(venta.impuestos)}`, style: "total", alignment: "right" },
        { text: `Descuentos: ${asMoney(venta.descuento)}`, style: "total", alignment: "right" },
        { text: `Total: ${asMoney(venta.total)}`, style: "total", alignment: "right", margin: [0, 0, 0, 20] },

        { text: "Gracias por su compra", alignment: "center", italics: true, fontSize: 11, margin: [0, 25, 0, 0] },
      ],

      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        tableHeader: { bold: true, fontSize: 11, fillColor: "#1e3a8a", color: "white" },
        total: { bold: false, fontSize: 12 },
      },

      images: { logo: `data:image/png;base64,${logoBase64}` },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const stream = fs.createWriteStream(filepath);

    pdfDoc.pipe(stream);
    pdfDoc.end();

    stream.on("finish", () => {
      const token = jwt.sign({ codigo: venta.codigo }, JWT_SECRET, { expiresIn: "72h" });
      res.json({
        ok: true,
        mensaje: "Recibo generado correctamente",
        descarga_auth_url: `${API_PUBLIC_URL}/api/recibos/by-codigo/${venta.codigo}`,
        descarga_jwt_url:  `${API_PUBLIC_URL}/api/recibos/link?token=${token}`,
      });
    });

    stream.on("error", (error) => {
      console.error("Error al generar el recibo:", error);
      res.status(500).json({ ok: false, mensaje: "Error al generar recibo" });
    });
  } catch (error) {
    console.error("Error general:", error.message);
    res.status(500).json({ ok: false, mensaje: "Error inesperado" });
  }
};


export const enviarRecibo = async (req, res) => {
  try {
    const venta = req.body;

    if (!venta?.codigo || !venta?.cliente?.email) {
      return res.status(400).json({ msg: "Datos insuficientes: falta código de venta o email del cliente" });
    }

    const logoUrl   = `${APP_PUBLIC_URL}/public/logoIclub.png`;
    const token     = jwt.sign({ codigo: venta.codigo }, JWT_SECRET, { expiresIn: "72h" });
    const urlInline = `${API_PUBLIC_URL}/api/recibos/link?token=${token}`;
    const urlDownload = `${API_PUBLIC_URL}/api/recibos/download/${venta.codigo}`;

    const subject = `Tu recibo de compra iClub - #${venta.codigo}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${encodeURI(logoUrl)}" alt="iClub" style="width: 120px;" />
        </div>

        <h2 style="color: #1e40af;">¡Hola ${venta?.cliente?.nombre || ""}!</h2>
        <p style="font-size: 16px;">
          Gracias por tu compra. Ya generamos tu recibo para que puedas visualizarlo o descargarlo cuando quieras.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${urlInline}" target="_blank"
            style="background-color: #1e40af; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; display: inline-block;">
            📄 VER RECIBO
          </a>
        </div>

        <p style="text-align:center;margin: 0 0 24px 0;">o si preferís</p>

        <div style="text-align: center; margin: 0 0 24px 0;">
          <a href="${urlDownload}" target="_blank"
            style="background-color: #0f172a; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; display: inline-block;">
            ⬇️ Descargar PDF
          </a>
        </div>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />

        <div style="font-size: 13px; color: #777; text-align:center;">
          iClub Catamarca<br>
          Intendente Yamil Fadel esq. Illia s/n<br>
          Tel: 3834292951 - 3834345859
        </div>
      </div>
    `;

    const ok = await enviarEmailConLink({ para: venta.cliente.email, subject, html });
    return res.json({ ok: !!ok, msg: ok ? "Recibo enviado con éxito" : "Falló al enviar el recibo" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Error al enviar el email" });
  }
};

export const descargarRecibo = async (req, res) => {
  try {
    const { codigo } = req.params;
    const nombreArchivo = `recibo-${codigo}.pdf`;
    const filepath = path.join(RECIBOS_DIR, nombreArchivo);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ msg: "El archivo no existe" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
    return res.download(filepath);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Error al descargar el archivo" });
  }
};


export const verReciboInlineByCodigo = async (req, res) => {
  const { codigo } = req.params;
  const nombreArchivo = `recibo-${codigo}.pdf`;
  const filepath = path.join(RECIBOS_DIR, nombreArchivo);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ msg: "Recibo no encontrado." });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="Recibo ${codigo}.pdf"`);
  res.setHeader("Cache-Control", "no-store");

  return fs.createReadStream(filepath).pipe(res);
};

export const verReciboInlinePorLink = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ msg: "Falta token" });

    const payload = jwt.verify(token, JWT_SECRET); 
    const { codigo } = payload;

    const nombreArchivo = `recibo-${codigo}.pdf`;
    const filepath = path.join(RECIBOS_DIR, nombreArchivo);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ msg: "Recibo no encontrado." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Recibo ${codigo}.pdf"`);
    res.setHeader("Cache-Control", "no-store");

    return fs.createReadStream(filepath).pipe(res);
  } catch (e) {
    if (e.name === "TokenExpiredError") {
      return res.status(401).json({ msg: "Link expirado" });
    }
    return res.status(400).json({ msg: "Token inválido" });
  }
};


export const enviarEmail = async (req, res) => {
  try {
    const { email, asunto, mensaje } = req.body;
    if (!email || !mensaje) {
      return res.status(400).json({ msg: "No se envió el email o el mensaje." });
    }

    const enviado = await enviarEmailNormal({ email, asunto, mensaje });
    if (enviado) {
      return res.status(200).json({ enviado: true, msg: "Email enviado correctamente." });
    } else {
      return res.status(200).json({ enviado: false, msg: "Email enviado erróneamente." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Error al enviar el email." });
  }
};
