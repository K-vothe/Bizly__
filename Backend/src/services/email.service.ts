import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import AppError from '../utils/AppError';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const enviarCorreoOTP = async (destino: string, codigo: string) => {
  try {
    const mailOptions = {
      from: `"BIZLY Seguridad" <${process.env.SMTP_USER}>`,
      to: destino,
      subject: 'Tu código de verificación de BIZLY',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; text-align: center;">Verificación de Cuenta</h2>
          <p style="color: #475569; font-size: 16px;">Usa el siguiente código de 6 dígitos para continuar. Expira en 15 minutos.</p>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0284c7;">${codigo}</span>
          </div>
          <p style="color: #64748b; font-size: 14px; text-align: center;">Si no solicitaste este código, puedes ignorar este correo.</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error enviando correo SMTP:', error);
    throw new AppError('No se pudo enviar el correo de verificación. Revisa la configuración SMTP.', 500);
  }
};

export default {
  enviarCorreoOTP,
};
