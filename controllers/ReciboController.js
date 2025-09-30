import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PdfPrinter from "pdfmake";
import { enviarEmailConLink, enviarEmailNormal } from "../utils/enviarEmailAdjunto.js";
import { url } from "inspector";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generarReciboVenta = async (req, res) => {
  try {
    const venta = req.body;
    // console.log("Body recibido:", venta);

    if (!venta || !venta.codigo) {
      return res.status(400).json({ error: "Datos de la venta incompletos" });
    }

    const nombreArchivo = `recibo-${venta.codigo}.pdf`;
    const filepath = path.join(__dirname, `../public/recibos`, nombreArchivo);
    const urlPublica = `${req.protocol}://${req.get(
      "host"
    )}/public/recibos/${nombreArchivo}`;

    if (fs.existsSync(filepath)) {
       return res.json({
        ok: true,
        msg: "Archivo ya existente",
        url: urlPublica,
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

    const docDefinition = {
      pageMargins: [40, 20, 40, 40],
      content: [
        {
          columns: [
            {
              image: "logo", // imagen en base64
              width: 120,
              alignment: "left",
              margin: [0, 0, 0, 0],
            },
            {
              width: "*", // espacio intermedio (opcional)
              text: "",
            },
            {
              stack: [
                { text: "iClub Catamarca", bold: true, fontSize: 13 },
                {
                  text: "Intendente Yamil Fadel\nesq. Illia s/n",
                  fontSize: 10,
                },
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
                `${venta.cliente.nombre} ${venta.cliente.apellido}\n`,
                { text: "Email: ", bold: true },
                `${venta.cliente.email}\n`,
                { text: "Teléfono: ", bold: true },
                `${venta.cliente.telefono}`,
              ],
              fontSize: 10,
            },
            {
              text: [
                { text: "Fecha: ", bold: true },
                `${new Date(venta.fecha).toLocaleDateString()}`,
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
              ...venta.productos.map((p) => [
                p.nombre,
                { text: p.cantidad.toString(), alignment: "center" },
                {
                  text: `$${parseFloat(p.precio).toFixed(2)}`,
                  alignment: "right",
                },
              ]),
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 60],
        },
        {
          text: `Impuestos: $${parseFloat(venta.impuestos).toFixed(2)}`,
          style: "total",
          alignment: "right",
          margin: [0, 0, 0, 0],
        },
        {
          text: `Descuentos: $${parseFloat(venta.descuento).toFixed(2)}`,
          style: "total",
          alignment: "right",
          margin: [0, 0, 0, 0],
        },

        {
          text: `Total: $${parseFloat(venta.total).toFixed(2)}`,
          style: "total",
          alignment: "right",
          margin: [0, 0, 0, 20],
        },

        {
          text: "Gracias por su compra",
          alignment: "center",
          italics: true,
          fontSize: 11,
          margin: [0, 25, 0, 0],
        },
      ],

      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10],
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          fillColor: "#1e3a8a",
          color: "white",
        },
        total: {
          bold: false,
          fontSize: 12,
        },
      },

      images: {
        logo: `data:image/png;base64,${logoBase64}`,
      },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const stream = fs.createWriteStream(filepath);

    pdfDoc.pipe(stream);
    pdfDoc.end();

    stream.on("finish", () => {
      const urlPublica = `${req.protocol}://${req.get(
        "host"
      )}/recibos/${nombreArchivo}`;
      res.json({
        ok: true,
        mensaje: "Recibo generado correctamente",
        url: urlPublica,
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
  const venta = req.body;
  const urlRecibo = `${process.env.APP_PUBLIC_URL}/recibo-${encodeURIComponent(venta.codigo)}.pdf`;
  const logoUrl = `${process.env.APP_PUBLIC_URL}/public/logoIclub.png`

  const subject = `Tu recibo de compra Iclub - #${venta.codigo}`;
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
        
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="iClub" style="width: 120px;" />
        </div>

        <h2 style="color: #1e40af;">¡Hola ${venta.cliente.nombre}!</h2>
        <p style="font-size: 16px;">
          Gracias por tu compra. Ya generamos tu recibo para que puedas descargarlo o imprimirlo cuando quieras.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${urlRecibo}" target="_blank"
            style="
              background-color: #1e40af;
              color: white;
              text-decoration: none;
              padding: 14px 28px;
              border-radius: 6px;
              font-size: 16px;
              display: inline-block;
            ">
            📄 VER RECIBO
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          Si tenés alguna consulta, no dudes en escribirnos o visitarnos en nuestro local.
        </p>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />

        <div style="font-size: 13px; color: #777;">
          iClub Catamarca<br>
          Intendente Yamil Fadel esq. Illia s/n<br>
          Tel: 3834292951 - 3834345859
        </div>
      </div>
      `

  const ok = await enviarEmailConLink({
    para: venta.cliente.email,
    subject,
    html
  });

  if (ok) {
    return res.json({ ok: true, msg: "Recibo enviado con éxito" });
  } else {
    return res.json({ ok: false, msg: "Falló al enviar el recibo." });
  }
};


export const descargarRecibo = async (req, res) => {
  try {
    const { nombreArchivo } = req.params;
    const filepath = path.join(__dirname, '../public/recibos', nombreArchivo);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ msg: 'El archivo no existe' });
    }

    return res.download(filepath);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al descargar el archivo' });
  }
};

export const enviarEmail = async(req, res) => {
  try {
    const {email, asunto, mensaje} = req.body;

    if (!email || !mensaje) {
      return res.status(400).json({ msg: 'No se envío el email o el mensaje.'})
    }

    const enviado = await enviarEmailNormal({email, asunto, mensaje});

    if (enviado){
      return res.status(200).json({ enviado: true, msg: 'Email enviado correctamente.'})
    } else {
      return res.status(200).json({ enviado: false, msg: 'Email enviado erroneamente.'})
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error al enviar el email.'});
  }
}