import dotenv from 'dotenv'
import mysql, { Pool } from 'mysql2/promise'

dotenv.config()

const required: string[] = ['DB_HOST', 'DB_USER', 'DB_NAME']
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[Bizly] Falta ${key} en el archivo .env`)
  }
}

export const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bizly_db',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  queueLimit: 0,
  decimalNumbers: true,
  charset: 'utf8mb4',
})

export async function testConnection(): Promise<void> {
  const connection = await pool.getConnection()
  try {
    await connection.query('SELECT 1')
    console.log('[Bizly] Conexión a MySQL establecida')
  } finally {
    connection.release()
  }
}

export default pool
