# Bizly 1.1

Bizly es un sistema web académico para gestionar ventas, inventario, clientes, reportes, usuarios y auditoría. Esta versión corrige la integración entre frontend, backend y base de datos y elimina las inconsistencias detectadas en la fase de desarrollo.

## Estructura

- `BizlyDB.sql`: esquema oficial único de MySQL.
- `database/`: notas de instalación de base de datos.
- `bizly-vite/bizly/`: aplicación React/Vite.
- `bizly-vite/bizly/Backend/`: API REST Node/Express.
- `Documentaci#U00f3n Bizly 1.0/`: evidencias ágiles y documentación académica existente.
- `CORRECCIONES_REALIZADAS.md`: resumen técnico de los cambios aplicados.

## Requisitos

- Node.js 18 o superior.
- npm.
- MySQL 8 o superior.

## 1. Base de datos

Importe `BizlyDB.sql` en MySQL. Este es el único esquema que debe usarse.

El archivo no contiene usuarios, contraseñas, tokens ni correos personales. Después de importarlo se debe crear el primer administrador desde el backend.

## 2. Backend

```bash
cd bizly-vite/bizly/Backend
cp .env.example .env
npm install
```

Edite `.env` con la conexión a MySQL y secretos JWT propios. Después cree el administrador inicial:

```bash
npm run create-admin
npm start
```

La API inicia por defecto en `http://localhost:3001`.

### Correo

Para verificación real de cuentas y recuperación de contraseña configure `EMAIL_USER` y `EMAIL_PASS`. En desarrollo puede habilitarse `DEV_SHOW_EMAIL_CODES=true`; nunca debe usarse esa opción en producción.

## 3. Frontend

```bash
cd bizly-vite/bizly
cp .env.example .env
npm install
npm run dev
```

El frontend usa `VITE_API_URL=http://localhost:3001` por defecto.

## Seguridad implementada

- JWT de acceso y refresh token.
- Sesiones almacenadas y revocables.
- Cierre de sesión individual y en todos los dispositivos.
- Middleware de autenticación en rutas de negocio.
- Middleware de roles en auditoría, configuración y usuarios.
- Contraseñas con bcrypt.
- Verificación de correo.
- Recuperación de contraseña con códigos hasheados y expiración.
- Bloqueo temporal tras intentos fallidos.
- Rate limiting básico en autenticación y correos.
- SQL parametrizado y validación de entradas.
- Errores internos de MySQL no se exponen al navegador.
- Auditoría generada por el servidor usando el usuario autenticado.
- `.env` excluido de Git.
- CORS restringible por variable de entorno.
- Cabeceras básicas de seguridad y HSTS en producción.

En producción debe desplegarse detrás de HTTPS y usar secretos largos y aleatorios.

## Reglas de ventas corregidas

El backend ya no confía en precios, totales ni IVA enviados por el navegador. Obtiene precios y configuración desde MySQL, bloquea las filas durante la transacción, verifica stock suficiente y descuenta inventario de forma atómica. Una venta anulada no puede anularse dos veces y la anulación restaura stock y corrige las métricas del cliente.

## Importación masiva

Inventario permite importar CSV de hasta 500 productos. Encabezados mínimos:

```text
nombre,precio,stock
```

Encabezados opcionales:

```text
sku,categoria
```

Si un SKU existente aparece en una carga, el producto se actualiza. Un SKU vacío crea un nuevo producto.

## Legal y privacidad

El registro exige aceptación explícita de términos y política de privacidad. Se guarda la fecha y versión del consentimiento. Los textos académicos de referencia están en:

- `bizly-vite/bizly/public/privacidad.html`
- `bizly-vite/bizly/public/terminos.html`

Antes de un uso comercial real deben ser revisados y adaptados por la organización responsable.

## API

Consulte `bizly-vite/bizly/Backend/API.md` para las rutas principales.
