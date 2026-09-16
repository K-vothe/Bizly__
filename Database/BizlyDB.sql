-- =========================================================
-- BIZLY 1.1 - ESQUEMA OFICIAL ÚNICO
-- MySQL 8+
-- =========================================================
-- Este archivo reemplaza las versiones SQL duplicadas del proyecto.
-- No contiene contraseñas, correos personales ni tokens reales.

CREATE DATABASE IF NOT EXISTS bizly_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE bizly_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW IF EXISTS v_ventas_diarias;
DROP VIEW IF EXISTS v_top_productos;
DROP VIEW IF EXISTS v_stock_bajo;
DROP PROCEDURE IF EXISTS sp_resumen_ventas;
DROP TABLE IF EXISTS auditoria;
DROP TABLE IF EXISTS detalle_ventas;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS configuracion;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS tokens_recuperacion;
DROP TABLE IF EXISTS tokens_verificacion;
DROP TABLE IF EXISTS sesiones;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS roles;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre_rol VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL DEFAULT '',
  correo VARCHAR(150) NOT NULL,
  password VARCHAR(255) NOT NULL,
  foto_perfil VARCHAR(255) NULL,
  estado ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso DATETIME NULL,
  id_rol INT NOT NULL,
  correo_verificado TINYINT(1) NOT NULL DEFAULT 0,
  intentos_fallidos INT NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  acepta_tratamiento TINYINT(1) NOT NULL DEFAULT 0,
  fecha_consentimiento DATETIME NULL,
  version_politica VARCHAR(20) NULL,
  CONSTRAINT uq_usuarios_correo UNIQUE (correo),
  CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
) ENGINE=InnoDB;

CREATE TABLE sesiones (
  id_sesion CHAR(36) PRIMARY KEY,
  id_usuario INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion DATETIME NOT NULL,
  revocado TINYINT(1) NOT NULL DEFAULT 0,
  fecha_revocacion DATETIME NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  INDEX idx_sesiones_usuario (id_usuario),
  INDEX idx_sesiones_expiracion (fecha_expiracion),
  CONSTRAINT fk_sesiones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tokens_verificacion (
  id_token INT AUTO_INCREMENT PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  fecha_expiracion DATETIME NOT NULL,
  utilizado TINYINT(1) NOT NULL DEFAULT 0,
  id_usuario INT NOT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_verificacion_usuario (id_usuario),
  INDEX idx_verificacion_expiracion (fecha_expiracion),
  CONSTRAINT fk_verificacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tokens_recuperacion (
  id_token INT AUTO_INCREMENT PRIMARY KEY,
  token CHAR(64) NOT NULL COMMENT 'SHA-256 del código de recuperación',
  fecha_expiracion DATETIME NOT NULL,
  utilizado TINYINT(1) NOT NULL DEFAULT 0,
  id_usuario INT NOT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recuperacion_usuario (id_usuario),
  INDEX idx_recuperacion_expiracion (fecha_expiracion),
  CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE categorias (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre_categoria VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT NULL,
  estado ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE productos (
  id_producto INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  sku VARCHAR(50) NULL,
  categoria VARCHAR(100) NULL,
  descripcion TEXT NULL,
  precio DECIMAL(12,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  estado ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  id_categoria INT NULL,
  CONSTRAINT chk_productos_precio CHECK (precio >= 0),
  CONSTRAINT chk_productos_stock CHECK (stock >= 0),
  CONSTRAINT uq_productos_sku UNIQUE (sku),
  INDEX idx_productos_nombre (nombre),
  INDEX idx_productos_categoria_texto (categoria),
  INDEX idx_productos_estado_stock (estado, stock),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE clientes (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NULL,
  correo VARCHAR(150) NULL,
  telefono VARCHAR(30) NULL,
  total_compras DECIMAL(14,2) NOT NULL DEFAULT 0,
  num_compras INT NOT NULL DEFAULT 0,
  tipo_doc VARCHAR(10) NOT NULL DEFAULT 'CC',
  documento VARCHAR(20) NULL,
  estado ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_clientes_total CHECK (total_compras >= 0),
  CONSTRAINT chk_clientes_num CHECK (num_compras >= 0),
  CONSTRAINT uq_clientes_documento UNIQUE (tipo_doc, documento),
  CONSTRAINT uq_clientes_correo UNIQUE (correo),
  INDEX idx_clientes_nombre (nombre, apellido),
  INDEX idx_clientes_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE configuracion (
  id_config TINYINT PRIMARY KEY,
  nombre_negocio VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NULL,
  correo VARCHAR(150) NULL,
  direccion VARCHAR(255) NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'COP',
  iva DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  umbral_stock INT NOT NULL DEFAULT 10,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_config_iva CHECK (iva >= 0 AND iva <= 100),
  CONSTRAINT chk_config_umbral CHECK (umbral_stock >= 0)
) ENGINE=InnoDB;

CREATE TABLE ventas (
  id_venta INT AUTO_INCREMENT PRIMARY KEY,
  fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  impuesto DECIMAL(14,2) NOT NULL DEFAULT 0,
  total DECIMAL(14,2) NOT NULL DEFAULT 0,
  estado ENUM('completada','anulada') NOT NULL DEFAULT 'completada',
  cliente_nombre VARCHAR(200) NULL,
  metodo_pago VARCHAR(50) NOT NULL DEFAULT 'Efectivo',
  id_cliente INT NULL,
  id_usuario INT NULL,
  fecha_anulacion DATETIME NULL,
  id_usuario_anulacion INT NULL,
  CONSTRAINT chk_ventas_total CHECK (subtotal >= 0 AND impuesto >= 0 AND total >= 0),
  INDEX idx_ventas_fecha (fecha_venta),
  INDEX idx_ventas_estado_fecha (estado, fecha_venta),
  INDEX idx_ventas_cliente (id_cliente),
  INDEX idx_ventas_usuario (id_usuario),
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  CONSTRAINT fk_ventas_usuario_anulacion FOREIGN KEY (id_usuario_anulacion) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE detalle_ventas (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(14,2) NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL,
  id_venta INT NOT NULL,
  id_producto INT NOT NULL,
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_detalle_importes CHECK (precio_unitario >= 0 AND subtotal >= 0),
  INDEX idx_detalle_venta (id_venta),
  INDEX idx_detalle_producto (id_producto),
  CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
) ENGINE=InnoDB;

CREATE TABLE auditoria (
  id_auditoria BIGINT AUTO_INCREMENT PRIMARY KEY,
  accion VARCHAR(50) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_usuario INT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  INDEX idx_auditoria_fecha (fecha),
  INDEX idx_auditoria_usuario_fecha (id_usuario, fecha),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Datos base no sensibles
INSERT INTO roles (id_rol, nombre_rol) VALUES
  (1, 'admin'),
  (2, 'empleado');

INSERT INTO categorias (nombre_categoria, descripcion) VALUES
  ('Tecnología', 'Productos tecnológicos'),
  ('Accesorios', 'Accesorios varios'),
  ('Oficina', 'Artículos de oficina');

INSERT INTO configuracion (id_config, nombre_negocio, moneda, iva, umbral_stock)
VALUES (1, 'Mi Tienda', 'COP', 19.00, 10);

INSERT INTO productos (nombre, sku, categoria, descripcion, precio, stock, id_categoria) VALUES
  ('Laptop de demostración', 'TEC-001', 'Tecnología', 'Producto de ejemplo', 2500000, 10, 1),
  ('Mouse inalámbrico', 'ACC-001', 'Accesorios', 'Producto de ejemplo', 50000, 30, 2),
  ('Cuaderno ejecutivo', 'OFI-001', 'Oficina', 'Producto de ejemplo', 15000, 50, 3);

INSERT INTO clientes (nombre, apellido, correo, telefono, tipo_doc, documento)
VALUES
  ('Cliente', 'Demostración Uno', 'cliente1@example.com', '3000000001', 'CC', '100000001'),
  ('Cliente', 'Demostración Dos', 'cliente2@example.com', '3000000002', 'CC', '100000002');

-- Vistas requeridas para consultas rápidas y reportes
CREATE VIEW v_stock_bajo AS
SELECT p.id_producto, p.nombre, p.sku, p.stock, c.umbral_stock
FROM productos p
CROSS JOIN configuracion c
WHERE c.id_config = 1 AND p.estado='Activo' AND p.stock <= c.umbral_stock;

CREATE VIEW v_top_productos AS
SELECT p.id_producto, p.nombre,
       COALESCE(SUM(CASE WHEN v.estado='completada' THEN dv.cantidad ELSE 0 END), 0) AS unidades_vendidas,
       COALESCE(SUM(CASE WHEN v.estado='completada' THEN dv.subtotal ELSE 0 END), 0) AS ingresos
FROM productos p
LEFT JOIN detalle_ventas dv ON dv.id_producto=p.id_producto
LEFT JOIN ventas v ON v.id_venta=dv.id_venta
GROUP BY p.id_producto, p.nombre;

CREATE VIEW v_ventas_diarias AS
SELECT DATE(fecha_venta) AS fecha,
       COUNT(*) AS cantidad_ventas,
       SUM(total) AS ingresos,
       SUM(impuesto) AS impuestos
FROM ventas
WHERE estado='completada'
GROUP BY DATE(fecha_venta);

DELIMITER $$
CREATE PROCEDURE sp_resumen_ventas(IN p_desde DATE, IN p_hasta DATE)
BEGIN
  SELECT
    COUNT(*) AS cantidad_ventas,
    COALESCE(SUM(total), 0) AS ingresos,
    COALESCE(AVG(total), 0) AS ticket_promedio,
    COALESCE(SUM(impuesto), 0) AS impuesto_recaudado
  FROM ventas
  WHERE estado='completada'
    AND DATE(fecha_venta) BETWEEN p_desde AND p_hasta;
END$$
DELIMITER ;

-- IMPORTANTE:
-- No se crea un administrador con contraseña embebida.
-- Después de importar este archivo, configure Backend/.env y ejecute:
--   npm run create-admin
