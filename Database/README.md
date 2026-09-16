# Base de datos oficial de Bizly

La única fuente de verdad del esquema es `../BizlyDB.sql`.

Se eliminaron los scripts SQL duplicados que usaban nombres de columnas incompatibles con el backend. El esquema 1.1 incluye:

- claves primarias y foráneas coherentes;
- índices y restricciones de unicidad;
- SKU y documentos únicos cuando se informan;
- sesiones revocables para JWT;
- bloqueo temporal por intentos fallidos;
- verificación de correo y recuperación con códigos hasheados;
- consentimiento de tratamiento de datos;
- borrado lógico de productos y clientes;
- configuración persistente;
- trazabilidad de anulaciones de ventas;
- auditoría asociada al usuario, IP y agente de usuario;
- vistas y un procedimiento almacenado para reportes.

## Instalación limpia

1. Importe `BizlyDB.sql` en MySQL 8 o superior.
2. Copie `Backend/.env.example` como `Backend/.env` y complete las variables.
3. Desde `Backend`, ejecute `npm install`.
4. Cree el primer administrador con `npm run create-admin`.

El SQL ya no contiene cuentas, contraseñas, tokens ni correos personales del equipo.
