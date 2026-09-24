const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../dist/config/db');
const app = require('../dist/app').default;

async function runAdversarialTests() {
  console.log('=== INICIANDO SUITE DE PRUEBAS ADVERSARIALES BIZLY ===\n');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[Test Server] Servidor de prueba escuchando en el puerto ${port}`);

  try {
    // 1. Configurar o asegurar Tenant de prueba
    console.log('[Setup] Verificando empresa de pruebas...');
    let [empresas] = await pool.query('SELECT * FROM empresas LIMIT 1');
    let id_empresa;
    if (empresas.length === 0) {
      const [resEmpresa] = await pool.query(
        "INSERT INTO empresas (nombre_empresa, nit, telefono, direccion, correo, iva, plan) VALUES ('Empresa Test', '900000001-1', '3000000000', 'Calle Test', 'test@empresa.com', 19, 'Starter')"
      );
      id_empresa = resEmpresa.insertId;
    } else {
      id_empresa = empresas[0].id_empresa;
    }

    // Configurar explícitamente el plan a 'Starter'
    await pool.query("UPDATE empresas SET plan = 'Starter' WHERE id_empresa = ?", [id_empresa]);
    console.log(`[Setup] Empresa ID ${id_empresa} configurada con plan 'Starter'.`);

    // Crear o recuperar usuario admin/owner
    let [usuarios] = await pool.query('SELECT * FROM usuarios WHERE id_empresa = ? AND id_rol = 1 LIMIT 1', [id_empresa]);
    let id_usuario;
    let correo_usuario;
    if (usuarios.length === 0) {
      const [resUser] = await pool.query(
        "INSERT INTO usuarios (nombre, apellido, correo, password, estado, id_rol, id_empresa, correo_verificado, acepta_tratamiento) VALUES ('Tester', 'Admin', 'tester@empresa.com', 'hashedpass', 'Activo', 1, ?, 1, 1)",
        [id_empresa]
      );
      id_usuario = resUser.insertId;
      correo_usuario = 'tester@empresa.com';
    } else {
      id_usuario = usuarios[0].id_usuario;
      correo_usuario = usuarios[0].correo;
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: id_usuario,
        id_empresa: id_empresa,
        rol: 'owner',
        correo: correo_usuario,
      },
      process.env.JWT_SECRET || 'JAJBJCJD',
      { expiresIn: '1h' }
    );
    console.log(`[Setup] Token JWT generado para usuario ID ${id_usuario} (rol: owner).`);

    // =========================================================================
    // PRUEBA 1: LÍMITES SAAS (Límite de productos en plan Starter)
    // =========================================================================
    console.log('\n--- PRUEBA 1: VERIFICACIÓN DE LÍMITES SAAS (Plan Starter max 50) ---');

    // Contar productos actuales
    const [prodCountRows] = await pool.query(
      "SELECT COUNT(*) AS total FROM productos WHERE id_empresa = ? AND (estado != 'Inactivo' OR estado IS NULL)",
      [id_empresa]
    );
    let totalProductos = prodCountRows[0].total;
    console.log(`[Prueba 1] Productos actuales activos en tenant: ${totalProductos}`);

    // Insertar productos hasta llegar a 50 si faltan
    if (totalProductos < 50) {
      const faltantes = 50 - totalProductos;
      console.log(`[Prueba 1] Insertando ${faltantes} producto(s) para alcanzar el límite de 50...`);
      for (let i = 1; i <= faltantes; i++) {
        await pool.query(
          "INSERT INTO productos (id_empresa, nombre, precio, stock, estado, id_categoria) VALUES (?, ?, 1000, 10, 'Activo', NULL)",
          [id_empresa, `Producto Test Llenado ${i}`]
        );
      }
      totalProductos = 50;
    }

    console.log(`[Prueba 1] Tenant ahora tiene ${totalProductos} productos. Intentando crear el producto 51 vía POST /api/productos...`);

    const resProd51 = await fetch(`${baseUrl}/api/productos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nombre: 'Producto Excedente 51',
        precio: 5000,
        stock: 5,
      }),
    });

    const bodyProd51 = await resProd51.json();
    console.log(`[Prueba 1] Código HTTP recibido: ${resProd51.status}`);
    console.log(`[Prueba 1] Respuesta JSON:`, bodyProd51);

    if (resProd51.status === 402 && bodyProd51.code === 'PLAN_LIMIT_REACHED') {
      console.log('✅ [PRUEBA 1 PASÓ]: HTTP 402 Payment Required con código PLAN_LIMIT_REACHED retornado correctamente.');
    } else {
      throw new Error(`❌ [PRUEBA 1 FALLÓ]: Se esperaba status 402 y code PLAN_LIMIT_REACHED, recibido status ${resProd51.status}`);
    }

    // Probar también importación masiva que exceda límite
    console.log('[Prueba 1b] Probando importación masiva que excede límite vía POST /api/productos/importar...');
    const resImport = await fetch(`${baseUrl}/api/productos/importar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productos: [
          { nombre: 'Import 1', precio: 100, stock: 1 },
          { nombre: 'Import 2', precio: 200, stock: 2 }
        ],
      }),
    });
    const bodyImport = await resImport.json();
    console.log(`[Prueba 1b] Código HTTP recibido para importación: ${resImport.status}`);
    if (resImport.status === 402 && bodyImport.code === 'PLAN_LIMIT_REACHED') {
      console.log('✅ [PRUEBA 1b PASÓ]: Importación masiva bloqueada por límite con HTTP 402.');
    } else {
      throw new Error(`❌ [PRUEBA 1b FALLÓ]: Importación masiva no bloqueó con 402. Status: ${resImport.status}`);
    }

    // =========================================================================
    // PRUEBA 2: TRAZABILIDAD Y AUDITORÍA (Anulación de venta)
    // =========================================================================
    console.log('\n--- PRUEBA 2: VERIFICACIÓN DE AUDITORÍA Y TRAZABILIDAD ---');

    // Asegurar un producto con stock para vender
    const [prods] = await pool.query(
      "SELECT id_producto, nombre, precio, stock FROM productos WHERE id_empresa = ? AND stock > 0 AND (estado != 'Inactivo' OR estado IS NULL) LIMIT 1",
      [id_empresa]
    );
    if (prods.length === 0) {
      throw new Error('No hay productos con stock para realizar la venta de prueba');
    }
    const productoVenta = prods[0];
    console.log(`[Prueba 2] Usando producto ID ${productoVenta.id_producto} (${productoVenta.nombre}) con stock ${productoVenta.stock}`);

    // Crear una venta vía POST /api/ventas
    console.log('[Prueba 2] Creando venta de prueba vía POST /api/ventas...');
    const resVenta = await fetch(`${baseUrl}/api/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        metodo_pago: 'Efectivo',
        items: [
          {
            id_producto: productoVenta.id_producto,
            cantidad: 1,
          },
        ],
      }),
    });

    const bodyVenta = await resVenta.json();
    if (resVenta.status !== 201) {
      throw new Error(`Fallo al crear venta de prueba: ${JSON.stringify(bodyVenta)}`);
    }
    const id_venta = bodyVenta.venta?.id_venta || bodyVenta.id_venta || bodyVenta.id;
    console.log(`[Prueba 2] Venta creada exitosamente con ID: ${id_venta}`);

    // Anular la venta vía PUT /api/ventas/:id/anular
    console.log(`[Prueba 2] Anulando venta ID ${id_venta} vía PUT /api/ventas/${id_venta}/anular...`);
    const resAnular = await fetch(`${baseUrl}/api/ventas/${id_venta}/anular`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        motivo: 'Prueba adversarial de anulación y auditoría',
      }),
    });

    const bodyAnular = await resAnular.json();
    console.log(`[Prueba 2] Código HTTP anulación: ${resAnular.status}`, bodyAnular);
    if (resAnular.status !== 200) {
      throw new Error(`Fallo al anular venta: ${JSON.stringify(bodyAnular)}`);
    }

    // Esperar 400ms para asegurar persistencia asíncrona de setImmediate
    await new Promise((r) => setTimeout(r, 400));

    // Consultar directamente la base de datos MySQL tabla auditoria
    console.log('[Prueba 2] Consultando tabla `auditoria` en MySQL directamente...');
    const [auditRows] = await pool.query(
      `SELECT * FROM auditoria 
       WHERE id_empresa = ? AND modulo = 'VENTAS' AND accion = 'ANULACIÓN DE VENTA' 
       ORDER BY id_auditoria DESC LIMIT 1`,
      [id_empresa]
    );

    if (auditRows.length === 0) {
      throw new Error('❌ [PRUEBA 2 FALLÓ]: No se encontró ningún registro en tabla auditoria para ANULACIÓN DE VENTA');
    }

    const auditRecord = auditRows[0];
    console.log('[Prueba 2] Registro de auditoría encontrado en MySQL:', {
      id_auditoria: auditRecord.id_auditoria,
      id_usuario: auditRecord.id_usuario,
      id_empresa: auditRecord.id_empresa,
      modulo: auditRecord.modulo,
      accion: auditRecord.accion,
      detalles: auditRecord.detalles,
      fecha: auditRecord.fecha,
    });

    // Validar endpoint GET /api/auditoria
    console.log('[Prueba 2] Verificando endpoint GET /api/auditoria...');
    const resAuditEndpoint = await fetch(`${baseUrl}/api/auditoria?limit=10`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const bodyAuditEndpoint = await resAuditEndpoint.json();
    const listaAudit = bodyAuditEndpoint.auditoria || bodyAuditEndpoint.auditorias || [];
    console.log(`[Prueba 2] Endpoint GET /api/auditoria status: ${resAuditEndpoint.status}, total registros devueltos: ${listaAudit.length}`);

    if (resAuditEndpoint.status === 200 && listaAudit.some((a) => a.accion === 'ANULACIÓN DE VENTA')) {
      console.log('✅ [PRUEBA 2 PASÓ]: Registro de auditoría verificado tanto en base de datos MySQL como a través del endpoint GET /api/auditoria.');
    } else {
      throw new Error('❌ [PRUEBA 2 FALLÓ]: El endpoint GET /api/auditoria no devolvió la anulación registrada.');
    }

    console.log('\n========================================================');
    console.log('🎉 TODAS LAS PRUEBAS ADVERSARIALES PASARON CON ÉXITO 100%');
    console.log('========================================================\n');
  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS ADVERSARIALES:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
}

runAdversarialTests();
