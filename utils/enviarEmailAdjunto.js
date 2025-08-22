import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    },
});

export const enviarEmailConLinkRecibo = async ({ para, nombreCliente, codigo, urlRecibo }) => {
    
    try {
    await transporter.sendMail({
      from: `"iClub" <${process.env.EMAIL}>`,
      to: para,
      subject: `Tu recibo de compra Iclub - #${codigo}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
        
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="http://localhost:5002/public/logoIclub.png" alt="iClub" style="width: 120px;" />
        </div>

        <h2 style="color: #1e40af;">¡Hola ${nombreCliente}!</h2>
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
      `,
    });

    // console.log(`Recibo enviado a ${para}`);
    return true;
  } catch (error) {
    console.error("Error al enviar el email:", error);
    return false;
  }
};

export const enviarEmailNormal = async({ email, asunto, mensaje}) => {
  try {
    await transporter.sendMail({
      from: `"Tienda iClub" <${process.env.EMAIL}>`,
      to: email,
      subject: asunto,
      text: mensaje

    });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}