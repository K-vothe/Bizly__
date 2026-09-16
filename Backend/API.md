# API REST Bizly 1.1

Base local: `http://localhost:3001`

Las rutas de negocio requieren `Authorization: Bearer <accessToken>`.

## Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/registro` | Crea cuenta de empleado y genera verificación |
| POST | `/auth/verificar-correo` | Verifica código y entrega tokens |
| POST | `/auth/reenviar-verificacion` | Genera nuevo código de verificación |
| POST | `/auth/login` | Inicia sesión |
| POST | `/auth/refresh` | Rota refresh token y renueva access token |
| GET | `/auth/me` | Obtiene usuario de la sesión actual |
| POST | `/auth/logout` | Revoca la sesión actual |
| POST | `/auth/logout-all` | Revoca todas las sesiones del usuario |
| POST | `/auth/recuperar` | Solicita código de recuperación |
| POST | `/auth/reset-password` | Cambia contraseña e invalida sesiones anteriores |
| DELETE | `/auth/cuenta` | Desactiva cuenta con contraseña + `ELIMINAR` |

## Productos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/productos` | Lista productos activos |
| POST | `/productos` | Crea producto |
| PUT | `/productos/:id` | Edita producto |
| DELETE | `/productos/:id` | Desactiva producto |
| POST | `/productos/importar` | Carga masiva hasta 500 productos |

## Clientes

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/clientes` | Lista clientes activos |
| POST | `/clientes` | Crea cliente |
| PUT | `/clientes/:id` | Edita cliente |
| DELETE | `/clientes/:id` | Desactiva cliente |

## Ventas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/ventas` | Lista ventas con detalle |
| POST | `/ventas` | Registra venta dentro de una transacción |
| PUT | `/ventas/:id/anular` | Anula una sola vez y restaura inventario |

## Configuración y reportes

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/configuracion` | autenticado | Lee parámetros del negocio |
| PUT | `/configuracion` | admin | Guarda parámetros |
| GET | `/reportes/resumen?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | autenticado | Reporte parametrizado |

## Administración

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/auditoria` | admin | Actividad del sistema |
| GET | `/usuarios` | admin | Lista segura sin hashes de contraseña |
| PUT | `/usuarios/:id` | admin | Cambia rol/estado |
| DELETE | `/usuarios/:id` | admin | Desactiva usuario |

## Errores

La API responde JSON con la forma:

```json
{ "error": "Descripción legible" }
```

Códigos frecuentes: `400` validación, `401` autenticación, `403` permisos, `404` no encontrado, `409` conflicto/regla de negocio, `429` límite de intentos, `500` error interno.
