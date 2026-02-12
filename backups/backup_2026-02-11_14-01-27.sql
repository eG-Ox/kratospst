/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.1.2-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: kratos_1
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo_cliente` enum('natural','juridico') NOT NULL,
  `dni` varchar(8) DEFAULT NULL,
  `ruc` varchar(11) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `razon_social` varchar(150) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `usuario_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`),
  UNIQUE KEY `ruc` (`ruc`),
  KEY `idx_tipo` (`tipo_cliente`),
  KEY `idx_usuario` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `cotizaciones`
--

DROP TABLE IF EXISTS `cotizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cotizaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `cliente_id` int DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `descuento` decimal(10,2) NOT NULL DEFAULT '0.00',
  `nota` text,
  `estado` varchar(30) DEFAULT 'pendiente',
  `serie` varchar(10) DEFAULT NULL,
  `correlativo` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_cliente` (`cliente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cotizaciones`
--

LOCK TABLES `cotizaciones` WRITE;
/*!40000 ALTER TABLE `cotizaciones` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `cotizaciones` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `detalle_cotizacion`
--

DROP TABLE IF EXISTS `detalle_cotizacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_cotizacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cotizacion_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `precio_regular` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `almacen_origen` varchar(30) DEFAULT 'productos',
  PRIMARY KEY (`id`),
  KEY `idx_cotizacion` (`cotizacion_id`),
  KEY `idx_producto` (`producto_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_cotizacion`
--

LOCK TABLES `detalle_cotizacion` WRITE;
/*!40000 ALTER TABLE `detalle_cotizacion` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `detalle_cotizacion` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `detalle_venta`
--

DROP TABLE IF EXISTS `detalle_venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_venta` (
  `id` int NOT NULL AUTO_INCREMENT,
  `venta_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `precio_regular` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `almacen_origen` varchar(30) DEFAULT 'productos',
  PRIMARY KEY (`id`),
  KEY `idx_venta` (`venta_id`),
  KEY `idx_producto` (`producto_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_venta`
--

LOCK TABLES `detalle_venta` WRITE;
/*!40000 ALTER TABLE `detalle_venta` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `detalle_venta` VALUES
(1,1,2,1,600.00,1111.00,600.00,'productos'),
(2,2,2,1,600.00,1111.00,600.00,'productos');
/*!40000 ALTER TABLE `detalle_venta` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `historial_acciones`
--

DROP TABLE IF EXISTS `historial_acciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_acciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entidad` varchar(50) NOT NULL,
  `entidad_id` int DEFAULT NULL,
  `usuario_id` int DEFAULT NULL,
  `accion` varchar(50) NOT NULL,
  `descripcion` text,
  `antes_json` text,
  `despues_json` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entidad` (`entidad`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_fecha` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_acciones`
--

LOCK TABLES `historial_acciones` WRITE;
/*!40000 ALTER TABLE `historial_acciones` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `historial_acciones` VALUES
(1,'usuarios',1,1,'editar','Usuario actualizado (1)','{\"id\":1,\"nombre\":\"Administrador\",\"email\":\"admin@inventario.com\",\"telefono\":\"924659969\",\"contraseña\":\"$2a$10$3F1.WaQnRm5/9jFh.Xydpe6yQIg3tCypBPgxZdSPmTONBnkWR/OFq\",\"rol\":\"admin\",\"activo\":1,\"fecha_creacion\":\"2026-01-26T00:06:07.000Z\",\"fecha_actualizacion\":\"2026-01-28T19:13:01.000Z\"}','{\"id\":1,\"nombre\":\"Administrador\",\"email\":\"admin\",\"telefono\":null,\"rol\":\"admin\",\"activo\":true}','2026-02-09 17:34:01'),
(2,'productos',1,1,'crear','Producto creado (000000)',NULL,'{\"id\":1,\"codigo\":\"000000\",\"tipo_maquina_id\":\"4\",\"marca\":\"PRUEBA\",\"descripcion\":\"PRODUCTO PARA PRUEBAS\",\"ubicacion_letra\":\"H\",\"ubicacion_numero\":1,\"stock\":\"1000000\",\"precio_compra\":\"0\",\"precio_venta\":\"0\",\"precio_minimo\":\"0\"}','2026-02-09 18:12:04'),
(4,'productos',1,1,'editar','Producto actualizado (000000)','{\"id\":1,\"codigo\":\"000000\",\"tipo_maquina_id\":4,\"marca\":\"PRUEBA\",\"descripcion\":\"PRODUCTO PARA PRUEBAS\",\"ubicacion_letra\":\"H\",\"ubicacion_numero\":1,\"stock\":1000000,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T18:12:04.000Z\",\"fecha_actualizacion\":\"2026-02-09T18:12:04.000Z\",\"activo\":1}','{\"id\":\"1\",\"codigo\":\"000000\",\"tipo_maquina_id\":\"3\",\"marca\":\"PRUEBA\",\"descripcion\":\"PRODUCTO PARA PRUEBAS\",\"ubicacion_letra\":\"H\",\"ubicacion_numero\":1,\"stock\":\"1000000\",\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\"}','2026-02-09 18:29:36'),
(5,'tipos_maquinas',7,1,'crear','Tipo de maquina creado (PRUEBA)',NULL,'{\"id\":7,\"nombre\":\"PRUEBA\",\"descripcion\":null}','2026-02-09 18:29:48'),
(6,'productos',1,1,'editar','Producto actualizado (000000)','{\"id\":1,\"codigo\":\"000000\",\"tipo_maquina_id\":3,\"marca\":\"PRUEBA\",\"descripcion\":\"PRODUCTO PARA PRUEBAS\",\"ubicacion_letra\":\"H\",\"ubicacion_numero\":1,\"stock\":1000000,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T18:12:04.000Z\",\"fecha_actualizacion\":\"2026-02-09T18:29:36.000Z\",\"activo\":1}','{\"id\":\"1\",\"codigo\":\"000000\",\"tipo_maquina_id\":\"7\",\"marca\":\"PRUEBA\",\"descripcion\":\"PRODUCTO PARA PRUEBAS\",\"ubicacion_letra\":\"H\",\"ubicacion_numero\":1,\"stock\":\"1000000\",\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\"}','2026-02-09 18:29:51'),
(7,'tipos_maquinas',9,1,'crear','Tipo de maquina creado (METALMECANICA)',NULL,'{\"id\":9,\"nombre\":\"METALMECANICA\",\"descripcion\":\"Creado desde QR\"}','2026-02-09 19:04:08'),
(8,'productos',4,1,'crear','Producto creado (MIG185)',NULL,'{\"id\":4,\"codigo\":\"MIG185\",\"tipo_maquina_id\":\"9\",\"marca\":\"WARC\",\"descripcion\":\"SOLDADORA MIG 185 (Multiproceso) - WARC\",\"ubicacion_letra\":\"A\",\"ubicacion_numero\":1,\"stock\":\"0\",\"precio_compra\":\"0\",\"precio_venta\":\"0\",\"precio_minimo\":\"0\"}','2026-02-09 19:04:08'),
(9,'movimientos',2,1,'ingreso','Movimiento ingreso (4)','{\"stock\":0}','{\"stock\":1,\"cantidad\":1,\"motivo\":\"COMPRA | Guia: Ingresos\"}','2026-02-09 19:04:08'),
(10,'tipos_maquinas',10,1,'crear','Tipo de maquina creado (COMPRESORAS)',NULL,'{\"id\":10,\"nombre\":\"COMPRESORAS\",\"descripcion\":\"Creado desde QR\"}','2026-02-09 19:55:59'),
(11,'productos',5,1,'crear','Producto creado (DXCM805)',NULL,'{\"id\":5,\"codigo\":\"DXCM805\",\"tipo_maquina_id\":\"10\",\"marca\":\"DeWALT\",\"descripcion\":\"COMPRESOR 80 GALONES, PRESION MAXIMA 175 PSI\",\"ubicacion_letra\":\"B\",\"ubicacion_numero\":1,\"stock\":\"0\",\"precio_compra\":\"0\",\"precio_venta\":\"0\",\"precio_minimo\":\"0\"}','2026-02-09 19:55:59'),
(12,'movimientos',3,1,'ingreso','Movimiento ingreso (5)','{\"stock\":0}','{\"stock\":1,\"cantidad\":1,\"motivo\":\"COMPRA | Guia: 6y22\"}','2026-02-09 19:55:59'),
(13,'marcas',30,1,'crear','Marca creada (M0030)',NULL,'{\"id\":30,\"codigo\":\"M0030\",\"nombre\":\"HK-TC\",\"descripcion\":null}','2026-02-09 20:23:26'),
(14,'productos',6,1,'crear','Producto creado (PSN-085)',NULL,'{\"id\":6,\"codigo\":\"PSN-085\",\"tipo_maquina_id\":\"9\",\"marca\":\"Rotake\",\"descripcion\":\"PISTOLA NEUMATICA PESADA DE 1/2″ FERTON PSN085\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":\"0\",\"precio_compra\":\"0\",\"precio_venta\":\"0\",\"precio_minimo\":\"0\"}','2026-02-09 20:33:14'),
(15,'movimientos',4,1,'ingreso','Movimiento ingreso (6)','{\"stock\":0}','{\"stock\":1,\"cantidad\":1,\"motivo\":\"COMPRA | Guia: 5152\"}','2026-02-09 20:33:14'),
(16,'productos',7,1,'crear','Producto creado (RT-019K)',NULL,'{\"id\":7,\"codigo\":\"RT-019K\",\"tipo_maquina_id\":\"9\",\"marca\":\"Rotake\",\"descripcion\":\"JUEGO BOCAS DE IMPACTO ROTAKE 3/4\\\" 10UNDS\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":\"0\",\"precio_compra\":\"0\",\"precio_venta\":\"0\",\"precio_minimo\":\"0\"}','2026-02-09 20:34:47'),
(17,'movimientos',5,1,'ingreso','Movimiento ingreso (7)','{\"stock\":0}','{\"stock\":1,\"cantidad\":1,\"motivo\":\"COMPRA | Guia: 152\"}','2026-02-09 20:34:47'),
(18,'movimientos',6,1,'ingreso','Movimiento ingreso (6)','{\"stock\":1}','{\"stock\":2,\"cantidad\":1,\"motivo\":\"COMPRA | Guia: 152\"}','2026-02-09 20:34:47'),
(19,'productos',8,1,'crear','Producto creado (PSN-12F)',NULL,'{\"id\":8,\"codigo\":\"PSN-12F\",\"tipo_maquina_id\":\"9\",\"marca\":\"Rotake\",\"descripcion\":\"PISTOLA INALÁMBRICA 1\\\" T6 ROTAKE\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":\"0\",\"precio_compra\":\"0\",\"precio_venta\":\"0\",\"precio_minimo\":\"0\"}','2026-02-09 20:35:47'),
(20,'movimientos',7,1,'ingreso','Movimiento ingreso (8)','{\"stock\":0}','{\"stock\":1,\"cantidad\":1,\"motivo\":\"COMPRA | Guia: 1331\"}','2026-02-09 20:35:47'),
(21,'productos',7,30,'desactivar','Producto desactivado (7)','{\"id\":7,\"codigo\":\"RT-019K\",\"tipo_maquina_id\":9,\"marca\":\"Rotake\",\"descripcion\":\"JUEGO BOCAS DE IMPACTO ROTAKE 3/4\\\" 10UNDS\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":1,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T20:34:47.000Z\",\"fecha_actualizacion\":\"2026-02-09T20:34:47.000Z\",\"activo\":1}',NULL,'2026-02-10 14:52:27'),
(26,'productos',8,30,'desactivar','Producto desactivado (8)','{\"id\":8,\"codigo\":\"PSN-12F\",\"tipo_maquina_id\":9,\"marca\":\"Rotake\",\"descripcion\":\"PISTOLA INALÁMBRICA 1\\\" T6 ROTAKE\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":1,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T20:35:47.000Z\",\"fecha_actualizacion\":\"2026-02-09T20:35:47.000Z\",\"activo\":1}',NULL,'2026-02-10 14:52:40'),
(45,'productos',1,30,'desactivar','Producto desactivado (1)','{\"id\":1,\"codigo\":\"000000\",\"tipo_maquina_id\":7,\"marca\":\"PRUEBA\",\"descripcion\":\"PRODUCTO PARA PRUEBAS\",\"ubicacion_letra\":\"H\",\"ubicacion_numero\":1,\"stock\":999999,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T18:12:04.000Z\",\"fecha_actualizacion\":\"2026-02-09T18:59:33.000Z\",\"activo\":1}',NULL,'2026-02-10 15:19:34'),
(46,'productos',5,30,'desactivar','Producto desactivado (5)','{\"id\":5,\"codigo\":\"DXCM805\",\"tipo_maquina_id\":10,\"marca\":\"DeWALT\",\"descripcion\":\"COMPRESOR 80 GALONES, PRESION MAXIMA 175 PSI\",\"ubicacion_letra\":\"B\",\"ubicacion_numero\":1,\"stock\":1,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T19:55:59.000Z\",\"fecha_actualizacion\":\"2026-02-09T19:55:59.000Z\",\"activo\":1}',NULL,'2026-02-10 15:19:41'),
(47,'productos',4,30,'desactivar','Producto desactivado (4)','{\"id\":4,\"codigo\":\"MIG185\",\"tipo_maquina_id\":9,\"marca\":\"WARC\",\"descripcion\":\"SOLDADORA MIG 185 (Multiproceso) - WARC\",\"ubicacion_letra\":\"A\",\"ubicacion_numero\":1,\"stock\":1,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T19:04:08.000Z\",\"fecha_actualizacion\":\"2026-02-09T19:04:08.000Z\",\"activo\":1}',NULL,'2026-02-10 15:19:44'),
(48,'productos',6,30,'desactivar','Producto desactivado (6)','{\"id\":6,\"codigo\":\"PSN-085\",\"tipo_maquina_id\":9,\"marca\":\"Rotake\",\"descripcion\":\"PISTOLA NEUMATICA PESADA DE 1/2″ FERTON PSN085\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":2,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T20:33:14.000Z\",\"fecha_actualizacion\":\"2026-02-09T20:34:47.000Z\",\"activo\":1}',NULL,'2026-02-10 15:19:47'),
(49,'productos',2,30,'desactivar','Producto desactivado (2)','{\"id\":2,\"codigo\":\"REQ0001\",\"tipo_maquina_id\":8,\"marca\":\"REQUERIMIENTO\",\"descripcion\":\"REQUERIMIENTO DE PRUEBA\",\"ubicacion_letra\":null,\"ubicacion_numero\":null,\"stock\":0,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T18:54:04.000Z\",\"fecha_actualizacion\":\"2026-02-09T18:54:04.000Z\",\"activo\":1}',NULL,'2026-02-10 15:19:50'),
(50,'productos',3,30,'desactivar','Producto desactivado (3)','{\"id\":3,\"codigo\":\"REQ0002\",\"tipo_maquina_id\":8,\"marca\":\"REQUERIMIENTO\",\"descripcion\":\"CEPILLO DE PRUEBA\",\"ubicacion_letra\":null,\"ubicacion_numero\":null,\"stock\":0,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T18:54:20.000Z\",\"fecha_actualizacion\":\"2026-02-09T18:54:20.000Z\",\"activo\":1}',NULL,'2026-02-10 15:19:53'),
(51,'tipos_maquinas',16,30,'crear','Tipo de maquina creado (TALLER MECANICO)',NULL,'{\"id\":16,\"nombre\":\"TALLER MECANICO\",\"descripcion\":\"Creado desde QR\"}','2026-02-11 17:01:30'),
(52,'productos',9,30,'crear','Producto creado (APO-10820)',NULL,'{\"id\":9,\"codigo\":\"APO-10820\",\"tipo_maquina_id\":\"16\",\"marca\":\"APO\",\"descripcion\":\"DESTALONADOR DE NEUMATICOS\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":\"0\",\"precio_compra\":\"0\",\"precio_venta\":\"0\",\"precio_minimo\":\"0\"}','2026-02-11 17:01:30'),
(53,'movimientos',8,30,'ingreso','Movimiento ingreso (9)','{\"stock\":0}','{\"stock\":1,\"cantidad\":1,\"motivo\":\"COMPRA | Guia: 6162\"}','2026-02-11 17:01:30'),
(54,'productos',10,30,'crear','Producto creado (KSM-180A)',NULL,'{\"id\":10,\"codigo\":\"KSM-180A\",\"tipo_maquina_id\":\"9\",\"marca\":\"M0035\",\"descripcion\":\"Esmeril angular 7″ 2200 W KSM180A- DCK\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":\"0\",\"precio_compra\":\"0\",\"precio_venta\":\"0\",\"precio_minimo\":\"0\"}','2026-02-11 17:07:13'),
(55,'movimientos',9,30,'ingreso','Movimiento ingreso (10)','{\"stock\":0}','{\"stock\":1,\"cantidad\":1,\"motivo\":\"COMPRA | Guia: 6363\"}','2026-02-11 17:07:13'),
(56,'inventario_general',1,30,'crear','Inventario general iniciado',NULL,'{\"id\":1,\"estado\":\"abierto\"}','2026-02-11 17:07:36'),
(57,'inventario_general',1,30,'cerrar','Inventario general cerrado','{\"estado\":\"abierto\"}','{\"estado\":\"cerrado\"}','2026-02-11 17:09:37'),
(58,'inventario_general',1,30,'aplicar','Stock actualizado desde inventario general','{\"estado\":\"cerrado\"}','{\"estado\":\"aplicado\"}','2026-02-11 17:09:47');
/*!40000 ALTER TABLE `historial_acciones` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `historial_cotizaciones`
--

DROP TABLE IF EXISTS `historial_cotizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_cotizaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cotizacion_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `accion` varchar(50) NOT NULL,
  `descripcion` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cotizacion` (`cotizacion_id`),
  KEY `idx_usuario` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_cotizaciones`
--

LOCK TABLES `historial_cotizaciones` WRITE;
/*!40000 ALTER TABLE `historial_cotizaciones` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `historial_cotizaciones` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `ingresos_salidas`
--

DROP TABLE IF EXISTS `ingresos_salidas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingresos_salidas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maquina_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `tipo` enum('ingreso','salida') NOT NULL,
  `cantidad` int NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_maquina` (`maquina_id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_fecha` (`fecha`),
  CONSTRAINT `ingresos_salidas_ibfk_1` FOREIGN KEY (`maquina_id`) REFERENCES `maquinas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `ingresos_salidas_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingresos_salidas`
--

LOCK TABLES `ingresos_salidas` WRITE;
/*!40000 ALTER TABLE `ingresos_salidas` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `ingresos_salidas` VALUES
(1,1,1,'salida',1,'Picking venta #1','2026-02-09 18:59:33'),
(2,4,1,'ingreso',1,'COMPRA | Guia: Ingresos','2026-02-09 19:04:08'),
(3,5,1,'ingreso',1,'COMPRA | Guia: 6y22','2026-02-09 19:55:59'),
(4,6,1,'ingreso',1,'COMPRA | Guia: 5152','2026-02-09 20:33:14'),
(5,7,1,'ingreso',1,'COMPRA | Guia: 152','2026-02-09 20:34:47'),
(6,6,1,'ingreso',1,'COMPRA | Guia: 152','2026-02-09 20:34:47'),
(7,8,1,'ingreso',1,'COMPRA | Guia: 1331','2026-02-09 20:35:47'),
(8,9,30,'ingreso',1,'COMPRA | Guia: 6162','2026-02-11 17:01:30'),
(9,10,30,'ingreso',1,'COMPRA | Guia: 6363','2026-02-11 17:07:13');
/*!40000 ALTER TABLE `ingresos_salidas` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `inventario_detalle`
--

DROP TABLE IF EXISTS `inventario_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_detalle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inventario_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `ubicacion_letra` char(1) DEFAULT NULL,
  `ubicacion_numero` int DEFAULT NULL,
  `stock_actual` int NOT NULL,
  `conteo` int NOT NULL DEFAULT '0',
  `diferencia` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_inventario_producto_ubicacion` (`inventario_id`,`producto_id`,`ubicacion_letra`,`ubicacion_numero`),
  KEY `idx_inventario` (`inventario_id`),
  KEY `idx_producto` (`producto_id`),
  CONSTRAINT `inventario_detalle_ibfk_1` FOREIGN KEY (`inventario_id`) REFERENCES `inventarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventario_detalle_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `maquinas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventario_detalle`
--

LOCK TABLES `inventario_detalle` WRITE;
/*!40000 ALTER TABLE `inventario_detalle` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `inventario_detalle` VALUES
(1,1,10,'A',1,1,3,2),
(2,1,10,'D',1,1,15,14),
(3,1,10,'E',1,1,1,0);
/*!40000 ALTER TABLE `inventario_detalle` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `inventarios`
--

DROP TABLE IF EXISTS `inventarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `estado` enum('abierto','cerrado','aplicado') DEFAULT 'abierto',
  `observaciones` text,
  `aplicado_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha` (`created_at`),
  CONSTRAINT `inventarios_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventarios`
--

LOCK TABLES `inventarios` WRITE;
/*!40000 ALTER TABLE `inventarios` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `inventarios` VALUES
(1,30,'aplicado',NULL,'2026-02-11 17:09:47','2026-02-11 17:07:36');
/*!40000 ALTER TABLE `inventarios` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `kit_productos`
--

DROP TABLE IF EXISTS `kit_productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kit_productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kit_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `precio_final` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `almacen_origen` varchar(30) DEFAULT 'productos',
  PRIMARY KEY (`id`),
  KEY `idx_kit` (`kit_id`),
  KEY `idx_producto` (`producto_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kit_productos`
--

LOCK TABLES `kit_productos` WRITE;
/*!40000 ALTER TABLE `kit_productos` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `kit_productos` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `kits`
--

DROP TABLE IF EXISTS `kits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text,
  `precio_total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `activo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kits`
--

LOCK TABLES `kits` WRITE;
/*!40000 ALTER TABLE `kits` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `kits` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `maquinas`
--

DROP TABLE IF EXISTS `maquinas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `maquinas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `tipo_maquina_id` int NOT NULL,
  `marca` varchar(100) NOT NULL,
  `descripcion` text,
  `ubicacion_letra` char(1) DEFAULT NULL,
  `ubicacion_numero` int DEFAULT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `precio_compra` decimal(10,2) NOT NULL,
  `precio_venta` decimal(10,2) NOT NULL,
  `precio_minimo` decimal(10,2) NOT NULL,
  `ficha_web` varchar(255) DEFAULT NULL,
  `ficha_tecnica_ruta` varchar(255) DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `idx_codigo` (`codigo`),
  KEY `idx_tipo` (`tipo_maquina_id`),
  CONSTRAINT `maquinas_ibfk_1` FOREIGN KEY (`tipo_maquina_id`) REFERENCES `tipos_maquinas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maquinas`
--

LOCK TABLES `maquinas` WRITE;
/*!40000 ALTER TABLE `maquinas` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `maquinas` VALUES
(1,'000000',7,'PRUEBA','PRODUCTO PARA PRUEBAS','H',1,0,0.00,0.00,0.00,NULL,NULL,'2026-02-09 18:12:04','2026-02-11 17:09:47',0),
(2,'REQ0001',8,'REQUERIMIENTO','REQUERIMIENTO DE PRUEBA',NULL,NULL,0,0.00,0.00,0.00,NULL,NULL,'2026-02-09 18:54:04','2026-02-10 15:19:50',0),
(3,'REQ0002',8,'REQUERIMIENTO','CEPILLO DE PRUEBA',NULL,NULL,0,0.00,0.00,0.00,NULL,NULL,'2026-02-09 18:54:20','2026-02-10 15:19:53',0),
(4,'MIG185',9,'WARC','SOLDADORA MIG 185 (Multiproceso) - WARC','A',1,0,0.00,0.00,0.00,NULL,NULL,'2026-02-09 19:04:08','2026-02-11 17:09:47',0),
(5,'DXCM805',10,'DeWALT','COMPRESOR 80 GALONES, PRESION MAXIMA 175 PSI','B',1,0,0.00,0.00,0.00,NULL,NULL,'2026-02-09 19:55:59','2026-02-11 17:09:47',0),
(6,'PSN-085',9,'Rotake','PISTOLA NEUMATICA PESADA DE 1/2″ FERTON PSN085','C',2,0,0.00,0.00,0.00,NULL,NULL,'2026-02-09 20:33:14','2026-02-11 17:09:47',0),
(7,'RT-019K',9,'Rotake','JUEGO BOCAS DE IMPACTO ROTAKE 3/4\" 10UNDS','C',2,0,0.00,0.00,0.00,NULL,NULL,'2026-02-09 20:34:47','2026-02-11 17:09:47',0),
(8,'PSN-12F',9,'Rotake','PISTOLA INALÁMBRICA 1\" T6 ROTAKE','C',2,0,0.00,0.00,0.00,NULL,NULL,'2026-02-09 20:35:47','2026-02-11 17:09:47',0),
(9,'APO-10820',16,'APO','DESTALONADOR DE NEUMATICOS','C',2,0,0.00,0.00,0.00,NULL,NULL,'2026-02-11 17:01:30','2026-02-11 17:09:47',1),
(10,'KSM-180A',9,'M0035','Esmeril angular 7″ 2200 W KSM180A- DCK','C',2,19,0.00,0.00,0.00,NULL,NULL,'2026-02-11 17:07:13','2026-02-11 17:09:47',1);
/*!40000 ALTER TABLE `maquinas` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `maquinas_ubicaciones`
--

DROP TABLE IF EXISTS `maquinas_ubicaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `maquinas_ubicaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `ubicacion_letra` char(1) NOT NULL,
  `ubicacion_numero` int NOT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_producto_ubicacion` (`producto_id`,`ubicacion_letra`,`ubicacion_numero`),
  KEY `idx_producto` (`producto_id`),
  KEY `idx_stock` (`stock`),
  CONSTRAINT `maquinas_ubicaciones_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `maquinas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maquinas_ubicaciones`
--

LOCK TABLES `maquinas_ubicaciones` WRITE;
/*!40000 ALTER TABLE `maquinas_ubicaciones` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `maquinas_ubicaciones` VALUES
(1,10,'A',1,3,'2026-02-11 17:09:47'),
(2,10,'D',1,15,'2026-02-11 17:09:47'),
(3,10,'E',1,1,'2026-02-11 17:09:47');
/*!40000 ALTER TABLE `maquinas_ubicaciones` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `marcas`
--

DROP TABLE IF EXISTS `marcas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `marcas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marcas`
--

LOCK TABLES `marcas` WRITE;
/*!40000 ALTER TABLE `marcas` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `marcas` VALUES
(1,'M0001','Agrotech',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(2,'M0002','AMCO',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(3,'M0003','APO',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(4,'M0004','BERKLIN',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(5,'M0005','BIGRED',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(6,'M0006','Bonelly',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(7,'M0007','Campbell',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(8,'M0008','Cattini',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(9,'M0009','DCA',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(10,'M0010','DeWALT',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(11,'M0011','DongCheng',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(12,'M0012','Farmjet',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(13,'M0013','Ferton',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(14,'M0014','Hyundai',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(15,'M0015','Kaili',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(16,'M0016','Khomander',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(17,'M0017','Klarwerk',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(18,'M0018','KRATOS',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(19,'M0019','MPR MOTORS',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(20,'M0020','PRETUL',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(21,'M0021','Rexon',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(22,'M0022','REYCAR',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(23,'M0023','Rotake',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(24,'M0024','SUMMARY',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(25,'M0025','Tramontina',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(26,'M0026','TRUPER',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(27,'M0027','UYUSTOOLS',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(28,'M0028','VIPER',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(29,'M0029','WARC',NULL,'2026-02-06 23:10:05','2026-02-06 23:10:05'),
(30,'M0030','HK-TC',NULL,'2026-02-09 20:23:26','2026-02-09 20:23:26');
/*!40000 ALTER TABLE `marcas` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `permisos`
--

DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) NOT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `grupo` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=365 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permisos`
--

LOCK TABLES `permisos` WRITE;
/*!40000 ALTER TABLE `permisos` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `permisos` VALUES
(1,'productos.ver','Ver productos','Inventario'),
(2,'productos.editar','Crear/Editar productos','Inventario'),
(3,'productos.precio_compra.ver','Ver precio de compra','Inventario'),
(4,'tipos_maquinas.ver','Ver tipos de maquinas','Inventario'),
(5,'tipos_maquinas.editar','Editar tipos de maquinas','Inventario'),
(6,'marcas.ver','Ver marcas','Inventario'),
(7,'marcas.editar','Editar marcas','Inventario'),
(8,'movimientos.ver','Ver movimientos','Inventario'),
(9,'movimientos.registrar','Registrar movimientos','Inventario'),
(10,'historial.ver','Ver historial general','Inventario'),
(11,'inventario_general.ver','Ver inventario general','Inventario'),
(12,'inventario_general.editar','Crear/Editar inventario general','Inventario'),
(13,'inventario_general.aplicar','Aplicar stock inventario general','Inventario'),
(14,'kits.ver','Ver kits','Cotizaciones'),
(15,'kits.editar','Crear/Editar kits','Cotizaciones'),
(16,'cotizaciones.ver','Ver cotizaciones','Cotizaciones'),
(17,'cotizaciones.editar','Crear/Editar cotizaciones','Cotizaciones'),
(18,'cotizaciones.historial.ver','Ver historial de cotizaciones','Cotizaciones'),
(19,'clientes.ver','Ver clientes','Clientes'),
(20,'clientes.editar','Crear/Editar clientes','Clientes'),
(21,'usuarios.ver','Ver usuarios','Cuentas'),
(22,'usuarios.editar','Editar usuarios','Cuentas'),
(23,'permisos.editar','Editar permisos por rol','Cuentas'),
(24,'ventas.ver','Ver ventas','Ventas'),
(25,'ventas.editar','Crear/Editar ventas','Ventas'),
(26,'ventas.eliminar','Eliminar ventas','Ventas'),
(27,'picking.ver','Ver picking de ventas','Ventas'),
(28,'picking.editar','Registrar picking de ventas','Ventas');
/*!40000 ALTER TABLE `permisos` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `rol_permisos`
--

DROP TABLE IF EXISTS `rol_permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol_permisos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rol_id` int NOT NULL,
  `permiso_id` int NOT NULL,
  `permitido` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_rol_permiso` (`rol_id`,`permiso_id`),
  KEY `permiso_id` (`permiso_id`),
  CONSTRAINT `rol_permisos_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rol_permisos_ibfk_2` FOREIGN KEY (`permiso_id`) REFERENCES `permisos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1388 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rol_permisos`
--

LOCK TABLES `rol_permisos` WRITE;
/*!40000 ALTER TABLE `rol_permisos` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `rol_permisos` VALUES
(1,2,20,1),
(2,3,20,1),
(3,1,20,1),
(4,2,19,1),
(5,3,19,1),
(6,1,19,1),
(7,2,17,1),
(8,3,17,1),
(9,1,17,1),
(10,2,18,1),
(11,3,18,1),
(12,1,18,1),
(13,2,16,1),
(14,3,16,1),
(15,1,16,1),
(16,2,10,1),
(17,3,10,1),
(18,1,10,1),
(19,2,13,1),
(20,3,13,1),
(21,1,13,1),
(22,2,12,1),
(23,3,12,1),
(24,1,12,1),
(25,2,11,1),
(26,3,11,1),
(27,1,11,1),
(28,2,15,1),
(29,3,15,1),
(30,1,15,1),
(31,2,14,1),
(32,3,14,1),
(33,1,14,1),
(34,2,7,1),
(35,3,7,1),
(36,1,7,1),
(37,2,6,1),
(38,3,6,1),
(39,1,6,1),
(40,2,9,1),
(41,3,9,1),
(42,1,9,1),
(43,2,8,1),
(44,3,8,1),
(45,1,8,1),
(46,2,23,1),
(47,3,23,1),
(48,1,23,1),
(49,2,28,1),
(50,3,28,1),
(51,1,28,1),
(52,2,27,1),
(53,3,27,1),
(54,1,27,1),
(55,2,2,1),
(56,3,2,1),
(57,1,2,1),
(58,2,3,1),
(59,3,3,1),
(60,1,3,1),
(61,2,1,1),
(62,3,1,1),
(63,1,1,1),
(64,2,5,1),
(65,3,5,1),
(66,1,5,1),
(67,2,4,1),
(68,3,4,1),
(69,1,4,1),
(70,2,22,1),
(71,3,22,1),
(72,1,22,1),
(73,2,21,1),
(74,3,21,1),
(75,1,21,1),
(76,2,25,1),
(77,3,25,1),
(78,1,25,1),
(79,2,26,1),
(80,3,26,1),
(81,1,26,1),
(82,2,24,1),
(83,3,24,1),
(84,1,24,1);
/*!40000 ALTER TABLE `rol_permisos` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `roles` VALUES
(1,'admin'),
(3,'logistica'),
(2,'ventas');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `tipos_maquinas`
--

DROP TABLE IF EXISTS `tipos_maquinas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_maquinas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipos_maquinas`
--

LOCK TABLES `tipos_maquinas` WRITE;
/*!40000 ALTER TABLE `tipos_maquinas` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `tipos_maquinas` VALUES
(1,'Torno','Máquinas para trabajo de metal','2026-02-09 17:35:52','2026-02-09 17:35:52'),
(2,'Fresadora','Máquinas fresadoras para trabajo de precisión','2026-02-09 17:35:52','2026-02-09 17:35:52'),
(3,'Soldadora','Equipos de soldadura eléctrica','2026-02-09 17:35:52','2026-02-09 17:35:52'),
(4,'Compresor','Compresores de aire','2026-02-09 17:35:52','2026-02-09 17:35:52'),
(5,'Generador','Generadores eléctricos','2026-02-09 17:35:52','2026-02-09 17:35:52'),
(7,'PRUEBA',NULL,'2026-02-09 18:29:48','2026-02-09 18:29:48'),
(8,'REQUERIMIENTO','Generado automaticamente para requerimientos de venta','2026-02-09 18:54:04','2026-02-09 18:54:04'),
(9,'METALMECANICA','Creado desde QR','2026-02-09 19:04:08','2026-02-09 19:04:08'),
(10,'COMPRESORAS','Creado desde QR','2026-02-09 19:55:59','2026-02-09 19:55:59'),
(16,'TALLER MECANICO','Creado desde QR','2026-02-11 17:01:30','2026-02-11 17:01:30');
/*!40000 ALTER TABLE `tipos_maquinas` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `contraseña` varchar(255) NOT NULL,
  `rol` enum('admin','ventas','logistica') NOT NULL DEFAULT 'ventas',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `usuarios` VALUES
(1,'Administrador','admin',NULL,'$2a$10$3F1.WaQnRm5/9jFh.Xydpe6yQIg3tCypBPgxZdSPmTONBnkWR/OFq','admin',1,'2026-01-26 00:06:07','2026-02-09 17:34:01'),
(3,'ronald','ronald@inventario.com',NULL,'$2a$10$YXOR4pkUZlyT6eyUZAWEBO70GMYkiJ.Sn.SMoDDaLGI7z..IS1Wr.','ventas',1,'2026-01-26 20:55:18','2026-01-28 19:12:56'),
(18,'Emilia','Emilia',NULL,'$2a$10$4IA8IpgADKnWKbxCYDN1OuIfob1Zcn3lReEsqhe.LpXzcpvp6ruc6','ventas',1,'2026-02-03 20:46:13','2026-02-03 20:46:13'),
(30,'Administrador','admin@inventario.com','000000000','$2a$10$pFxCMywNQAL33oZzbcV32uUXJZNrBLN3jHPiQVRvblIzaj9f.vRni','admin',1,'2026-02-09 17:35:52','2026-02-09 17:35:52');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `ventas`
--

DROP TABLE IF EXISTS `ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ventas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `documento_tipo` enum('dni','ruc') DEFAULT 'dni',
  `documento` varchar(20) DEFAULT NULL,
  `cliente_nombre` varchar(150) DEFAULT NULL,
  `cliente_telefono` varchar(30) DEFAULT NULL,
  `cliente_id` int DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `tipo` varchar(50) DEFAULT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `descuento` decimal(10,2) NOT NULL DEFAULT '0.00',
  `nota` text,
  `estado` varchar(30) DEFAULT 'pendiente',
  `adelanto` decimal(10,2) DEFAULT '0.00',
  `p_venta` decimal(10,2) NOT NULL DEFAULT '0.00',
  `rastreo_estado` varchar(30) DEFAULT 'EN TRANSITO',
  `ticket` varchar(60) DEFAULT NULL,
  `guia` varchar(60) DEFAULT NULL,
  `retiro` varchar(60) DEFAULT NULL,
  `notas` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `costo_envio` decimal(10,2) DEFAULT '0.00',
  `serie` varchar(10) DEFAULT NULL,
  `correlativo` int DEFAULT NULL,
  `estado_pago` varchar(30) DEFAULT 'pendiente',
  `entrega_fecha` date DEFAULT NULL,
  `agencia` varchar(100) DEFAULT NULL,
  `agencia_otro` varchar(120) DEFAULT NULL,
  `destino` varchar(120) DEFAULT NULL,
  `fecha_venta` date DEFAULT NULL,
  `estado_envio` enum('PENDIENTE','ENVIADO','CANCELADO','VISITA') DEFAULT 'PENDIENTE',
  `estado_pedido` enum('PICKING','PEDIDO_LISTO') DEFAULT 'PICKING',
  `fecha_despacho` date DEFAULT NULL,
  `fecha_cancelacion` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_cliente` (`cliente_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ventas`
--

LOCK TABLES `ventas` WRITE;
/*!40000 ALTER TABLE `ventas` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `ventas` VALUES
(1,1,'dni','71664482','YELNIN YOSMER BACA GOMES','',NULL,'2026-02-09 18:20:43',NULL,0.00,0.00,NULL,'pendiente',0.00,0.00,NULL,'','','','','2026-02-09 18:20:43','2026-02-09 19:00:14',0.00,NULL,NULL,'pendiente',NULL,'SHALOM','','Sánchez Carrión huamachuco','2026-02-09','ENVIADO','PEDIDO_LISTO','2026-02-09',NULL),
(2,1,'dni','71664482','YELNIN YOSMER BACA GOMES','',NULL,'2026-02-09 20:08:24',NULL,0.00,0.00,NULL,'pendiente',0.00,0.00,'EN TRANSITO','','','','','2026-02-09 20:08:24','2026-02-09 20:08:24',0.00,NULL,NULL,'pendiente',NULL,'SHALOM','','Sánchez Carrión huamachuco','2026-02-09','PENDIENTE','PICKING',NULL,NULL),
(3,1,'dni','47228188','GRECO ERIK MEJIA LEONARDO','',NULL,'2026-02-09 20:10:24',NULL,0.00,0.00,NULL,'pendiente',0.00,0.00,'EN TRANSITO','','','','','2026-02-09 20:10:24','2026-02-09 20:10:24',0.00,NULL,NULL,'pendiente',NULL,'OTROS','GPP','Moyobamba, San Martín','2026-02-09','PENDIENTE','PICKING',NULL,NULL),
(4,1,'dni','46812150','ELVIS JESUS NOLASCO ROJAS','',NULL,'2026-02-09 20:19:06',NULL,0.00,0.00,NULL,'pendiente',0.00,0.00,'EN TRANSITO','','','','','2026-02-09 20:19:06','2026-02-11 18:17:25',0.00,NULL,NULL,'pendiente',NULL,'SHALOM','','Chimbote _ Av. Enrique Meiggs','2026-02-09','PENDIENTE','PICKING',NULL,NULL);
/*!40000 ALTER TABLE `ventas` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `ventas_detalle`
--

DROP TABLE IF EXISTS `ventas_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ventas_detalle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `venta_id` int NOT NULL,
  `tipo` enum('producto','requerimiento','regalo','regalo_requerimiento') NOT NULL,
  `codigo` varchar(50) DEFAULT NULL,
  `descripcion` text,
  `marca` varchar(100) DEFAULT NULL,
  `cantidad` int NOT NULL DEFAULT '1',
  `cantidad_picked` int NOT NULL DEFAULT '0',
  `precio_venta` decimal(10,2) NOT NULL DEFAULT '0.00',
  `precio_compra` decimal(10,2) NOT NULL DEFAULT '0.00',
  `proveedor` varchar(120) DEFAULT NULL,
  `stock` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_venta_detalle` (`venta_id`),
  KEY `idx_venta_tipo` (`tipo`),
  CONSTRAINT `ventas_detalle_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ventas_detalle`
--

LOCK TABLES `ventas_detalle` WRITE;
/*!40000 ALTER TABLE `ventas_detalle` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `ventas_detalle` VALUES
(2,1,'producto','000000','PRODUCTO PARA PRUEBAS','PRUEBA',1,1,0.00,0.00,NULL,1000000),
(3,1,'requerimiento','REQ0001','REQUERIMIENTO DE PRUEBA','REQUERIMIENTO',1,0,0.00,0.00,NULL,NULL),
(4,1,'regalo_requerimiento','REQ0002','CEPILLO DE PRUEBA','REQUERIMIENTO',1,0,0.00,0.00,NULL,NULL),
(5,2,'producto','000000','PRODUCTO PARA PRUEBAS','PRUEBA',1,0,0.00,0.00,NULL,999999),
(6,3,'producto','000000','PRODUCTO PARA PRUEBAS','PRUEBA',1,0,0.00,0.00,NULL,999999),
(12,4,'producto','000000','PRODUCTO PARA PRUEBAS','PRUEBA',1,0,0.00,0.00,NULL,999999);
/*!40000 ALTER TABLE `ventas_detalle` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-02-11 14:01:28
