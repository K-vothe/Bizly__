const mysql = require('mysql2/promise');
const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env' });

async function runTests() {
  console.log('=====================================================');
  console.log('PRUEBA 2: EXPLAIN DE LAS CONSULTAS EN MYSQL');
  console.log('=====================================================');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bizly_test',
    port: Number(process.env.DB_PORT || 3306)
  });

  const [explainMetricas] = await pool.query(`
    EXPLAIN SELECT
      COALESCE(SUM(total), 0) AS ventas_totales,
      COALESCE(SUM(subtotal), 0) AS subtotal,
      COALESCE(SUM(impuesto), 0) AS impuestos
    FROM ventas
    WHERE id_empresa = 1
      AND LOWER(estado) != 'anulada'
      AND fecha_venta >= '2026-01-01 00:00:00'
      AND fecha_venta <= '2026-12-31 23:59:59'
  `);

  console.log('EXPLAIN Consulta Agregación Ventas:');
  console.log(explainMetricas);

  const [explainTop] = await pool.query(`
    EXPLAIN SELECT
      p.id_producto,
      p.nombre,
      COALESCE(SUM(dv.cantidad), 0) AS cantidad_vendida
    FROM detalle_ventas dv
    INNER JOIN ventas v ON dv.id_venta = v.id_venta
    INNER JOIN productos p ON dv.id_producto = p.id_producto
    WHERE v.id_empresa = 1
      AND LOWER(v.estado) != 'anulada'
      AND v.fecha_venta >= '2026-01-01 00:00:00'
      AND v.fecha_venta <= '2026-12-31 23:59:59'
    GROUP BY p.id_producto, p.nombre
    ORDER BY cantidad_vendida DESC
    LIMIT 5
  `);

  console.log('\nEXPLAIN Consulta Top Productos (JOIN):');
  console.log(explainTop);

  await pool.end();

  console.log('\n=====================================================');
  console.log('PRUEBA 1: ADVERSARIAL SQL INJECTION EN /api/reportes/resumen');
  console.log('=====================================================');

  // Arrancar servidor Express temporal en puerto libre (ej. 4099)
  const app = require('../dist/app').default || require('../dist/app');
  const server = app.listen(4099);

  const secret = process.env.JWT_SECRET || 'bizly_enterprise_secure_secret_token_2026_@!';
  const token = jwt.sign(
    { id: 1, correo: 'admin@bizly.com', email: 'admin@bizly.com', id_empresa: 1, rol: 'admin' },
    secret,
    { expiresIn: '1h' }
  );

  const sqlInjectionParam = encodeURIComponent("2026-01-01'; DROP TABLE ventas;--");

  const testRequest = (urlPath) => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: 4099,
        path: urlPath,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });

      req.on('error', reject);
      req.end();
    });
  };

  try {
    const maliciousRes = await testRequest(`/api/reportes/resumen?desde=${sqlInjectionParam}&hasta=2026-12-31`);
    console.log('Respuesta ante inyección SQL:', maliciousRes.status, maliciousRes.body);

    if (maliciousRes.status === 400 && maliciousRes.body.includes('INVALID_DATE_FORMAT')) {
      console.log('OK: La inyección SQL fue interceptada con 400 y código INVALID_DATE_FORMAT antes del driver MySQL.');
    } else {
      console.error('FAIL: No se obtuvo el código 400 esperado');
    }

    // Verificar que la tabla ventas sigue intacta
    const poolCheck = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bizly_test',
      port: Number(process.env.DB_PORT || 3306)
    });
    const [checkVentas] = await poolCheck.query('SHOW TABLES LIKE "ventas"');
    if (checkVentas.length > 0) {
      console.log('OK: La tabla ventas continúa existiendo e intacta.');
    } else {
      console.error('FAIL CRÍTICO: La tabla ventas fue eliminada.');
    }

    // Probar petición válida
    const validRes = await testRequest('/api/reportes/resumen?desde=2026-01-01&hasta=2026-12-31');
    console.log('\nRespuesta ante fechas válidas:', validRes.status);
    const parsedValid = JSON.parse(validRes.body);
    console.log('Métricas recibidas:', {
      ventas_totales: parsedValid.ventas_totales,
      subtotal: parsedValid.subtotal,
      impuestos: parsedValid.impuestos,
      serie_tiempo_puntos: parsedValid.serie_tiempo?.length,
      productos_top_conteo: parsedValid.productos_top?.length,
      metodos_pago_conteo: parsedValid.metodos_pago?.length
    });

    // Probar summary de dashboard
    const dashRes = await testRequest('/api/dashboard/summary');
    console.log('\nRespuesta dashboard/summary:', dashRes.status);
    const parsedDash = JSON.parse(dashRes.body);
    console.log('Dashboard summary series de tiempo:', {
      labels: parsedDash.ventasSemana?.labels,
      data: parsedDash.ventasSemana?.data
    });

    await poolCheck.end();
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Error durante las pruebas:', err);
  process.exit(1);
});
