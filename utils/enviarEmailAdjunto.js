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

export const enviarEmailConLink = async ({ para, html, subject }) => {
    
    try {
    await transporter.sendMail({
      from: `"iClub" <${process.env.EMAIL}>`,
      to: para,
      subject,
      html
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