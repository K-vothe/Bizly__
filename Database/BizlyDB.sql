
-- =========================================================
-- BIZLY 2.0 - ESQUEMA SAAS MULTITENANT
-- MySQL 8+
-- =========================================================

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
DROP TABLE IF EXISTS empresas;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. TABLA EMPRESAS (Tenants de la plataforma)
CREATE TABLE empresas (
  id_empresa INT AUTO_INCREMENT PRIMARY KEY,
  nombre_empresa VARCHAR(150) NOT NULL,
  nit VARCHAR(30) NULL,
  telefono VARCHAR(30) NULL,
  direccion VARCHAR(255) NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'COP',
  iva DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  umbral_stock INT NOT NULL DEFAULT 10,
  estado ENUM('Activo', 'Inactivo', 'Suspendido') NOT NULL DEFAULT 'Activo',
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_empresas_iva CHECK (iva >= 0 AND iva <= 100),
  CONSTRAINT chk_empresas_umbral CHECK (umbral_stock >= 0)
) ENGINE=InnoDB;

-- 2. TABLA ROLES (3 Niveles de Gobierno)
CREATE TABLE roles (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre_rol VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO roles (id_rol, nombre_rol) VALUES
  (1, 'owner'),        -- Dueño de la empresa (Acceso total, facturación, invitar admins/empleados)
  (2, 'administrador'),-- Administrador operativo (Inventario, ventas, clientes)
  (3, 'empleado');     -- Operativo / Cajero (Solo registra ventas y consulta)

-- 3. TABLA USUARIOS (Aislados por empresa)
CREATE TABLE usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT NOT NULL,
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
  INDEX idx_usuarios_empresa (id_empresa),
  CONSTRAINT fk_usuarios_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE,
  CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
) ENGINE=InnoDB;

-- 4. SESIONES & TOKENS
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
  token CHAR(64) NOT NULL,
  fecha_expiracion DATETIME NOT NULL,
  utilizado TINYINT(1) NOT NULL DEFAULT 0,
  id_usuario INT NOT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recuperacion_usuario (id_usuario),
  INDEX idx_recuperacion_expiracion (fecha_expiracion),
  CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. CATEGORIAS (Unicidad compuesta: el nombre es único SOLO dentro de la misma empresa)
CREATE TABLE categorias (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT NOT NULL,
  nombre_categoria VARCHAR(100) NOT NULL,
  descripcion TEXT NULL,
  estado ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_categoria_empresa UNIQUE (id_empresa, nombre_categoria),
  INDEX idx_categorias_empresa (id_empresa),
  CONSTRAINT fk_categorias_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. PRODUCTOS (Unicidad de SKU por empresa, aislamiento estricto)
CREATE TABLE productos (
  id_producto INT AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT NOT NULL,
  id_categoria INT NULL,
  nombre VARCHAR(150) NOT NULL,
  sku VARCHAR(50) NULL,
  categoria VARCHAR(100) NULL,
  descripcion TEXT NULL,
  precio DECIMAL(12,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  estado ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_productos_precio CHECK (precio >= 0),
  CONSTRAINT chk_productos_stock CHECK (stock >= 0),
  CONSTRAINT uq_productos_sku_empresa UNIQUE (id_empresa, sku),
  INDEX idx_productos_empresa (id_empresa),
  INDEX idx_productos_nombre (id_empresa, nombre),
  INDEX idx_productos_estado_stock (id_empresa, estado, stock),
  CONSTRAINT fk_productos_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE,
  CONSTRAINT fk_productos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. CLIENTES (Unicidad de Documento por empresa)
CREATE TABLE clientes (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT NOT NULL,
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
  CONSTRAINT uq_clientes_documento_empresa UNIQUE (id_empresa, tipo_doc, documento),
  INDEX idx_clientes_empresa (id_empresa),
  CONSTRAINT fk_clientes_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. VENTAS Y DETALLES (Aisladas por empresa)
CREATE TABLE ventas (
  id_venta INT AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT NOT NULL,
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
  INDEX idx_ventas_empresa_fecha (id_empresa, fecha_venta),
  INDEX idx_ventas_empresa_estado (id_empresa, estado),
  CONSTRAINT fk_ventas_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE,
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  CONSTRAINT fk_ventas_usuario_anulacion FOREIGN KEY (id_usuario_anulacion) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE detalle_ventas (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_venta INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(14,2) NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL,
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_detalle_importes CHECK (precio_unitario >= 0 AND subtotal >= 0),
  INDEX idx_detalle_venta (id_venta),
  INDEX idx_detalle_producto (id_producto),
  CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
) ENGINE=InnoDB;

-- 9. AUDITORÍA MULTITENANT
CREATE TABLE auditoria (
  id_auditoria BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT NOT NULL,
  id_usuario INT NULL,
  accion VARCHAR(50) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  INDEX idx_auditoria_empresa_fecha (id_empresa, fecha),
  CONSTRAINT fk_auditoria_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE,
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 10. DATOS SEMILLA (EMPRESA DEMO Y SUS REGISTROS)
INSERT INTO empresas (id_empresa, nombre_empresa, nit, telefono, direccion, moneda, iva, umbral_stock)
VALUES (1, 'Ferretería El Tornillo Demo', '900123456-1', '3001234567', 'Calle 100 # 15-20', 'COP', 19.00, 5);

INSERT INTO categorias (id_categoria, id_empresa, nombre_categoria, descripcion) VALUES
  (1, 1, 'Herramientas Eléctricas', 'Taladros, pulidoras y sierras'),
  (2, 1, 'Tornillería y Fijación', 'Tornillos, tuercas y chazos'),
  (3, 1, 'Pinturas y Acabados', 'Esmaltes y brochas');

INSERT INTO productos (id_empresa, id_categoria, nombre, sku, categoria, descripcion, precio, stock) VALUES
  (1, 1, 'Taladro Percutor 650W', 'FERR-001', 'Herramientas Eléctricas', 'Taladro de uso profesional', 280000, 8),
  (1, 2, 'Caja Tornillo Drywall 1 1/2 pulg', 'FERR-002', 'Tornillería y Fijación', 'Caja x 100 unidades', 15000, 45),
  (1, 3, 'Galón Pintura Blanca Tipo 1', 'FERR-003', 'Pinturas y Acabados', 'Galón lavable para interior', 65000, 3);