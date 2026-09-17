-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: bizly
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auditoria`
--

DROP TABLE IF EXISTS `auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria` (
  `id_auditoria` int NOT NULL AUTO_INCREMENT,
  `accion` varchar(200) DEFAULT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `descripcion` text,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_usuario` int DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_auditoria`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `auditoria_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria`
--

LOCK TABLES `auditoria` WRITE;
/*!40000 ALTER TABLE `auditoria` DISABLE KEYS */;
INSERT INTO `auditoria` VALUES (1,'Actualizó','Company','Actualizó configuración de la empresa','2026-06-12 03:34:48',NULL,NULL,NULL),(2,'Actualizó','Company','Actualizó configuración de la empresa','2026-06-12 03:35:12',NULL,NULL,NULL),(3,'Creó','Sale','Registró venta VTA-000001 por $12.500.000','2026-06-12 03:35:31',NULL,NULL,NULL),(4,'Creó','Product','Creó producto: leche','2026-06-12 14:11:52',NULL,NULL,NULL),(5,'Anuló','Sale','Anuló venta VTA-000001','2026-06-12 14:40:38',NULL,NULL,NULL),(6,'Creó','Product','Creó producto: Naranjas','2026-06-12 14:45:40',NULL,NULL,NULL),(7,'Actualizó','Product','Editó producto: Naranjas','2026-06-12 14:49:17',NULL,NULL,NULL),(8,'Eliminó','Product','Eliminó producto: leche','2026-06-26 15:23:45',NULL,NULL,NULL),(9,'Eliminó','Product','Eliminó producto: Naranjas','2026-06-26 15:23:53',NULL,NULL,NULL),(10,'Creó','Product','Creó producto: Leche','2026-06-26 15:29:39',NULL,NULL,NULL),(11,'Creó','Product','Creó producto: mouse','2026-06-26 15:46:03',NULL,NULL,NULL),(12,'Creó','Product','Creó producto: jj','2026-06-26 15:46:16',NULL,NULL,NULL),(13,'Creó','Product','Creó producto: y','2026-06-26 15:56:47',NULL,NULL,NULL),(14,'Creó','Product','Creó producto: a','2026-06-26 16:00:56',NULL,NULL,NULL),(15,'Creó','Product','Creó producto: a','2026-06-26 16:01:12',NULL,NULL,NULL),(16,'Creó','Product','Creó producto: h','2026-06-26 16:02:23',NULL,NULL,NULL),(17,'Creó','Product','Creó producto: h','2026-06-26 16:02:37',NULL,NULL,NULL),(18,'Creó','Product','Creó producto: a','2026-06-26 16:05:08',NULL,NULL,NULL),(19,'Creó','Product','Creó producto: a','2026-06-26 16:06:37',NULL,NULL,NULL),(20,'Eliminó','Product','Eliminó producto: a','2026-06-26 16:09:11',NULL,NULL,NULL),(21,'Eliminó','Product','Eliminó producto: a','2026-06-26 16:09:13',NULL,NULL,NULL),(22,'Eliminó','Product','Eliminó producto: a','2026-06-26 16:09:14',NULL,NULL,NULL),(23,'Eliminó','Product','Eliminó producto: a','2026-06-26 16:09:17',NULL,NULL,NULL),(24,'Eliminó','Product','Eliminó producto: h','2026-06-26 16:09:21',NULL,NULL,NULL),(25,'Eliminó','Product','Eliminó producto: h','2026-06-26 16:09:22',NULL,NULL,NULL),(26,'Eliminó','Product','Eliminó producto: jj','2026-06-26 16:09:25',NULL,NULL,NULL),(27,'Eliminó','Product','Eliminó producto: y','2026-06-26 16:09:29',NULL,NULL,NULL),(28,'Actualizó','Product','Editó producto: MouseHp G312','2026-06-26 21:20:58',NULL,NULL,NULL),(29,'Actualizó','Product','Editó producto: Mouse Hp G312','2026-06-26 21:22:00',NULL,NULL,NULL),(30,'Actualizó','Company','Actualizó configuración de la empresa','2026-06-27 03:00:21',NULL,NULL,NULL),(31,'Verificó','Auth','Verificó su correo electrónico','2026-09-17 04:55:54',3,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36');
/*!40000 ALTER TABLE `auditoria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id_categoria` int NOT NULL AUTO_INCREMENT,
  `nombre_categoria` varchar(100) NOT NULL,
  `descripcion` text,
  PRIMARY KEY (`id_categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (1,'Tecnología','Productos tecnológicos'),(2,'Accesorios','Accesorios varios'),(3,'Oficina','Artículos de oficina');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `correo` varchar(150) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `total_compras` decimal(12,2) DEFAULT '0.00',
  `num_compras` int DEFAULT '0',
  `tipo_doc` varchar(10) DEFAULT 'CC',
  `documento` varchar(20) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cliente`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (1,'Juan','Pérez','juan@gmail.com','3001234567',12500000.00,1,'CC',NULL,'Activo',NULL,'2026-06-10 21:30:32'),(2,'María','Gómez','maria@gmail.com','3007654321',0.00,0,'CC',NULL,'Activo',NULL,'2026-06-10 21:30:32');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalle_ventas`
--

DROP TABLE IF EXISTS `detalle_ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_ventas` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `id_venta` int DEFAULT NULL,
  `id_producto` int DEFAULT NULL,
  PRIMARY KEY (`id_detalle`),
  KEY `id_venta` (`id_venta`),
  KEY `id_producto` (`id_producto`),
  CONSTRAINT `detalle_ventas_ibfk_1` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`),
  CONSTRAINT `detalle_ventas_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_ventas`
--

LOCK TABLES `detalle_ventas` WRITE;
/*!40000 ALTER TABLE `detalle_ventas` DISABLE KEYS */;
INSERT INTO `detalle_ventas` VALUES (1,5,2500000.00,12500000.00,1,1);
/*!40000 ALTER TABLE `detalle_ventas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id_producto` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `sku` varchar(50) DEFAULT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `descripcion` text,
  `precio` decimal(10,2) NOT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_categoria` int DEFAULT NULL,
  PRIMARY KEY (`id_producto`),
  KEY `id_categoria` (`id_categoria`),
  CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (1,'Laptop Lenovo',NULL,NULL,'Portátil empresarial',2500000.00,10,'2026-06-10 21:30:32',1),(2,'Mouse Inalámbrico',NULL,NULL,'Mouse USB',50000.00,30,'2026-06-10 21:30:32',2),(3,'Cuaderno Ejecutivo',NULL,NULL,'Cuaderno para oficina',15000.00,50,'2026-06-10 21:30:32',3),(6,'Mouse Hp G312','MOU002','Electronica',NULL,35000.00,15,'2026-06-26 15:29:39',NULL),(7,'mouse','','',NULL,0.00,0,'2026-06-26 15:46:03',NULL);
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id_rol` int NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(50) NOT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre_rol` (`nombre_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin'),(2,'empleado');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sesiones`
--

DROP TABLE IF EXISTS `sesiones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sesiones` (
  `id_sesion` char(36) NOT NULL,
  `id_usuario` int NOT NULL,
  `token_hash` char(64) NOT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` datetime NOT NULL,
  `revocado` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_revocacion` datetime DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_sesion`),
  KEY `idx_sesiones_usuario` (`id_usuario`),
  KEY `idx_sesiones_expiracion` (`fecha_expiracion`),
  CONSTRAINT `fk_sesiones_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sesiones`
--

LOCK TABLES `sesiones` WRITE;
/*!40000 ALTER TABLE `sesiones` DISABLE KEYS */;
INSERT INTO `sesiones` VALUES ('faf71eff-5161-44cd-9ede-47491a80b77b',3,'da9aba7c7c6e9157018bea461a0f172922c150371525f89b0761714e51d1839b','2026-09-17 04:55:54','2026-09-23 23:55:55',0,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36');
/*!40000 ALTER TABLE `sesiones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tokens_recuperacion`
--

DROP TABLE IF EXISTS `tokens_recuperacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens_recuperacion` (
  `id_token` int NOT NULL AUTO_INCREMENT,
  `token` varchar(255) NOT NULL,
  `fecha_expiracion` datetime DEFAULT NULL,
  `utilizado` tinyint(1) DEFAULT '0',
  `id_usuario` int DEFAULT NULL,
  PRIMARY KEY (`id_token`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `tokens_recuperacion_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tokens_recuperacion`
--

LOCK TABLES `tokens_recuperacion` WRITE;
/*!40000 ALTER TABLE `tokens_recuperacion` DISABLE KEYS */;
INSERT INTO `tokens_recuperacion` VALUES (1,'982757','2026-06-11 23:28:10',1,2),(2,'660846','2026-06-11 23:46:09',0,3),(3,'442071','2026-06-12 09:52:20',1,7);
/*!40000 ALTER TABLE `tokens_recuperacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tokens_verificacion`
--

DROP TABLE IF EXISTS `tokens_verificacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens_verificacion` (
  `id_token` int NOT NULL AUTO_INCREMENT,
  `token_hash` char(64) NOT NULL,
  `fecha_expiracion` datetime NOT NULL,
  `utilizado` tinyint(1) NOT NULL DEFAULT '0',
  `id_usuario` int NOT NULL,
  PRIMARY KEY (`id_token`),
  KEY `idx_tokens_verificacion_usuario` (`id_usuario`),
  KEY `idx_tokens_verificacion_expiracion` (`fecha_expiracion`),
  CONSTRAINT `fk_tokens_verificacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tokens_verificacion`
--

LOCK TABLES `tokens_verificacion` WRITE;
/*!40000 ALTER TABLE `tokens_verificacion` DISABLE KEYS */;
INSERT INTO `tokens_verificacion` VALUES (3,'7f1b601772f33e9a92ba0ea766042593fa032dfd0842e0bd4eb050ba527a1c49','2026-09-17 00:05:21',1,3);
/*!40000 ALTER TABLE `tokens_verificacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `foto_perfil` varchar(255) DEFAULT NULL,
  `estado` enum('Activo','Inactivo') DEFAULT 'Activo',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_rol` int NOT NULL,
  `correo_verificado` tinyint(1) NOT NULL DEFAULT '0',
  `acepta_tratamiento` tinyint(1) NOT NULL DEFAULT '0',
  `version_politica` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_consentimiento` datetime DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`),
  KEY `id_rol` (`id_rol`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Admin','Bizly','admin@bizly.com','123456',NULL,'Activo','2026-06-10 21:30:32',1,0,0,0,NULL),(2,'Hainer','Paez','oreocon1litrodeleche@gmail.com','$2b$10$nR3x.umPpYJoBp76nZdLvOqXwo6Aeji5EQvalLdil/FQepjKecVeS',NULL,'Activo','2026-06-12 04:10:50',1,0,0,0,NULL),(3,'Andres','Diaz','2006andresdiaz@gmail.com','$2b$12$ZpZwjUfMEOMxaRmRZAzoJ.sL8PX085p/uoygE.opKloFq9kbGnIPm',NULL,'Activo','2026-06-12 04:30:54',2,1,1,1,'2026-09-16 23:50:21'),(4,'Maria','Blanco','acoldboy722@gmail.com','$2b$10$iRAw.Tx.K8LNGQyOVLoQX.NmHzliiAxGeItZzFkL0PY16iimhQbxq',NULL,'Activo','2026-06-12 05:29:06',2,0,0,0,NULL),(5,'jhoan','agudelo','sebastianagudelo072@gmail.com','$2b$10$nxECfle4qwbfg7KpvqN0wuSmi58YumsLtf2RBXgIc2JuUAVgneXt6',NULL,'Activo','2026-06-12 06:23:15',2,0,0,0,NULL),(6,'cris','ballen','cristiandbc2@gmail.com','$2b$10$zeeJRQh54cV0BJ2QNoCPpOWzKV4C9YhGQdSZmjleb0A47wceFStRq',NULL,'Activo','2026-06-12 14:09:18',2,0,0,0,NULL),(7,'Freddy','Ardila','freddycardila@gmail.com','$2b$10$uFx9CsdYhJaqYnQNcxY7SeTBbMZs/QSkpdtNkFkUCf3VvreV6WHXO',NULL,'Activo','2026-06-12 14:28:39',2,0,0,0,NULL),(8,'Sayeth','Medina','sayethbermudez030@gmail.com','$2b$10$3AXjSM/CjlYzsvXCcS3kpuI/jM/IsApKG0zZNmVGoI52FClJWDxmS',NULL,'Activo','2026-06-26 17:21:41',2,0,0,0,NULL),(9,'Andres','Diaz','go087447@gmail.com','$2b$10$ghfphGZOyMzib0qqfqjjGum02l.vJJnvuHK6dJBsBMOAVoSS03qqu',NULL,'Activo','2026-06-26 21:19:38',2,0,0,0,NULL);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ventas`
--

DROP TABLE IF EXISTS `ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ventas` (
  `id_venta` int NOT NULL AUTO_INCREMENT,
  `fecha_venta` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `impuesto` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `estado` varchar(20) DEFAULT 'completada',
  `cliente_nombre` varchar(200) DEFAULT NULL,
  `metodo_pago` varchar(50) DEFAULT NULL,
  `id_cliente` int DEFAULT NULL,
  `id_usuario` int DEFAULT NULL,
  PRIMARY KEY (`id_venta`),
  KEY `id_cliente` (`id_cliente`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `ventas_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ventas`
--

LOCK TABLES `ventas` WRITE;
/*!40000 ALTER TABLE `ventas` DISABLE KEYS */;
INSERT INTO `ventas` VALUES (1,'2026-06-12 03:35:31',10504201.68,1995798.32,12500000.00,'anulada','Juan Pérez','Efectivo',1,NULL);
/*!40000 ALTER TABLE `ventas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'bizly'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-17  0:07:26
