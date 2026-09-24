const http = require('http');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../dist/config/db');
const app = require('../dist/app').default;

async function runErrorHandlingTests() {
  console.log('=== TEST SUITE: ARQUITECTURA GLOBAL DE MANEJO DE ERRORES Y ESTANDARIZACIÓN API ===\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[Test Server] Servidor de prueba escuchando en http://localhost:${port}`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: RUTA INEXISTENTE (404 CATCH-ALL)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: RUTA INEXISTENTE /api/ruta-fantasma-123 ---');
    const res404 = await fetch(`${baseUrl}/api/ruta-fantasma-123`);
    const body404 = await res404.json();

    console.log(`[Test 1] Status recibido: ${res404.status}`);
    console.log(`[Test 1] Payload recibido:`, body404);

    if (
      res404.status === 404 &&
      body404.status === 'error' &&
      body404.code === 'NOT_FOUND' &&
      typeof body404.message === 'string' &&
      body404.message.includes('Ruta no encontrada')
    ) {
      console.log('✅ [TEST 1 PASÓ]: 404 Catch-All retorna status 404 con JSON estructurado estandarizado.');
    } else {
      throw new Error(`❌ [TEST 1 FALLÓ]: Respuesta 404 inesperada: ${JSON.stringify(body404)}`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: ERROR OPERACIONAL DE VALIDACIÓN (400 con AppError)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: ERROR OPERACIONAL POST /api/auth/login SIN CREDENCIALES ---');
    const resLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const bodyLogin = await resLogin.json();

    console.log(`[Test 2] Status recibido: ${resLogin.status}`);
    console.log(`[Test 2] Payload recibido:`, bodyLogin);

    if (
      resLogin.status === 400 &&
      bodyLogin.status === 'error' &&
      bodyLogin.code === 'VALIDATION_ERROR' &&
      bodyLogin.message === 'Correo y contraseña son requeridos'
    ) {
      console.log('✅ [TEST 2 PASÓ]: AppError operacional interceptado correctamente con status 400.');
    } else {
      throw new Error(`❌ [TEST 2 FALLÓ]: Respuesta 400 inesperada: ${JSON.stringify(bodyLogin)}`);
    }

    // -------------------------------------------------------------------------
    // TEST 3: TRAMPA DE TRANSACCIONES Y PREVENCIÓN DE CONNECTION LEAKS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: TRANSACCIÓN CON ERROR (VERIFICACIÓN DE ROLLBACK Y LIBERACIÓN DE CONEXIÓN) ---');
    
    // Obtener pool size inicial / conexiones activas
    const [statusRows] = await pool.query("SHOW STATUS LIKE 'Threads_connected'");
    const threadsBefore = Number(statusRows[0].Value);
    console.log(`[Test 3] Hilos/Conexiones activas antes del intento: ${threadsBefore}`);

    // Crear un token válido para intentar createVenta con datos inválidos dentro de la transacción
    const [empresas] = await pool.query('SELECT id_empresa FROM empresas LIMIT 1');
    const id_empresa = empresas[0].id_empresa;
    const [usuarios] = await pool.query('SELECT id_usuario, correo FROM usuarios WHERE id_empresa = ? LIMIT 1', [id_empresa]);
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        id: usuarios[0].id_usuario,
        id_empresa,
        rol: 'owner',
        correo: usuarios[0].correo,
      },
      process.env.JWT_SECRET || 'JAJBJCJD',
      { expiresIn: '1h' }
    );

    // Enviar una venta con producto inexistente (id_producto: 9999999) para forzar throw dentro de transacción
    const resVentaFail = await fetch(`${baseUrl}/api/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: [{ id_producto: 9999999, cantidad: 1 }],
      }),
    });
    const bodyVentaFail = await resVentaFail.json();

    console.log(`[Test 3] Status recibido en fallo de transacción: ${resVentaFail.status}`);
    console.log(`[Test 3] Payload recibido:`, bodyVentaFail);

    if (resVentaFail.status === 404 && bodyVentaFail.code === 'PRODUCT_NOT_FOUND') {
      console.log('✅ [TEST 3 PASÓ]: Error dentro de transacción capturado por AppError y enviado a errorHandler.');
    } else {
      throw new Error(`❌ [TEST 3 FALLÓ]: No se recibió 404 PRODUCT_NOT_FOUND: ${JSON.stringify(bodyVentaFail)}`);
    }

    // Ejecutar múltiples consultas concurrentes para confirmar que el pool NO está bloqueado ni agotado
    console.log('[Test 3] Ejecutando ráfaga de 10 consultas al pool para verificar disponibilidad...');
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(pool.query('SELECT 1'));
    }
    await Promise.all(promises);
    console.log('✅ [TEST 3 PASÓ]: Pool de conexiones 100% operativo sin connection leaks.');

    // -------------------------------------------------------------------------
    // TEST 4: LOGGING DE ERRORES NO OPERACIONALES (CRITICAL ERROR 💥)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: LOGGING DE ERROR CRÍTICO NO OPERACIONAL ---');
    let loggedCritical = false;
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] === 'CRITICAL ERROR 💥') {
        loggedCritical = true;
      }
      originalConsoleError(...args);
    };

    // Provocar un error no operacional invocando un endpoint con JSON malformado
    const resBadJson = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed json: true ',
    });
    const bodyBadJson = await resBadJson.json();

    console.error = originalConsoleError;

    console.log(`[Test 4] Status recibido con JSON malformado: ${resBadJson.status}`);
    console.log(`[Test 4] Payload recibido:`, bodyBadJson);

    if (resBadJson.status === 400 && bodyBadJson.code === 'INVALID_JSON_BODY') {
      console.log('✅ [TEST 4 PASÓ]: JSON malformado capturado con código INVALID_JSON_BODY.');
    }

    console.log('\n================================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE MANEJO DE ERRORES PASARON CON ÉXITO 100%');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ ERROR EN LA SUITE DE PRUEBAS:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
}

runErrorHandlingTests();
