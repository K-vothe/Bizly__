import dotenv from 'dotenv';
import app from './app';
import { testConnection } from './config/db';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer(): Promise<void> {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`[Bizly] Servidor iniciado y escuchando en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('[Bizly] Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();

export { startServer };
