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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `clientes` VALUES
(2,'juridico',NULL,'20478217898',NULL,NULL,'MOTOFUERZA S.A.C.','CAL. LOS AVIADORES - Nro: 108  - Dpto: 101  - SANTIAGO DE SURCO - SANTIAGO DE SURCO - LIMA - LIMA',NULL,NULL,'2026-02-11 21:11:04','2026-02-11 21:11:04',18);
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `clientes_usuarios`
--

DROP TABLE IF EXISTS `clientes_usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes_usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cliente_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cliente_usuario` (`cliente_id`,`usuario_id`),
  KEY `idx_cliente` (`cliente_id`),
  KEY `idx_usuario` (`usuario_id`),
  CONSTRAINT `clientes_usuarios_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `clientes_usuarios_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes_usuarios`
--

LOCK TABLES `clientes_usuarios` WRITE;
/*!40000 ALTER TABLE `clientes_usuarios` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `clientes_usuarios` VALUES
(1,2,18,'2026-02-12 17:06:21');
/*!40000 ALTER TABLE `clientes_usuarios` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cotizaciones`
--

LOCK TABLES `cotizaciones` WRITE;
/*!40000 ALTER TABLE `cotizaciones` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `cotizaciones` VALUES
(2,18,2,'2026-02-11 21:11:29',3400.00,200.00,NULL,'pendiente','COT',1),
(3,30,2,'2026-02-12 20:09:29',150.00,0.00,NULL,'pendiente','COT',2),
(4,30,NULL,'2026-02-12 21:32:07',600.00,400.00,NULL,'pendiente','COT',3);
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_cotizacion`
--

LOCK TABLES `detalle_cotizacion` WRITE;
/*!40000 ALTER TABLE `detalle_cotizacion` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `detalle_cotizacion` VALUES
(3,2,11,1,3400.00,3600.00,3400.00,'productos'),
(4,2,11,1,3400.00,3600.00,3400.00,'productos'),
(5,3,84,1,150.00,150.00,150.00,'productos'),
(6,4,12,1,300.00,500.00,300.00,'productos'),
(7,4,96,1,300.00,500.00,300.00,'productos');
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
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
(58,'inventario_general',1,30,'aplicar','Stock actualizado desde inventario general','{\"estado\":\"cerrado\"}','{\"estado\":\"aplicado\"}','2026-02-11 17:09:47'),
(59,'productos',11,30,'crear','Producto creado (CM80GLMON)',NULL,'{\"id\":11,\"codigo\":\"CM80GLMON\",\"tipo_maquina_id\":\"4\",\"marca\":\"Campbell\",\"descripcion\":\"Compresora industrial 80 galones monofasica 220v mod. Camp\",\"ubicacion_letra\":\"A\",\"ubicacion_numero\":1,\"stock\":\"0\",\"precio_compra\":\"0\",\"precio_venta\":\"3600\",\"precio_minimo\":\"3400\"}','2026-02-11 20:56:12'),
(62,'clientes',2,18,'crear','Cliente creado (juridico)',NULL,'{\"id\":2,\"usuario_id\":18,\"tipo_cliente\":\"juridico\",\"dni\":null,\"ruc\":\"20478217898\",\"nombre\":null,\"apellido\":null,\"razon_social\":\"MOTOFUERZA S.A.C.\",\"direccion\":\"CAL. LOS AVIADORES - Nro: 108  - Dpto: 101  - SANTIAGO DE SURCO - SANTIAGO DE SURCO - LIMA - LIMA\",\"telefono\":null,\"correo\":null}','2026-02-11 21:11:04'),
(63,'cotizaciones',2,18,'crear','Cotizacion creada',NULL,'{\"id\":2,\"total\":3400,\"descuento\":200,\"cliente_id\":\"2\",\"items\":[{\"producto_id\":11,\"cantidad\":1,\"precio_unitario\":3400,\"precio_regular\":3600,\"almacen_origen\":\"productos\"}]}','2026-02-11 21:11:29'),
(64,'cotizaciones',2,18,'editar','Cotizacion actualizada','{\"cotizacion\":{\"id\":2,\"usuario_id\":18,\"cliente_id\":2,\"fecha\":\"2026-02-11T21:11:29.000Z\",\"total\":\"3400.00\",\"descuento\":\"200.00\",\"nota\":null,\"estado\":\"pendiente\",\"serie\":\"COT\",\"correlativo\":1},\"detalles\":[{\"id\":2,\"cotizacion_id\":2,\"producto_id\":11,\"cantidad\":1,\"precio_unitario\":\"3400.00\",\"precio_regular\":\"3600.00\",\"subtotal\":\"3400.00\",\"almacen_origen\":\"productos\"}]}','{\"cotizacion\":{\"id\":2,\"usuario_id\":18,\"cliente_id\":2,\"fecha\":\"2026-02-11T21:11:29.000Z\",\"total\":3400,\"descuento\":200,\"nota\":null,\"estado\":\"pendiente\",\"serie\":\"COT\",\"correlativo\":1},\"detalles\":[{\"producto_id\":11,\"cantidad\":1,\"precio_unitario\":3400,\"precio_regular\":3600,\"almacen_origen\":\"productos\"}]}','2026-02-11 21:24:05'),
(65,'cotizaciones',2,18,'editar','Cotizacion actualizada','{\"cotizacion\":{\"id\":2,\"usuario_id\":18,\"cliente_id\":2,\"fecha\":\"2026-02-11T21:11:29.000Z\",\"total\":\"3400.00\",\"descuento\":\"200.00\",\"nota\":null,\"estado\":\"pendiente\",\"serie\":\"COT\",\"correlativo\":1},\"detalles\":[{\"id\":2,\"cotizacion_id\":2,\"producto_id\":11,\"cantidad\":1,\"precio_unitario\":\"3400.00\",\"precio_regular\":\"3600.00\",\"subtotal\":\"3400.00\",\"almacen_origen\":\"productos\"}]}','{\"cotizacion\":{\"id\":2,\"usuario_id\":18,\"cliente_id\":2,\"fecha\":\"2026-02-11T21:11:29.000Z\",\"total\":3400,\"descuento\":200,\"nota\":null,\"estado\":\"pendiente\",\"serie\":\"COT\",\"correlativo\":1},\"detalles\":[{\"producto_id\":11,\"cantidad\":1,\"precio_unitario\":3400,\"precio_regular\":3600,\"almacen_origen\":\"productos\"}]}','2026-02-11 21:24:05'),
(66,'movimientos',NULL,30,'ingreso','Movimiento ingreso (10)','{\"stock\":19}','{\"stock\":20,\"cantidad\":1,\"motivo\":\"COMPRA | Guia: 1451\"}','2026-02-12 14:50:23'),
(67,'tipos_maquinas',27,30,'crear','Tipo de maquina creado (CARWASH)',NULL,'{\"id\":27,\"nombre\":\"CARWASH\",\"descripcion\":\"Creado desde QR\"}','2026-02-12 14:51:11'),
(68,'productos',12,30,'crear','Producto creado (DM-2900)',NULL,'{\"id\":12,\"codigo\":\"DM-2900\",\"tipo_maquina_id\":27,\"marca\":\"M0034\",\"descripcion\":\"HIDROLAVADORA DM-2900\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":0,\"precio_compra\":0,\"precio_venta\":0,\"precio_minimo\":0}','2026-02-12 14:51:11'),
(69,'movimientos',NULL,30,'ingreso','Movimiento ingreso (12)','{\"stock\":0}','{\"stock\":3,\"cantidad\":3,\"motivo\":\"COMPRA | Guia: 155252\"}','2026-02-12 14:51:11'),
(70,'productos',1,30,'reactivar','Producto reactivado (000000)','{\"id\":1,\"codigo\":\"000000\",\"tipo_maquina_id\":7,\"marca\":\"PRUEBA\",\"descripcion\":\"PRODUCTO PARA PRUEBAS\",\"ubicacion_letra\":\"H\",\"ubicacion_numero\":1,\"stock\":0,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T18:12:04.000Z\",\"fecha_actualizacion\":\"2026-02-12T14:46:15.000Z\",\"activo\":0,\"codigo_normalizado\":\"000000\",\"descripcion_normalizada\":\"PRODUCTOPARAPRUEBAS\",\"codigo_busqueda\":\"000000\",\"descripcion_busqueda\":\"PRODUCTOPARAPRUEBAS\"}','{\"id\":1,\"codigo\":\"000000\",\"tipo_maquina_id\":\"7\",\"marca\":\"PRUEBA\",\"descripcion\":\"PRODUCTO DE PRUEBA\",\"ubicacion_letra\":\"H\",\"ubicacion_numero\":1,\"stock\":999999999,\"precio_compra\":0,\"precio_venta\":0,\"precio_minimo\":0,\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T18:12:04.000Z\",\"fecha_actualizacion\":\"2026-02-12T14:46:15.000Z\",\"activo\":1,\"codigo_normalizado\":\"000000\",\"descripcion_normalizada\":\"PRODUCTOPARAPRUEBAS\",\"codigo_busqueda\":\"000000\",\"descripcion_busqueda\":\"PRODUCTOPARAPRUEBAS\"}','2026-02-12 14:53:30'),
(71,'productos',13,30,'crear','Producto creado (000001)',NULL,'{\"id\":13,\"codigo\":\"000001\",\"tipo_maquina_id\":\"7\",\"marca\":\"Prueba\",\"descripcion\":\"Producto para pruebas\",\"ubicacion_letra\":\"A\",\"ubicacion_numero\":1,\"stock\":999999,\"precio_compra\":0,\"precio_venta\":0,\"precio_minimo\":0}','2026-02-12 14:54:12'),
(72,'productos',14,30,'crear','Producto creado (LT-25LD)',NULL,'{\"id\":14,\"codigo\":\"LT-25LD\",\"tipo_maquina_id\":27,\"marca\":\"Klarwerk\",\"descripcion\":\"LAVATAPIZ 20 LITROS DOMESTICO\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":0,\"precio_compra\":0,\"precio_venta\":0,\"precio_minimo\":0}','2026-02-12 14:54:32'),
(73,'movimientos',NULL,30,'ingreso','Movimiento ingreso (14)','{\"stock\":0}','{\"stock\":1,\"cantidad\":1,\"motivo\":\"COMPRA | Guia: 1525\"}','2026-02-12 14:54:33'),
(74,'tipos_maquinas',28,30,'crear','Tipo de maquina creado (AGRO)',NULL,'{\"id\":28,\"nombre\":\"AGRO\",\"descripcion\":\"Creado desde QR\"}','2026-02-12 14:55:13'),
(75,'productos',15,30,'crear','Producto creado (GR-002)',NULL,'{\"id\":15,\"codigo\":\"GR-002\",\"tipo_maquina_id\":28,\"marca\":\"M0033\",\"descripcion\":\"SEMBRADORA MANUAL DE GRANOS CON APLICADOR DE FERTILIZANTES\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":0,\"precio_compra\":0,\"precio_venta\":0,\"precio_minimo\":0}','2026-02-12 14:55:13'),
(76,'movimientos',NULL,30,'ingreso','Movimiento ingreso (15)','{\"stock\":0}','{\"stock\":6,\"cantidad\":6,\"motivo\":\"COMPRA | Guia: 525\"}','2026-02-12 14:55:13'),
(77,'productos',5,30,'reactivar','Producto reactivado (DXCM805)','{\"id\":5,\"codigo\":\"DXCM805\",\"tipo_maquina_id\":10,\"marca\":\"DeWALT\",\"descripcion\":\"COMPRESOR 80 GALONES, PRESION MAXIMA 175 PSI\",\"ubicacion_letra\":\"B\",\"ubicacion_numero\":1,\"stock\":0,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T19:55:59.000Z\",\"fecha_actualizacion\":\"2026-02-12T14:46:15.000Z\",\"activo\":0,\"codigo_normalizado\":\"DXCM805\",\"descripcion_normalizada\":\"COMPRESOR80GALONESPRESIONMAXIMA175PSI\",\"codigo_busqueda\":\"DXCM805\",\"descripcion_busqueda\":\"COMPRESOR80GALONESPRESIONMAXIMA175PSI\"}','{\"id\":5,\"codigo\":\"DXCM805\",\"tipo_maquina_id\":10,\"marca\":\"DeWALT\",\"descripcion\":\"COMPRESOR 80 GALONES, PRESION MAXIMA 175 PSI\",\"ubicacion_letra\":\"B\",\"ubicacion_numero\":1,\"stock\":0,\"precio_compra\":0,\"precio_venta\":0,\"precio_minimo\":0,\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T19:55:59.000Z\",\"fecha_actualizacion\":\"2026-02-12T14:46:15.000Z\",\"activo\":1,\"codigo_normalizado\":\"DXCM805\",\"descripcion_normalizada\":\"COMPRESOR80GALONESPRESIONMAXIMA175PSI\",\"codigo_busqueda\":\"DXCM805\",\"descripcion_busqueda\":\"COMPRESOR80GALONESPRESIONMAXIMA175PSI\"}','2026-02-12 17:25:07'),
(78,'movimientos',NULL,30,'ingreso','Movimiento ingreso (5)','{\"stock\":0}','{\"stock\":1,\"cantidad\":1,\"motivo\":\"COMPRA | Guia: Yws\"}','2026-02-12 17:25:07'),
(79,'productos',1,30,'desactivar','Producto desactivado (1)','{\"id\":1,\"codigo\":\"000000\",\"tipo_maquina_id\":7,\"marca\":\"PRUEBA\",\"descripcion\":\"PRODUCTO DE PRUEBA\",\"ubicacion_letra\":\"H\",\"ubicacion_numero\":1,\"stock\":999999998,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T18:12:04.000Z\",\"fecha_actualizacion\":\"2026-02-12T17:39:48.000Z\",\"activo\":1,\"codigo_normalizado\":\"000000\",\"descripcion_normalizada\":\"PRODUCTODEPRUEBA\",\"codigo_busqueda\":\"000000\",\"descripcion_busqueda\":\"PRODUCTODEPRUEBA\"}',NULL,'2026-02-12 20:05:55'),
(80,'productos',13,30,'desactivar','Producto desactivado (13)','{\"id\":13,\"codigo\":\"000001\",\"tipo_maquina_id\":7,\"marca\":\"Prueba\",\"descripcion\":\"Producto para pruebas\",\"ubicacion_letra\":\"A\",\"ubicacion_numero\":1,\"stock\":999999,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-12T14:54:12.000Z\",\"fecha_actualizacion\":\"2026-02-12T14:54:12.000Z\",\"activo\":1,\"codigo_normalizado\":\"000001\",\"descripcion_normalizada\":\"PRODUCTOPARAPRUEBAS\",\"codigo_busqueda\":\"000001\",\"descripcion_busqueda\":\"PRODUCTOPARAPRUEBAS\"}',NULL,'2026-02-12 20:05:56'),
(81,'productos',9,30,'desactivar','Producto desactivado (9)','{\"id\":9,\"codigo\":\"APO-10820\",\"tipo_maquina_id\":16,\"marca\":\"APO\",\"descripcion\":\"DESTALONADOR DE NEUMATICOS\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":0,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-11T17:01:30.000Z\",\"fecha_actualizacion\":\"2026-02-12T14:46:15.000Z\",\"activo\":1,\"codigo_normalizado\":\"APO10820\",\"descripcion_normalizada\":\"DESTALONADORDENEUMATICOS\",\"codigo_busqueda\":\"APO10820\",\"descripcion_busqueda\":\"DESTALONADORDENEUMATICOS\"}',NULL,'2026-02-12 20:05:58'),
(82,'productos',11,30,'desactivar','Producto desactivado (11)','{\"id\":11,\"codigo\":\"CM80GLMON\",\"tipo_maquina_id\":4,\"marca\":\"Campbell\",\"descripcion\":\"Compresora industrial 80 galones monofasica 220v mod. Camp\",\"ubicacion_letra\":\"A\",\"ubicacion_numero\":1,\"stock\":0,\"precio_compra\":\"0.00\",\"precio_venta\":\"3600.00\",\"precio_minimo\":\"3400.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-11T20:56:12.000Z\",\"fecha_actualizacion\":\"2026-02-12T14:46:15.000Z\",\"activo\":1,\"codigo_normalizado\":\"CM80GLMON\",\"descripcion_normalizada\":\"COMPRESORAINDUSTRIAL80GALONESMONOFASICA220VMODCAMP\",\"codigo_busqueda\":\"CM80GLMON\",\"descripcion_busqueda\":\"COMPRESORAINDUSTRIAL80GALONESMONOFASICA220VMODCAMP\"}',NULL,'2026-02-12 20:05:59'),
(83,'productos',12,30,'desactivar','Producto desactivado (12)','{\"id\":12,\"codigo\":\"DM-2900\",\"tipo_maquina_id\":27,\"marca\":\"M0034\",\"descripcion\":\"HIDROLAVADORA DM-2900\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":3,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-12T14:51:11.000Z\",\"fecha_actualizacion\":\"2026-02-12T14:51:11.000Z\",\"activo\":1,\"codigo_normalizado\":\"DM2900\",\"descripcion_normalizada\":\"HIDROLAVADORADM2900\",\"codigo_busqueda\":\"DM2900\",\"descripcion_busqueda\":\"HIDROLAVADORADM2900\"}',NULL,'2026-02-12 20:06:01'),
(84,'productos',5,30,'desactivar','Producto desactivado (5)','{\"id\":5,\"codigo\":\"DXCM805\",\"tipo_maquina_id\":10,\"marca\":\"DeWALT\",\"descripcion\":\"COMPRESOR 80 GALONES, PRESION MAXIMA 175 PSI\",\"ubicacion_letra\":\"B\",\"ubicacion_numero\":1,\"stock\":1,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-09T19:55:59.000Z\",\"fecha_actualizacion\":\"2026-02-12T17:25:07.000Z\",\"activo\":1,\"codigo_normalizado\":\"DXCM805\",\"descripcion_normalizada\":\"COMPRESOR80GALONESPRESIONMAXIMA175PSI\",\"codigo_busqueda\":\"DXCM805\",\"descripcion_busqueda\":\"COMPRESOR80GALONESPRESIONMAXIMA175PSI\"}',NULL,'2026-02-12 20:06:03'),
(85,'productos',15,30,'desactivar','Producto desactivado (15)','{\"id\":15,\"codigo\":\"GR-002\",\"tipo_maquina_id\":28,\"marca\":\"M0033\",\"descripcion\":\"SEMBRADORA MANUAL DE GRANOS CON APLICADOR DE FERTILIZANTES\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":6,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-12T14:55:13.000Z\",\"fecha_actualizacion\":\"2026-02-12T14:55:13.000Z\",\"activo\":1,\"codigo_normalizado\":\"GR002\",\"descripcion_normalizada\":\"SEMBRADORAMANUALDEGRANOSCONAPLICADORDEFERTILIZANTES\",\"codigo_busqueda\":\"GR002\",\"descripcion_busqueda\":\"SEMBRADORAMANUALDEGRANOSCONAPLICADORDEFERTILIZANTES\"}',NULL,'2026-02-12 20:06:04'),
(86,'productos',10,30,'desactivar','Producto desactivado (10)','{\"id\":10,\"codigo\":\"KSM-180A\",\"tipo_maquina_id\":9,\"marca\":\"M0035\",\"descripcion\":\"Esmeril angular 7″ 2200 W KSM180A- DCK\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":20,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-11T17:07:13.000Z\",\"fecha_actualizacion\":\"2026-02-12T14:50:23.000Z\",\"activo\":1,\"codigo_normalizado\":\"KSM180A\",\"descripcion_normalizada\":\"ESMERILANGULAR72200WKSM180ADCK\",\"codigo_busqueda\":\"KSM180A\",\"descripcion_busqueda\":\"ESMERILANGULAR72200WKSM180ADCK\"}',NULL,'2026-02-12 20:06:06'),
(87,'productos',14,30,'desactivar','Producto desactivado (14)','{\"id\":14,\"codigo\":\"LT-25LD\",\"tipo_maquina_id\":27,\"marca\":\"Klarwerk\",\"descripcion\":\"LAVATAPIZ 20 LITROS DOMESTICO\",\"ubicacion_letra\":\"C\",\"ubicacion_numero\":2,\"stock\":1,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-12T14:54:32.000Z\",\"fecha_actualizacion\":\"2026-02-12T14:54:33.000Z\",\"activo\":1,\"codigo_normalizado\":\"LT25LD\",\"descripcion_normalizada\":\"LAVATAPIZ20LITROSDOMESTICO\",\"codigo_busqueda\":\"LT25LD\",\"descripcion_busqueda\":\"LAVATAPIZ20LITROSDOMESTICO\"}',NULL,'2026-02-12 20:06:07'),
(88,'productos',16,30,'desactivar','Producto desactivado (16)','{\"id\":16,\"codigo\":\"REQ0003\",\"tipo_maquina_id\":8,\"marca\":\"REQUERIMIENTO\",\"descripcion\":\"hidrolavadora 16hp\",\"ubicacion_letra\":null,\"ubicacion_numero\":null,\"stock\":0,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-12T17:35:18.000Z\",\"fecha_actualizacion\":\"2026-02-12T17:35:18.000Z\",\"activo\":1,\"codigo_normalizado\":\"REQ0003\",\"descripcion_normalizada\":\"HIDROLAVADORA16HP\",\"codigo_busqueda\":\"REQ0003\",\"descripcion_busqueda\":\"HIDROLAVADORA16HP\"}',NULL,'2026-02-12 20:06:09'),
(89,'productos',NULL,30,'importar','Importacion masiva (110 nuevos)',NULL,'{\"insertados\":110,\"duplicados\":0,\"errores\":0}','2026-02-12 20:07:12'),
(90,'productos',112,30,'editar','Producto actualizado (CSR-132-4)','{\"id\":112,\"codigo\":\"CSR-132-4\",\"tipo_maquina_id\":31,\"marca\":\"Meba\",\"descripcion\":\"MOTOR 5 HP\",\"ubicacion_letra\":null,\"ubicacion_numero\":null,\"stock\":0,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-12T20:07:12.000Z\",\"fecha_actualizacion\":\"2026-02-12T20:07:12.000Z\",\"activo\":1,\"codigo_normalizado\":\"CSR1324\",\"descripcion_normalizada\":\"MOTOR5HP\",\"codigo_busqueda\":\"CSR1324\",\"descripcion_busqueda\":\"MOTOR5HP\"}','{\"id\":\"112\",\"codigo\":\"CSR-132-4\",\"tipo_maquina_id\":\"31\",\"marca\":\"Meba\",\"descripcion\":\"MOTOR 5 HP\",\"ubicacion_letra\":\"G\",\"ubicacion_numero\":1,\"stock\":2,\"precio_compra\":0,\"precio_venta\":0,\"precio_minimo\":0}','2026-02-12 20:09:08'),
(91,'cotizaciones',3,30,'crear','Cotizacion creada',NULL,'{\"id\":3,\"total\":150,\"descuento\":0,\"cliente_id\":\"2\",\"items\":[{\"producto_id\":84,\"cantidad\":1,\"precio_unitario\":150,\"precio_regular\":150,\"almacen_origen\":\"productos\"}]}','2026-02-12 20:09:29'),
(92,'kits',1,30,'crear','Kit creado (asdasd)',NULL,'{\"id\":1,\"nombre\":\"asdasd\",\"descripcion\":\"asdasd\",\"precio_total\":600,\"activo\":true,\"productos\":[{\"producto_id\":12,\"cantidad\":1,\"precio_unitario\":500,\"precio_final\":300,\"subtotal\":300,\"almacen_origen\":\"productos\"},{\"producto_id\":96,\"cantidad\":1,\"precio_unitario\":500,\"precio_final\":300,\"subtotal\":300,\"almacen_origen\":\"productos\"}]}','2026-02-12 21:31:51'),
(93,'cotizaciones',4,30,'crear','Cotizacion creada',NULL,'{\"id\":4,\"total\":600,\"descuento\":400,\"cliente_id\":null,\"items\":[{\"producto_id\":12,\"cantidad\":1,\"precio_unitario\":300,\"precio_regular\":500,\"almacen_origen\":\"productos\"},{\"producto_id\":96,\"cantidad\":1,\"precio_unitario\":300,\"precio_regular\":500,\"almacen_origen\":\"productos\"}]}','2026-02-12 21:32:07'),
(94,'kits',2,34,'crear','Kit creado (COMBO BÁSICO)',NULL,'{\"id\":2,\"nombre\":\"COMBO BÁSICO\",\"descripcion\":\"CARWASH 3900\",\"precio_total\":4000,\"activo\":true,\"productos\":[{\"producto_id\":115,\"cantidad\":1,\"precio_unitario\":2500,\"precio_final\":2200,\"subtotal\":2200,\"almacen_origen\":\"productos\"},{\"producto_id\":64,\"cantidad\":1,\"precio_unitario\":790,\"precio_final\":600,\"subtotal\":600,\"almacen_origen\":\"productos\"},{\"producto_id\":68,\"cantidad\":1,\"precio_unitario\":950,\"precio_final\":600,\"subtotal\":600,\"almacen_origen\":\"productos\"},{\"producto_id\":65,\"cantidad\":1,\"precio_unitario\":950,\"precio_final\":600,\"subtotal\":600,\"almacen_origen\":\"productos\"}]}','2026-02-12 21:37:14'),
(95,'kits',2,34,'editar','Kit actualizado (COMBO BÁSICO)','{\"id\":2,\"usuario_id\":34,\"nombre\":\"COMBO BÁSICO\",\"descripcion\":\"CARWASH 3900\",\"precio_total\":\"4000.00\",\"activo\":1,\"created_at\":\"2026-02-12T21:37:13.000Z\",\"productos\":[{\"producto_id\":115,\"cantidad\":1,\"precio_unitario\":\"2500.00\",\"precio_final\":\"2200.00\",\"subtotal\":\"2200.00\",\"almacen_origen\":\"productos\"},{\"producto_id\":64,\"cantidad\":1,\"precio_unitario\":\"790.00\",\"precio_final\":\"600.00\",\"subtotal\":\"600.00\",\"almacen_origen\":\"productos\"},{\"producto_id\":68,\"cantidad\":1,\"precio_unitario\":\"950.00\",\"precio_final\":\"600.00\",\"subtotal\":\"600.00\",\"almacen_origen\":\"productos\"},{\"producto_id\":65,\"cantidad\":1,\"precio_unitario\":\"950.00\",\"precio_final\":\"600.00\",\"subtotal\":\"600.00\",\"almacen_origen\":\"productos\"}]}','{\"id\":\"2\",\"nombre\":\"COMBO BÁSICO\",\"descripcion\":\"CARWASH 3900\",\"precio_total\":3900,\"activo\":true,\"productos\":[{\"producto_id\":115,\"cantidad\":1,\"precio_unitario\":2500,\"precio_final\":2200,\"subtotal\":2200,\"almacen_origen\":\"productos\"},{\"producto_id\":64,\"cantidad\":1,\"precio_unitario\":790,\"precio_final\":500,\"subtotal\":500,\"almacen_origen\":\"productos\"},{\"producto_id\":68,\"cantidad\":1,\"precio_unitario\":950,\"precio_final\":600,\"subtotal\":600,\"almacen_origen\":\"productos\"},{\"producto_id\":65,\"cantidad\":1,\"precio_unitario\":950,\"precio_final\":600,\"subtotal\":600,\"almacen_origen\":\"productos\"}]}','2026-02-12 21:37:35'),
(96,'productos',73,3,'editar','Producto actualizado (ARC-240C)','{\"id\":73,\"codigo\":\"ARC-240C\",\"tipo_maquina_id\":9,\"marca\":\"WARC\",\"descripcion\":\"Maquina de soldar Inversora WARC ARC240C\",\"ubicacion_letra\":\"B\",\"ubicacion_numero\":1,\"stock\":3,\"precio_compra\":\"0.00\",\"precio_venta\":\"0.00\",\"precio_minimo\":\"0.00\",\"ficha_web\":null,\"ficha_tecnica_ruta\":null,\"fecha_creacion\":\"2026-02-12T20:07:12.000Z\",\"fecha_actualizacion\":\"2026-02-12T20:07:12.000Z\",\"activo\":1,\"codigo_normalizado\":\"ARC240C\",\"descripcion_normalizada\":\"MAQUINADESOLDARINVERSORAWARCARC240C\",\"codigo_busqueda\":\"ARC240C\",\"descripcion_busqueda\":\"MAQUINADESOLDARINVERSORAWARCARC240C\"}','{\"id\":\"73\",\"codigo\":\"ARC-240C\",\"tipo_maquina_id\":\"9\",\"marca\":\"WARC\",\"descripcion\":\"Maquina de soldar Inversora WARC ARC240C\",\"ubicacion_letra\":\"B\",\"ubicacion_numero\":1,\"stock\":3,\"precio_compra\":0,\"precio_venta\":0,\"precio_minimo\":0}','2026-02-12 21:40:46'),
(97,'kits',3,34,'crear','Kit creado (COMBO SEMI INDUSTRIAL)',NULL,'{\"id\":3,\"nombre\":\"COMBO SEMI INDUSTRIAL\",\"descripcion\":\"CARWASH 5500\",\"precio_total\":5100,\"activo\":true,\"productos\":[{\"producto_id\":83,\"cantidad\":1,\"precio_unitario\":3600,\"precio_final\":3400,\"subtotal\":3400,\"almacen_origen\":\"productos\"},{\"producto_id\":66,\"cantidad\":1,\"precio_unitario\":890,\"precio_final\":500,\"subtotal\":500,\"almacen_origen\":\"productos\"},{\"producto_id\":68,\"cantidad\":1,\"precio_unitario\":950,\"precio_final\":600,\"subtotal\":600,\"almacen_origen\":\"productos\"},{\"producto_id\":65,\"cantidad\":1,\"precio_unitario\":0,\"precio_final\":600,\"subtotal\":600,\"almacen_origen\":\"productos\"}]}','2026-02-12 21:45:36'),
(98,'kits',3,34,'editar','Kit actualizado (COMBO SEMI INDUSTRIAL)','{\"id\":3,\"usuario_id\":34,\"nombre\":\"COMBO SEMI INDUSTRIAL\",\"descripcion\":\"CARWASH 5500\",\"precio_total\":\"5100.00\",\"activo\":1,\"created_at\":\"2026-02-12T21:45:36.000Z\",\"productos\":[{\"producto_id\":83,\"cantidad\":1,\"precio_unitario\":\"3600.00\",\"precio_final\":\"3400.00\",\"subtotal\":\"3400.00\",\"almacen_origen\":\"productos\"},{\"producto_id\":66,\"cantidad\":1,\"precio_unitario\":\"890.00\",\"precio_final\":\"500.00\",\"subtotal\":\"500.00\",\"almacen_origen\":\"productos\"},{\"producto_id\":68,\"cantidad\":1,\"precio_unitario\":\"950.00\",\"precio_final\":\"600.00\",\"subtotal\":\"600.00\",\"almacen_origen\":\"productos\"},{\"producto_id\":65,\"cantidad\":1,\"precio_unitario\":\"0.00\",\"precio_final\":\"600.00\",\"subtotal\":\"600.00\",\"almacen_origen\":\"productos\"}]}','{\"id\":\"3\",\"nombre\":\"COMBO SEMI INDUSTRIAL\",\"descripcion\":\"CARWASH 5500\",\"precio_total\":5100,\"activo\":true,\"productos\":[{\"producto_id\":83,\"cantidad\":1,\"precio_unitario\":3600,\"precio_final\":3400,\"subtotal\":3400,\"almacen_origen\":\"productos\"},{\"producto_id\":66,\"cantidad\":1,\"precio_unitario\":890,\"precio_final\":500,\"subtotal\":500,\"almacen_origen\":\"productos\"},{\"producto_id\":68,\"cantidad\":1,\"precio_unitario\":950,\"precio_final\":600,\"subtotal\":600,\"almacen_origen\":\"productos\"},{\"producto_id\":65,\"cantidad\":1,\"precio_unitario\":0,\"precio_final\":600,\"subtotal\":600,\"almacen_origen\":\"productos\"}]}','2026-02-12 21:46:07'),
(99,'kits',3,34,'editar','Kit actualizado (COMBO SEMI INDUSTRIAL)','{\"id\":3,\"usuario_id\":34,\"nombre\":\"COMBO SEMI INDUSTRIAL\",\"descripcion\":\"CARWASH 5500\",\"precio_total\":\"5100.00\",\"activo\":1,\"created_at\":\"2026-02-12T21:45:36.000Z\",\"productos\":[{\"producto_id\":83,\"cantidad\":1,\"precio_unitario\":\"3600.00\",\"precio_final\":\"3400.00\",\"subtotal\":\"3400.00\",\"almacen_origen\":\"productos\"},{\"producto_id\":66,\"cantidad\":1,\"precio_unitario\":\"890.00\",\"precio_final\":\"500.00\",\"subtotal\":\"500.00\",\"almacen_origen\":\"productos\"},{\"producto_id\":68,\"cantidad\":1,\"precio_unitario\":\"950.00\",\"precio_final\":\"600.00\",\"subtotal\":\"600.00\",\"almacen_origen\":\"productos\"},{\"producto_id\":65,\"cantidad\":1,\"precio_unitario\":\"0.00\",\"precio_final\":\"600.00\",\"subtotal\":\"600.00\",\"almacen_origen\":\"productos\"}]}','{\"id\":\"3\",\"nombre\":\"COMBO SEMI INDUSTRIAL\",\"descripcion\":\"CARWASH 5500\",\"precio_total\":5300,\"activo\":true,\"productos\":[{\"producto_id\":83,\"cantidad\":1,\"precio_unitario\":3800,\"precio_final\":3600,\"subtotal\":3600,\"almacen_origen\":\"productos\"},{\"producto_id\":66,\"cantidad\":1,\"precio_unitario\":890,\"precio_final\":500,\"subtotal\":500,\"almacen_origen\":\"productos\"},{\"producto_id\":68,\"cantidad\":1,\"precio_unitario\":950,\"precio_final\":600,\"subtotal\":600,\"almacen_origen\":\"productos\"},{\"producto_id\":65,\"cantidad\":1,\"precio_unitario\":0,\"precio_final\":600,\"subtotal\":600,\"almacen_origen\":\"productos\"}]}','2026-02-12 21:46:40'),
(100,'kits',4,34,'crear','Kit creado (COMBO INDUSTRIAL)',NULL,'{\"id\":4,\"nombre\":\"COMBO INDUSTRIAL\",\"descripcion\":\"CARWASH 7100 C/ CAMPBELL 120L\",\"precio_total\":4100,\"activo\":true,\"productos\":[{\"producto_id\":83,\"cantidad\":1,\"precio_unitario\":3800,\"precio_final\":3600,\"subtotal\":3600,\"almacen_origen\":\"productos\"},{\"producto_id\":66,\"cantidad\":1,\"precio_unitario\":890,\"precio_final\":500,\"subtotal\":500,\"almacen_origen\":\"productos\"}]}','2026-02-12 21:51:12');
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_cotizaciones`
--

LOCK TABLES `historial_cotizaciones` WRITE;
/*!40000 ALTER TABLE `historial_cotizaciones` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `historial_cotizaciones` VALUES
(2,2,18,'crear','Cotizacion creada','2026-02-11 21:11:29'),
(3,3,30,'crear','Cotizacion creada','2026-02-12 20:09:29'),
(4,4,30,'crear','Cotizacion creada','2026-02-12 21:32:07');
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
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
(9,10,30,'ingreso',1,'COMPRA | Guia: 6363','2026-02-11 17:07:13'),
(10,10,30,'ingreso',1,'COMPRA | Guia: 1451','2026-02-12 14:50:23'),
(11,12,30,'ingreso',3,'COMPRA | Guia: 155252','2026-02-12 14:51:11'),
(12,14,30,'ingreso',1,'COMPRA | Guia: 1525','2026-02-12 14:54:33'),
(13,15,30,'ingreso',6,'COMPRA | Guia: 525','2026-02-12 14:55:13'),
(14,5,30,'ingreso',1,'COMPRA | Guia: Yws','2026-02-12 17:25:07'),
(15,1,30,'salida',1,'Picking venta #2','2026-02-12 17:39:48');
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
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kit_productos`
--

LOCK TABLES `kit_productos` WRITE;
/*!40000 ALTER TABLE `kit_productos` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `kit_productos` VALUES
(1,1,12,1,500.00,300.00,300.00,'productos'),
(2,1,96,1,500.00,300.00,300.00,'productos'),
(7,2,115,1,2500.00,2200.00,2200.00,'productos'),
(8,2,64,1,790.00,500.00,500.00,'productos'),
(9,2,68,1,950.00,600.00,600.00,'productos'),
(10,2,65,1,950.00,600.00,600.00,'productos'),
(19,3,83,1,3800.00,3600.00,3600.00,'productos'),
(20,3,66,1,890.00,500.00,500.00,'productos'),
(21,3,68,1,950.00,600.00,600.00,'productos'),
(22,3,65,1,0.00,600.00,600.00,'productos'),
(23,4,83,1,3800.00,3600.00,3600.00,'productos'),
(24,4,66,1,890.00,500.00,500.00,'productos');
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kits`
--

LOCK TABLES `kits` WRITE;
/*!40000 ALTER TABLE `kits` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `kits` VALUES
(1,30,'asdasd','asdasd',600.00,1,'2026-02-12 21:31:51'),
(2,34,'COMBO BÁSICO','CARWASH 3900',3900.00,1,'2026-02-12 21:37:13'),
(3,34,'COMBO SEMI INDUSTRIAL','CARWASH 5500',5300.00,1,'2026-02-12 21:45:36'),
(4,34,'COMBO INDUSTRIAL','CARWASH 7100 C/ CAMPBELL 120L',4100.00,1,'2026-02-12 21:51:12');
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
  `codigo_normalizado` varchar(80) GENERATED ALWAYS AS (regexp_replace(upper(`codigo`),_utf8mb4'[^A-Z0-9]',_utf8mb4'')) STORED,
  `descripcion_normalizada` varchar(255) GENERATED ALWAYS AS (regexp_replace(upper(`descripcion`),_utf8mb4'[^A-Z0-9]',_utf8mb4'')) STORED,
  `codigo_busqueda` varchar(80) DEFAULT NULL,
  `descripcion_busqueda` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `idx_codigo` (`codigo`),
  KEY `idx_tipo` (`tipo_maquina_id`),
  KEY `idx_codigo_normalizado` (`codigo_normalizado`),
  KEY `idx_desc_normalizada` (`descripcion_normalizada`),
  KEY `idx_codigo_busqueda` (`codigo_busqueda`),
  KEY `idx_desc_busqueda` (`descripcion_busqueda`),
  KEY `idx_marca` (`marca`),
  KEY `idx_activo` (`activo`),
  KEY `idx_stock` (`stock`),
  CONSTRAINT `maquinas_ibfk_1` FOREIGN KEY (`tipo_maquina_id`) REFERENCES `tipos_maquinas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maquinas`
--

LOCK TABLES `maquinas` WRITE;
/*!40000 ALTER TABLE `maquinas` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `maquinas` VALUES
(1,'000000',7,'PRUEBA','PRODUCTO DE PRUEBA','H',1,999999998,0.00,0.00,0.00,NULL,NULL,'2026-02-09 18:12:04','2026-02-12 20:05:55',0,'000000','PRODUCTODEPRUEBA','000000','PRODUCTODEPRUEBA'),
(2,'REQ0001',8,'REQUERIMIENTO','REQUERIMIENTO DE PRUEBA',NULL,NULL,0,0.00,0.00,0.00,NULL,NULL,'2026-02-09 18:54:04','2026-02-12 14:46:15',0,'REQ0001','REQUERIMIENTODEPRUEBA','REQ0001','REQUERIMIENTODEPRUEBA'),
(3,'REQ0002',8,'REQUERIMIENTO','CEPILLO DE PRUEBA',NULL,NULL,0,0.00,0.00,0.00,NULL,NULL,'2026-02-09 18:54:20','2026-02-12 14:46:15',0,'REQ0002','CEPILLODEPRUEBA','REQ0002','CEPILLODEPRUEBA'),
(4,'MIG185',9,'WARC','SOLDADORA MIG 185 (Multiproceso) - WARC','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-09 19:04:08','2026-02-12 20:07:12',1,'MIG185','SOLDADORAMIG185MULTIPROCESOWARC','MIG185','SOLDADORAMIG185MULTIPROCESOWARC'),
(5,'DXCM805',10,'DeWALT','COMPRESOR 80 GALONES, PRESION MAXIMA 175 PSI','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-09 19:55:59','2026-02-12 20:07:12',1,'DXCM805','COMPRESOR80GALONESPRESIONMAXIMA175PSI','DXCM805','COMPRESOR80GALONESPRESIONMAXIMA175PSI'),
(6,'PSN-085',9,'ROTAKE','PISTOLA NEUMATICA PESADA DE 1/2″ FERTON PSN085','C',2,3,0.00,0.00,0.00,NULL,NULL,'2026-02-09 20:33:14','2026-02-12 20:07:12',1,'PSN085','PISTOLANEUMATICAPESADADE12FERTONPSN085','PSN085','PISTOLANEUMATICAPESADADE12FERTONPSN085'),
(7,'RT-019K',9,'ROTAKE','JUEGO BOCAS DE IMPACTO ROTAKE 3/4\" 10UNDS','C',2,2,0.00,0.00,0.00,NULL,NULL,'2026-02-09 20:34:47','2026-02-12 20:07:12',1,'RT019K','JUEGOBOCASDEIMPACTOROTAKE3410UNDS','RT019K','JUEGOBOCASDEIMPACTOROTAKE3410UNDS'),
(8,'PSN-12F',9,'ROTAKE','PISTOLA INALÁMBRICA 1\" T6 ROTAKE','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-09 20:35:47','2026-02-12 20:07:12',1,'PSN12F','PISTOLAINALMBRICA1T6ROTAKE','PSN12F','PISTOLAINALAMBRICA1T6ROTAKE'),
(9,'APO-10820',16,'APO','DESTALONADOR DE NEUMATICOS','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-11 17:01:30','2026-02-12 20:07:12',1,'APO10820','DESTALONADORDENEUMATICOS','APO10820','DESTALONADORDENEUMATICOS'),
(10,'KSM-180A',9,'DCK','Esmeril angular 7″ 2200 W KSM180A- DCK','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-11 17:07:13','2026-02-12 20:07:12',1,'KSM180A','ESMERILANGULAR72200WKSM180ADCK','KSM180A','ESMERILANGULAR72200WKSM180ADCK'),
(11,'CM80GLMON',4,'Campbell','Compresora industrial 80 galones monofasica 220v mod. Camp','A',1,0,0.00,3600.00,3400.00,NULL,NULL,'2026-02-11 20:56:12','2026-02-12 20:05:59',0,'CM80GLMON','COMPRESORAINDUSTRIAL80GALONESMONOFASICA220VMODCAMP','CM80GLMON','COMPRESORAINDUSTRIAL80GALONESMONOFASICA220VMODCAMP'),
(12,'DM-2900',27,'Dalton Motors','HIDROLAVADORA DM-2900','C',2,7,0.00,0.00,0.00,NULL,NULL,'2026-02-12 14:51:11','2026-02-12 20:07:12',1,'DM2900','HIDROLAVADORADM2900','DM2900','HIDROLAVADORADM2900'),
(13,'000001',7,'Prueba','Producto para pruebas','A',1,999999,0.00,0.00,0.00,NULL,NULL,'2026-02-12 14:54:12','2026-02-12 20:05:56',0,'000001','PRODUCTOPARAPRUEBAS','000001','PRODUCTOPARAPRUEBAS'),
(14,'LT-25LD',27,'Klarwerk','LAVATAPIZ 20 LITROS DOMESTICO','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 14:54:32','2026-02-12 20:07:12',1,'LT25LD','LAVATAPIZ20LITROSDOMESTICO','LT25LD','LAVATAPIZ20LITROSDOMESTICO'),
(15,'GR-002',28,'Gerathor','SEMBRADORA MANUAL DE GRANOS CON APLICADOR DE FERTILIZANTES','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 14:55:13','2026-02-12 20:07:12',1,'GR002','SEMBRADORAMANUALDEGRANOSCONAPLICADORDEFERTILIZANTES','GR002','SEMBRADORAMANUALDEGRANOSCONAPLICADORDEFERTILIZANTES'),
(16,'REQ0003',8,'REQUERIMIENTO','hidrolavadora 16hp',NULL,NULL,0,0.00,0.00,0.00,NULL,NULL,'2026-02-12 17:35:18','2026-02-12 20:06:09',0,'REQ0003','HIDROLAVADORA16HP','REQ0003','HIDROLAVADORA16HP'),
(17,'BMC25F',16,'Ferton','Desengrasadora ferton 25 Litros','A',1,3,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BMC25F','DESENGRASADORAFERTON25LITROS','BMC25F','DESENGRASADORAFERTON25LITROS'),
(18,'DQE1100/24L',10,'DongCheng','Compresora silenciosa 1100w 24 litros Dongcheng','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'DQE110024L','COMPRESORASILENCIOSA1100W24LITROSDONGCHENG','DQE110024L','COMPRESORASILENCIOSA1100W24LITROSDONGCHENG'),
(19,'KH300A',28,'Khomander','Mochila Fumigadora A Motor De 25 Litros Blanco','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'KH300A','MOCHILAFUMIGADORAAMOTORDE25LITROSBLANCO','KH300A','MOCHILAFUMIGADORAAMOTORDE25LITROSBLANCO'),
(20,'FJE20L',28,'Farmjet','PULVERIZADORA 20L MARCA FARMJET','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'FJE20L','PULVERIZADORA20LMARCAFARMJET','FJE20L','PULVERIZADORA20LMARCAFARMJET'),
(21,'ZJ4113BP',9,'Rexon','REXON Taladro de Columna ZJ4113BP','A',1,5,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'ZJ4113BP','REXONTALADRODECOLUMNAZJ4113BP','ZJ4113BP','REXONTALADRODECOLUMNAZJ4113BP'),
(22,'PJ260',9,'SUMMARY','LIMPIADOR Y PROBADOR DE INYECTORES POWER JET 260','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'PJ260','LIMPIADORYPROBADORDEINYECTORESPOWERJET260','PJ260','LIMPIADORYPROBADORDEINYECTORESPOWERJET260'),
(23,'KH3500E',29,'Khomander','Generador KH3500E Gasolinero 3500W Arranque Electrico','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'KH3500E','GENERADORKH3500EGASOLINERO3500WARRANQUEELECTRICO','KH3500E','GENERADORKH3500EGASOLINERO3500WARRANQUEELECTRICO'),
(24,'KH3600E',29,'Khomander','GENERADOR GASOLINERO TH3600E 3000W','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'KH3600E','GENERADORGASOLINEROTH3600E3000W','KH3600E','GENERADORGASOLINEROTH3600E3000W'),
(25,'HYG1500',29,'Hyundai','Generador a gasolina 1.4KW HYG1500','A',1,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'HYG1500','GENERADORAGASOLINA14KWHYG1500','HYG1500','GENERADORAGASOLINA14KWHYG1500'),
(26,'DQE1100X2/50L',10,'DongCheng','Compresora 50L Silenciosa 1100w DongCheng','A',1,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'DQE1100X250L','COMPRESORA50LSILENCIOSA1100WDONGCHENG','DQE1100X250L','COMPRESORA50LSILENCIOSA1100WDONGCHENG'),
(27,'BND-10000E.T3',29,'Bonelly','Generador Gasolinero 9 kW Trifásico 380V Monofásico 220V Arranque Manual - Eléctrico Línea Premium','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BND10000ET3','GENERADORGASOLINERO9KWTRIFSICO380VMONOFSICO220VARRANQUEMANUALELCTRICOLNEAPREMIUM','BND10000ET3','GENERADORGASOLINERO9KWTRIFASICO380VMONOFASICO220VARRANQUEMANUALELECTRICOLINEAPREMIUM'),
(28,'KH500A',28,'Khomander','Motoguadaña Recta Desbrozadora Motor 4 Tiempos','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'KH500A','MOTOGUADAARECTADESBROZADORAMOTOR4TIEMPOS','KH500A','MOTOGUADANARECTADESBROZADORAMOTOR4TIEMPOS'),
(29,'TH10000E',29,'Khomander','Generador KHOMANDER Gasolinero 9000W Rojo Arranque Electrico 220V','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'TH10000E','GENERADORKHOMANDERGASOLINERO9000WROJOARRANQUEELECTRICO220V','TH10000E','GENERADORKHOMANDERGASOLINERO9000WROJOARRANQUEELECTRICO220V'),
(30,'TH6500E',29,'Khomander','GENERADOR GASOLINERO 5500W A/E KHOMANDER','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'TH6500E','GENERADORGASOLINERO5500WAEKHOMANDER','TH6500E','GENERADORGASOLINERO5500WAEKHOMANDER'),
(31,'ADPB1288',9,'DCA','Llave de Impacto Inalámbrico 3/4″ 20V 5,0Ah','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'ADPB1288','LLAVEDEIMPACTOINALMBRICO3420V50AH','ADPB1288','LLAVEDEIMPACTOINALAMBRICO3420V50AH'),
(32,'C9335',16,'AMCO','RECTIFICADOR DE DISCOS Y TAMBORES AMCO C9335','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'C9335','RECTIFICADORDEDISCOSYTAMBORESAMCOC9335','C9335','RECTIFICADORDEDISCOSYTAMBORESAMCOC9335'),
(33,'WP60T',28,'Khomander','Motobomba Autocebante KHOMANDER WP60T Gasolinera 6X6 Motor 18 hp','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'WP60T','MOTOBOMBAAUTOCEBANTEKHOMANDERWP60TGASOLINERA6X6MOTOR18HP','WP60T','MOTOBOMBAAUTOCEBANTEKHOMANDERWP60TGASOLINERA6X6MOTOR18HP'),
(34,'MIG225',9,'WARC','SOLDADORA MIG 225 (Multiproceso) - WARC','A',1,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'MIG225','SOLDADORAMIG225MULTIPROCESOWARC','MIG225','SOLDADORAMIG225MULTIPROCESOWARC'),
(35,'MIG285',9,'WARC','SOLDADORA MIG 285 (Multiproceso) - WARC','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'MIG285','SOLDADORAMIG285MULTIPROCESOWARC','MIG285','SOLDADORAMIG285MULTIPROCESOWARC'),
(36,'BR2511',16,'BIGRED','Desllantadora para camiones','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BR2511','DESLLANTADORAPARACAMIONES','BR2511','DESLLANTADORAPARACAMIONES'),
(37,'CH3265',30,'Tramontina','Caja de herramientas','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'CH3265','CAJADEHERRAMIENTAS','CH3265','CAJADEHERRAMIENTAS'),
(38,'RA1456',16,'BIGRED','Recuperador de aceite','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'RA1456','RECUPERADORDEACEITE','RA1456','RECUPERADORDEACEITE'),
(39,'TB5120P',16,'Kaili','Taladro de Banco 3/4″ 1.5hp (TB5120P)','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'TB5120P','TALADRODEBANCO3415HPTB5120P','TB5120P','TALADRODEBANCO3415HPTB5120P'),
(40,'708TC0002HP',16,'Cattini','Taladro de Columna BDP-32HF (2.0 HP, 220V 60HZ)','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'708TC0002HP','TALADRODECOLUMNABDP32HF20HP220V60HZ','708TC0002HP','TALADRODECOLUMNABDP32HF20HP220V60HZ'),
(41,'C5HP3PMON',10,'Campbell','COMPRESORA 80G 5HP 3 PIST. MONOFÁSICA','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'C5HP3PMON','COMPRESORA80G5HP3PISTMONOFSICA','C5HP3PMON','COMPRESORA80G5HP3PISTMONOFASICA'),
(42,'TB-6P',16,'PRETUL','Tornillo de banco 6\" de hierro gris, PRETUL','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'TB6P','TORNILLODEBANCO6DEHIERROGRISPRETUL','TB6P','TORNILLODEBANCO6DEHIERROGRISPRETUL'),
(43,'JP-150',16,'MPR MOTORS','JP-150 – Esmeril de Banco 6”','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'JP150','JP150ESMERILDEBANCO6','JP150','JP150ESMERILDEBANCO6'),
(44,'EM6-1/2',16,'TRUPER','Esmeril de banco de 6\" de 1/2 HP','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'EM612','ESMERILDEBANCODE6DE12HP','EM612','ESMERILDEBANCODE6DE12HP'),
(45,'BKL-003P',9,'BERKLIN','ARENADORA DE 20 GALONES','A',1,3,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BKL003P','ARENADORADE20GALONES','BKL003P','ARENADORADE20GALONES'),
(46,'APO-7000',16,'APO','BALANCEADOR DE NEUMÁTICOS APO-7000','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'APO7000','BALANCEADORDENEUMTICOSAPO7000','APO7000','BALANCEADORDENEUMATICOSAPO7000'),
(47,'APO-3092',16,'APO','DESMONTADOR DE NEUMÁTICOS BRAZO AUXILIAR APO-3092','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'APO3092','DESMONTADORDENEUMTICOSBRAZOAUXILIARAPO3092','APO3092','DESMONTADORDENEUMATICOSBRAZOAUXILIARAPO3092'),
(48,'APO-300',16,'APO','DESMONTADOR DE NEUMÁTICOS APO-300','A',1,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'APO300','DESMONTADORDENEUMTICOSAPO300','APO300','DESMONTADORDENEUMATICOSAPO300'),
(49,'KRM80-A',9,'Khomander','Vibro Apisonadora Saltarin KHOMANDER KRM80-A','A',1,3,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'KRM80A','VIBROAPISONADORASALTARINKHOMANDERKRM80A','KRM80A','VIBROAPISONADORASALTARINKHOMANDERKRM80A'),
(50,'GT-L3TN',16,'BIGRED','GATA LAGARTO 3 TON','A',1,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'GTL3TN','GATALAGARTO3TON','GTL3TN','GATALAGARTO3TON'),
(51,'GT-B32TN',16,'BIGRED','GATA BOTELLA ESTÁNDAR 32 TON','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'GTB32TN','GATABOTELLAESTNDAR32TON','GTB32TN','GATABOTELLAESTANDAR32TON'),
(52,'PC-6TN',16,'BIGRED','PAR DE CABALLETES 6 TON','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'PC6TN','PARDECABALLETES6TON','PC6TN','PARDECABALLETES6TON'),
(53,'GT-B10TN',16,'BIGRED','GATA TIPO BOTELLA 10TN','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'GTB10TN','GATATIPOBOTELLA10TN','GTB10TN','GATATIPOBOTELLA10TN'),
(54,'GT-BN50TN',16,'BIGRED','GATA BOTELLA NEUMÁTICA 50 TON','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'GTBN50TN','GATABOTELLANEUMTICA50TON','GTBN50TN','GATABOTELLANEUMATICA50TON'),
(55,'GL-LN22TN',16,'BIGRED','GATA LAGARTO NEUMÁTICA 22 TON','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'GLLN22TN','GATALAGARTONEUMTICA22TON','GLLN22TN','GATALAGARTONEUMATICA22TON'),
(56,'MQP150',16,'Ferton','PRENSA HIDRAULICA 50 TON CON MANOMETRO','A',1,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'MQP150','PRENSAHIDRAULICA50TONCONMANOMETRO','MQP150','PRENSAHIDRAULICA50TONCONMANOMETRO'),
(57,'PH-30TN',16,'KRATOS','PRENSA HIDRAULICA 30TN','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'PH30TN','PRENSAHIDRAULICA30TN','PH30TN','PRENSAHIDRAULICA30TN'),
(58,'RN15063',16,'KRATOS','REMACHADORA NEUMATICA','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'RN15063','REMACHADORANEUMATICA','RN15063','REMACHADORANEUMATICA'),
(59,'CAM-BR001',16,'BIGRED','Camilla para mecanico','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'CAMBR001','CAMILLAPARAMECANICO','CAMBR001','CAMILLAPARAMECANICO'),
(60,'FA-001',10,'KRATOS','Filtro de aire (un cuerpo)','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'FA001','FILTRODEAIREUNCUERPO','FA001','FILTRODEAIREUNCUERPO'),
(61,'MTFL001',9,'KRATOS','FLUJOMETRO','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'MTFL001','FLUJOMETRO','MTFL001','FLUJOMETRO'),
(62,'CWPLE001',27,'TRUPER','Pulidor tipo esmeril','A',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'CWPLE001','PULIDORTIPOESMERIL','CWPLE001','PULIDORTIPOESMERIL'),
(63,'KH1350G',28,'Khomander','Motocultor Petrolero 18HP','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'KH1350G','MOTOCULTORPETROLERO18HP','KH1350G','MOTOCULTORPETROLERO18HP'),
(64,'CH-N80LH',27,'Klarwerk','CHAMPUNERA NEUMÁTICA PARA ESPUMA 80 LT HIERRO','B',1,16,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'CHN80LH','CHAMPUNERANEUMTICAPARAESPUMA80LTHIERRO','CHN80LH','CHAMPUNERANEUMATICAPARAESPUMA80LTHIERRO'),
(65,'APV35L',27,'VIPER','Aspiradora Viper 35 L','B',1,4,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'APV35L','ASPIRADORAVIPER35L','APV35L','ASPIRADORAVIPER35L'),
(66,'CH-N80LI',27,'Klarwerk','CHAMPUNERA NEUMÁTICA PARA ESPUMA 80 LT ACERO INOX','B',1,6,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'CHN80LI','CHAMPUNERANEUMTICAPARAESPUMA80LTACEROINOX','CHN80LI','CHAMPUNERANEUMATICAPARAESPUMA80LTACEROINOX'),
(67,'NT-15/1',27,'Klarwerk','Aspiradora KARCHER 15L NT 15/1','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'NT151','ASPIRADORAKARCHER15LNT151','NT151','ASPIRADORAKARCHER15LNT151'),
(68,'BNCM50L',10,'Bonelly','Compresora 50l','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BNCM50L','COMPRESORA50L','BNCM50L','COMPRESORA50L'),
(69,'PILI-697',10,'TRUPER','Pistola de Aire para Limpieza de Motores','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'PILI697','PISTOLADEAIREPARALIMPIEZADEMOTORES','PILI697','PISTOLADEAIREPARALIMPIEZADEMOTORES'),
(70,'UY-ITL03-202',9,'UYUSTOOLS','Taladro Atornillador Percutor 1/2″ Uyustools UY-ITL03-202','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'UYITL03202','TALADROATORNILLADORPERCUTOR12UYUSTOOLSUYITL03202','UYITL03202','TALADROATORNILLADORPERCUTOR12UYUSTOOLSUYITL03202'),
(71,'TIG-250P',9,'WARC','Maquina de Soldar WARC TIG250P','B',1,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'TIG250P','MAQUINADESOLDARWARCTIG250P','TIG250P','MAQUINADESOLDARWARCTIG250P'),
(72,'ARC-280C',9,'WARC','Maquina de soldar Inversora WARC ARC280C','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'ARC280C','MAQUINADESOLDARINVERSORAWARCARC280C','ARC280C','MAQUINADESOLDARINVERSORAWARCARC280C'),
(73,'ARC-240C',9,'WARC','Maquina de soldar Inversora WARC ARC240C','B',1,3,0.00,0.00,0.00,NULL,'ficha_tecnica-1770932444638-267694795.pdf','2026-02-12 20:07:12','2026-02-12 21:40:45',1,'ARC240C','MAQUINADESOLDARINVERSORAWARCARC240C','ARC240C','MAQUINADESOLDARINVERSORAWARCARC240C'),
(74,'PSN-002',9,'Ferton','Pistola De Impacto 1 Pulgada Fuerza De 5200 Nm','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'PSN002','PISTOLADEIMPACTO1PULGADAFUERZADE5200NM','PSN002','PISTOLADEIMPACTO1PULGADAFUERZADE5200NM'),
(75,'PSN-320',9,'Ferton','PISTOLA NEUMATICA PESADA 1” FERTON PSN320','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'PSN320','PISTOLANEUMATICAPESADA1FERTONPSN320','PSN320','PISTOLANEUMATICAPESADA1FERTONPSN320'),
(76,'PSN-074',9,'Ferton','PISTOLA NEUMATICA LIVIANA 1” FERTON PSN074','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'PSN074','PISTOLANEUMATICALIVIANA1FERTONPSN074','PSN074','PISTOLANEUMATICALIVIANA1FERTONPSN074'),
(77,'RT-5570',9,'Rotake','ROTAKE RT-5570 PNEUMATIC AIR IMPACT WRENCH','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'RT5570','ROTAKERT5570PNEUMATICAIRIMPACTWRENCH','RT5570','ROTAKERT5570PNEUMATICAIRIMPACTWRENCH'),
(78,'RT-5665',9,'Rotake','PISTOLA NEUMÁTICA 1\" - 2500NM','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'RT5665','PISTOLANEUMTICA12500NM','RT5665','PISTOLANEUMATICA12500NM'),
(79,'RT-5770',9,'Rotake','PISTOLA NEUMÁTICA 1″ 3200NM ROTAKE CAÑON LARGO','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'RT5770','PISTOLANEUMTICA13200NMROTAKECAONLARGO','RT5770','PISTOLANEUMATICA13200NMROTAKECANONLARGO'),
(80,'PSN-120',9,'Ferton','PISTOLA NEUMATICA LIVIANA DE 3/4″ FERTON','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'PSN120','PISTOLANEUMATICALIVIANADE34FERTON','PSN120','PISTOLANEUMATICALIVIANADE34FERTON'),
(81,'PSN-34F',9,'Ferton','PISTOLA IMPACTO FERTON NEUMATICA 3/4\" 1480NM','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'PSN34F','PISTOLAIMPACTOFERTONNEUMATICA341480NM','PSN34F','PISTOLAIMPACTOFERTONNEUMATICA341480NM'),
(82,'PSN-160',9,'Ferton','PISTOLA NEUMATICA PESADA 3/4” FERTON PSN160','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'PSN160','PISTOLANEUMATICAPESADA34FERTONPSN160','PSN160','PISTOLANEUMATICAPESADA34FERTONPSN160'),
(83,'HET-MBGR5HP',27,'Agrotech','HIDROLAVADORA ESTACIONARIA AGROTECH 5HP','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'HETMBGR5HP','HIDROLAVADORAESTACIONARIAAGROTECH5HP','HETMBGR5HP','HIDROLAVADORAESTACIONARIAAGROTECH5HP'),
(84,'HD-40',30,'REYCAR','ACEITE HD40','B',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'HD40','ACEITEHD40','HD40','ACEITEHD40'),
(85,'TC-78',16,'HK-TC','Multiplicador de fuerza','C',1,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'TC78','MULTIPLICADORDEFUERZA','TC78','MULTIPLICADORDEFUERZA'),
(86,'RT-1206K-P',16,'ROTAKE','PULIDOR NEUMATICO 1/4','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'RT1206KP','PULIDORNEUMATICO14','RT1206KP','PULIDORNEUMATICO14'),
(87,'RT-021K',16,'ROTAKE','10PCS 1\" Air Impact Socket Set','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'RT021K','10PCS1AIRIMPACTSOCKETSET','RT021K','10PCS1AIRIMPACTSOCKETSET'),
(88,'YNJ017',9,'Ferton','Llave de impacto neumática 1/2\'\' 600nm 17pzas ferton','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'YNJ017','LLAVEDEIMPACTONEUMTICA12600NM17PZASFERTON','YNJ017','LLAVEDEIMPACTONEUMATICA12600NM17PZASFERTON'),
(89,'BN35-B',31,'Bonelly','MOTOR 4 TIEMPOS 1.6HP SISTEMA DE REFRIGERACIÓN OHV BONELLY BN35-B','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BN35B','MOTOR4TIEMPOS16HPSISTEMADEREFRIGERACINOHVBONELLYBN35B','BN35B','MOTOR4TIEMPOS16HPSISTEMADEREFRIGERACIONOHVBONELLYBN35B'),
(90,'BND-MB3X3',31,'Bonelly','MOTOBOMBA GASOLINERA 3X3 BND-MB3X3 ARRANQUE MANUAL','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BNDMB3X3','MOTOBOMBAGASOLINERA3X3BNDMB3X3ARRANQUEMANUAL','BNDMB3X3','MOTOBOMBAGASOLINERA3X3BNDMB3X3ARRANQUEMANUAL'),
(91,'BNB-MB.AP20.7.AZ',9,'Bonelly','Motobomba Gasolinera BNR-MB.AP20.7','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BNBMBAP207AZ','MOTOBOMBAGASOLINERABNRMBAP207','BNBMBAP207AZ','MOTOBOMBAGASOLINERABNRMBAP207'),
(92,'WP30T',9,'khomander','Motobomba Autocebante KHOMANDER WP30T Gasolinera 3X3 Motor 7.5 hp','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'WP30T','MOTOBOMBAAUTOCEBANTEKHOMANDERWP30TGASOLINERA3X3MOTOR75HP','WP30T','MOTOBOMBAAUTOCEBANTEKHOMANDERWP30TGASOLINERA3X3MOTOR75HP'),
(93,'KH-186FAE',31,'Khomander','Motor Petrolero KH186FAE de 4 tiempos','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'KH186FAE','MOTORPETROLEROKH186FAEDE4TIEMPOS','KH186FAE','MOTORPETROLEROKH186FAEDE4TIEMPOS'),
(94,'FD1103NFE',31,'FREDICH','Motor Petrolero 22HP','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'FD1103NFE','MOTORPETROLERO22HP','FD1103NFE','MOTORPETROLERO22HP'),
(95,'CP100L',10,'Bonelly','COMPRESORA 100 LITROS','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'CP100L','COMPRESORA100LITROS','CP100L','COMPRESORA100LITROS'),
(96,'CPT50L',10,'TRUPER','Compresora  50 litros Truper','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'CPT50L','COMPRESORA50LITROSTRUPER','CPT50L','COMPRESORA50LITROSTRUPER'),
(97,'HD150F',27,'Ferton','Hidrolavadora inalámbrica 20v alta presión','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'HD150F','HIDROLAVADORAINALMBRICA20VALTAPRESIN','HD150F','HIDROLAVADORAINALAMBRICA20VALTAPRESION'),
(98,'CB-900',9,'ChaoBao','TURBINA DE SECADO CHAOBAO','C',2,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'CB900','TURBINADESECADOCHAOBAO','CB900','TURBINADESECADOCHAOBAO'),
(99,'BND-4500IS',29,'Bonelly','Generador Gasolinero Inverter BND-4500IS','C',2,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BND4500IS','GENERADORGASOLINEROINVERTERBND4500IS','BND4500IS','GENERADORGASOLINEROINVERTERBND4500IS'),
(100,'BNR-1500IA',29,'Bonelly','Generador Gasolinero Inverter BNR-1500IA','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BNR1500IA','GENERADORGASOLINEROINVERTERBNR1500IA','BNR1500IA','GENERADORGASOLINEROINVERTERBNR1500IA'),
(101,'KH-2500IS',29,'Khomander','GENERADOR  INVERTER GASOLINERO SILENCIOSO 2500 W','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'KH2500IS','GENERADORINVERTERGASOLINEROSILENCIOSO2500W','KH2500IS','GENERADORINVERTERGASOLINEROSILENCIOSO2500W'),
(102,'BND-3500IS',29,'Bonelly','Generador Gasolinero Inverter BND-3500IS','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BND3500IS','GENERADORGASOLINEROINVERTERBND3500IS','BND3500IS','GENERADORGASOLINEROINVERTERBND3500IS'),
(103,'BND-9000IS',29,'Bonelly','Generador Gasolinero Inverter BND-9000IS','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BND9000IS','GENERADORGASOLINEROINVERTERBND9000IS','BND9000IS','GENERADORGASOLINEROINVERTERBND9000IS'),
(104,'LT-15LI',27,'Klarwerk','LAVATAPIZ 15 LITROS INDUSTRIAL','C',2,3,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'LT15LI','LAVATAPIZ15LITROSINDUSTRIAL','LT15LI','LAVATAPIZ15LITROSINDUSTRIAL'),
(105,'BNDR-HD18/4200',27,'Bonelly','HIDROLAVADORA GASOLINERA 16HP MONOFÁSICO 220V BNR-HD18/4200 4200 PSI','C',2,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BNDRHD184200','HIDROLAVADORAGASOLINERA16HPMONOFSICO220VBNRHD1842004200PSI','BNDRHD184200','HIDROLAVADORAGASOLINERA16HPMONOFASICO220VBNRHD1842004200PSI'),
(106,'KHP-10P',28,'Khomander','Motocultor Oruga Petrolera 7.5 Hp','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'KHP10P','MOTOCULTORORUGAPETROLERA75HP','KHP10P','MOTOCULTORORUGAPETROLERA75HP'),
(107,'WP20T',9,'Khomander','MOTOBOMBA GASOLINERO 2X2 7HP WP20T','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'WP20T','MOTOBOMBAGASOLINERO2X27HPWP20T','WP20T','MOTOBOMBAGASOLINERO2X27HPWP20T'),
(108,'P152203',28,'KRATOS','PELETIZADORA DE ALIMENTOS BALANCEADOS','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'P152203','PELETIZADORADEALIMENTOSBALANCEADOS','P152203','PELETIZADORADEALIMENTOSBALANCEADOS'),
(109,'KH-10000E',29,'Khomander','GENERADOR DE 10KW GASOLINERO KH1000E','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'KH10000E','GENERADORDE10KWGASOLINEROKH1000E','KH10000E','GENERADORDE10KWGASOLINEROKH1000E'),
(110,'TH-10000E',29,'Khomander','Generador KHOMANDER TH10000E Gasolinero 9000W','C',2,3,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'TH10000E','GENERADORKHOMANDERTH10000EGASOLINERO9000W','TH10000E','GENERADORKHOMANDERTH10000EGASOLINERO9000W'),
(111,'CP20L',10,'PRETUL','COMPRESORA PRETUL 20L','C',2,1,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'CP20L','COMPRESORAPRETUL20L','CP20L','COMPRESORAPRETUL20L'),
(112,'CSR-132-4',31,'Meba','MOTOR 5 HP','G',1,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:09:08',1,'CSR1324','MOTOR5HP','CSR1324','MOTOR5HP'),
(113,'BM112M-4',31,'Bonelly','MOTOR 3 HP MONOFASICO','C',2,16,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BM112M4','MOTOR3HPMONOFASICO','BM112M4','MOTOR3HPMONOFASICO'),
(114,'BNO-30',27,'Bonelly','CABEZALES','C',2,30,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'BNO30','CABEZALES','BNO30','CABEZALES'),
(115,'H3HP-M3',27,'Bonelly','HIDROLAVADORA DE 3 HP','C',2,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'H3HPM3','HIDROLAVADORADE3HP','H3HPM3','HIDROLAVADORADE3HP'),
(116,'H5HP-M5',27,'Bonelly','HIDROLAVADORA DE 5 HP','C',2,2,0.00,0.00,0.00,NULL,NULL,'2026-02-12 20:07:12','2026-02-12 20:07:12',1,'H5HPM5','HIDROLAVADORADE5HP','H5HPM5','HIDROLAVADORADE5HP');
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
) ENGINE=InnoDB AUTO_INCREMENT=130 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maquinas_ubicaciones`
--

LOCK TABLES `maquinas_ubicaciones` WRITE;
/*!40000 ALTER TABLE `maquinas_ubicaciones` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `maquinas_ubicaciones` VALUES
(5,11,'A',1,0,'2026-02-12 14:46:15'),
(11,13,'A',1,999999,'2026-02-12 14:54:12'),
(18,1,'H',1,999999998,'2026-02-12 17:39:48'),
(19,17,'A',1,3,'2026-02-12 20:07:12'),
(20,18,'A',1,1,'2026-02-12 20:07:12'),
(21,19,'A',1,1,'2026-02-12 20:07:12'),
(22,20,'A',1,1,'2026-02-12 20:07:12'),
(23,21,'A',1,5,'2026-02-12 20:07:12'),
(24,22,'A',1,1,'2026-02-12 20:07:12'),
(25,23,'A',1,1,'2026-02-12 20:07:12'),
(26,24,'A',1,1,'2026-02-12 20:07:12'),
(27,25,'A',1,2,'2026-02-12 20:07:12'),
(28,26,'A',1,2,'2026-02-12 20:07:12'),
(29,27,'A',1,1,'2026-02-12 20:07:12'),
(30,28,'A',1,1,'2026-02-12 20:07:12'),
(31,29,'A',1,1,'2026-02-12 20:07:12'),
(32,30,'A',1,1,'2026-02-12 20:07:12'),
(33,31,'A',1,1,'2026-02-12 20:07:12'),
(34,32,'A',1,1,'2026-02-12 20:07:12'),
(35,33,'A',1,1,'2026-02-12 20:07:12'),
(36,4,'A',1,1,'2026-02-12 20:07:12'),
(37,34,'A',1,2,'2026-02-12 20:07:12'),
(38,35,'A',1,1,'2026-02-12 20:07:12'),
(39,36,'A',1,1,'2026-02-12 20:07:12'),
(40,37,'A',1,1,'2026-02-12 20:07:12'),
(41,38,'A',1,1,'2026-02-12 20:07:12'),
(42,39,'A',1,1,'2026-02-12 20:07:12'),
(43,40,'A',1,1,'2026-02-12 20:07:12'),
(44,41,'A',1,1,'2026-02-12 20:07:12'),
(45,42,'A',1,1,'2026-02-12 20:07:12'),
(46,43,'A',1,1,'2026-02-12 20:07:12'),
(47,44,'A',1,1,'2026-02-12 20:07:12'),
(48,45,'A',1,3,'2026-02-12 20:07:12'),
(49,46,'A',1,1,'2026-02-12 20:07:12'),
(50,47,'A',1,1,'2026-02-12 20:07:12'),
(51,48,'A',1,2,'2026-02-12 20:07:12'),
(52,49,'A',1,3,'2026-02-12 20:07:12'),
(53,50,'A',1,2,'2026-02-12 20:07:12'),
(54,51,'A',1,1,'2026-02-12 20:07:12'),
(55,52,'A',1,1,'2026-02-12 20:07:12'),
(56,53,'A',1,1,'2026-02-12 20:07:12'),
(57,54,'A',1,1,'2026-02-12 20:07:12'),
(58,55,'A',1,1,'2026-02-12 20:07:12'),
(59,56,'A',1,2,'2026-02-12 20:07:12'),
(60,57,'A',1,1,'2026-02-12 20:07:12'),
(61,58,'A',1,1,'2026-02-12 20:07:12'),
(62,59,'A',1,1,'2026-02-12 20:07:12'),
(63,60,'A',1,1,'2026-02-12 20:07:12'),
(64,61,'A',1,1,'2026-02-12 20:07:12'),
(65,62,'A',1,1,'2026-02-12 20:07:12'),
(66,5,'B',1,1,'2026-02-12 20:07:12'),
(67,63,'B',1,1,'2026-02-12 20:07:12'),
(68,64,'B',1,16,'2026-02-12 20:07:12'),
(69,65,'B',1,4,'2026-02-12 20:07:12'),
(70,66,'B',1,6,'2026-02-12 20:07:12'),
(71,67,'B',1,1,'2026-02-12 20:07:12'),
(72,68,'B',1,1,'2026-02-12 20:07:12'),
(73,69,'B',1,1,'2026-02-12 20:07:12'),
(74,70,'B',1,1,'2026-02-12 20:07:12'),
(75,71,'B',1,2,'2026-02-12 20:07:12'),
(76,72,'B',1,1,'2026-02-12 20:07:12'),
(78,74,'B',1,1,'2026-02-12 20:07:12'),
(79,75,'B',1,1,'2026-02-12 20:07:12'),
(80,76,'B',1,1,'2026-02-12 20:07:12'),
(81,77,'B',1,1,'2026-02-12 20:07:12'),
(82,78,'B',1,1,'2026-02-12 20:07:12'),
(83,79,'B',1,1,'2026-02-12 20:07:12'),
(84,80,'B',1,1,'2026-02-12 20:07:12'),
(85,81,'B',1,1,'2026-02-12 20:07:12'),
(86,82,'B',1,1,'2026-02-12 20:07:12'),
(87,83,'B',1,1,'2026-02-12 20:07:12'),
(88,84,'B',1,1,'2026-02-12 20:07:12'),
(89,85,'C',1,1,'2026-02-12 20:07:12'),
(90,86,'C',2,1,'2026-02-12 20:07:12'),
(91,87,'C',2,1,'2026-02-12 20:07:12'),
(92,6,'C',2,3,'2026-02-12 20:07:12'),
(93,7,'C',2,2,'2026-02-12 20:07:12'),
(94,8,'C',2,1,'2026-02-12 20:07:12'),
(95,88,'C',2,1,'2026-02-12 20:07:12'),
(96,89,'C',2,1,'2026-02-12 20:07:12'),
(97,90,'C',2,1,'2026-02-12 20:07:12'),
(98,91,'C',2,1,'2026-02-12 20:07:12'),
(99,92,'C',2,1,'2026-02-12 20:07:12'),
(100,93,'C',2,1,'2026-02-12 20:07:12'),
(101,94,'C',2,1,'2026-02-12 20:07:12'),
(102,95,'C',2,1,'2026-02-12 20:07:12'),
(103,96,'C',2,1,'2026-02-12 20:07:12'),
(104,97,'C',2,1,'2026-02-12 20:07:12'),
(105,98,'C',2,2,'2026-02-12 20:07:12'),
(106,99,'C',2,2,'2026-02-12 20:07:12'),
(107,100,'C',2,1,'2026-02-12 20:07:12'),
(108,101,'C',2,1,'2026-02-12 20:07:12'),
(109,102,'C',2,1,'2026-02-12 20:07:12'),
(110,103,'C',2,1,'2026-02-12 20:07:12'),
(111,15,'C',2,1,'2026-02-12 20:07:12'),
(112,104,'C',2,3,'2026-02-12 20:07:12'),
(113,14,'C',2,1,'2026-02-12 20:07:12'),
(114,12,'C',2,7,'2026-02-12 20:07:12'),
(115,105,'C',2,2,'2026-02-12 20:07:12'),
(116,106,'C',2,1,'2026-02-12 20:07:12'),
(117,107,'C',2,1,'2026-02-12 20:07:12'),
(118,108,'C',2,1,'2026-02-12 20:07:12'),
(119,10,'C',2,1,'2026-02-12 20:07:12'),
(120,9,'C',2,1,'2026-02-12 20:07:12'),
(121,109,'C',2,1,'2026-02-12 20:07:12'),
(122,110,'C',2,3,'2026-02-12 20:07:12'),
(123,111,'C',2,1,'2026-02-12 20:07:12'),
(124,113,'C',2,16,'2026-02-12 20:07:12'),
(125,114,'C',2,30,'2026-02-12 20:07:12'),
(126,115,'C',2,2,'2026-02-12 20:07:12'),
(127,116,'C',2,2,'2026-02-12 20:07:12'),
(128,112,'G',1,2,'2026-02-12 20:09:08'),
(129,73,'B',1,3,'2026-02-12 21:40:46');
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
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
(30,'M0030','HK-TC',NULL,'2026-02-09 20:23:26','2026-02-09 20:23:26'),
(34,'M0031','FREDICH',NULL,'2026-02-12 16:10:15','2026-02-12 16:10:15'),
(35,'M0032','ChaoBao',NULL,'2026-02-12 16:10:15','2026-02-12 16:10:15'),
(36,'M0033','Gerathor',NULL,'2026-02-12 16:10:15','2026-02-12 16:10:15'),
(37,'M0034','Dalton Motors',NULL,'2026-02-12 16:10:15','2026-02-12 16:10:15'),
(38,'M0035','DCK',NULL,'2026-02-12 16:10:15','2026-02-12 16:10:15'),
(39,'M0036','Meba',NULL,'2026-02-12 16:10:15','2026-02-12 16:10:15');
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
) ENGINE=InnoDB AUTO_INCREMENT=624 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=2396 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
(16,'TALLER MECANICO','Creado desde QR','2026-02-11 17:01:30','2026-02-11 17:01:30'),
(27,'CARWASH','Creado desde QR','2026-02-12 14:51:11','2026-02-12 14:51:11'),
(28,'AGRO','Creado desde QR','2026-02-12 14:55:13','2026-02-12 14:55:13'),
(29,'GENERADORES','Creado desde importacion','2026-02-12 20:07:12','2026-02-12 20:07:12'),
(30,'ACCESORIOS','Creado desde importacion','2026-02-12 20:07:12','2026-02-12 20:07:12'),
(31,'MOTORES','Creado desde importacion','2026-02-12 20:07:12','2026-02-12 20:07:12');
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
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
(30,'Administrador','admin@inventario.com','000000000','$2a$10$pFxCMywNQAL33oZzbcV32uUXJZNrBLN3jHPiQVRvblIzaj9f.vRni','admin',1,'2026-02-09 17:35:52','2026-02-09 17:35:52'),
(34,'Piero D','piero',NULL,'$2a$10$sWbXuFgNfEKOfl20wOFUU.VnOYrFAF/LejkGiAR2sgvTctBqcfpNa','ventas',1,'2026-02-12 20:10:25','2026-02-12 20:10:25');
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
  KEY `idx_cliente` (`cliente_id`),
  KEY `idx_venta_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ventas`
--

LOCK TABLES `ventas` WRITE;
/*!40000 ALTER TABLE `ventas` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `ventas` VALUES
(1,1,'dni','71664482','YELNIN YOSMER BACA GOMES','',NULL,'2026-02-09 18:20:43',NULL,0.00,0.00,NULL,'pendiente',0.00,0.00,NULL,'','','','','2026-02-09 18:20:43','2026-02-09 19:00:14',0.00,NULL,NULL,'pendiente',NULL,'SHALOM','','Sánchez Carrión huamachuco','2026-02-09','ENVIADO','PEDIDO_LISTO','2026-02-09',NULL),
(2,1,'dni','71664482','YELNIN YOSMER BACA GOMES','',NULL,'2026-02-09 20:08:24',NULL,0.00,0.00,NULL,'pendiente',0.00,0.00,'EN TRANSITO','','','','','2026-02-09 20:08:24','2026-02-12 17:39:48',0.00,NULL,NULL,'pendiente',NULL,'SHALOM','','Sánchez Carrión huamachuco','2026-02-09','PENDIENTE','PEDIDO_LISTO',NULL,NULL),
(3,1,'dni','47228188','GRECO ERIK MEJIA LEONARDO','',NULL,'2026-02-09 20:10:24',NULL,0.00,0.00,NULL,'pendiente',0.00,0.00,'EN TRANSITO','','','','','2026-02-09 20:10:24','2026-02-09 20:10:24',0.00,NULL,NULL,'pendiente',NULL,'OTROS','GPP','Moyobamba, San Martín','2026-02-09','PENDIENTE','PICKING',NULL,NULL),
(4,1,'dni','22101997','ROMUALDO LUIS CONTRERAS ROMAN','',NULL,'2026-02-09 20:19:06',NULL,0.00,0.00,NULL,'pendiente',0.00,0.00,'EN TRANSITO','','','','','2026-02-09 20:19:06','2026-02-12 15:24:04',0.00,NULL,NULL,'pendiente',NULL,'SHALOM','','NAZCA','2026-02-09','PENDIENTE','PICKING',NULL,NULL),
(5,30,'dni','76970710','MARCO ANTONIO MIÑANO HUARANGA','924659969',NULL,'2026-02-12 17:35:22',NULL,0.00,0.00,NULL,'pendiente',500.00,5000.00,'EN TRANSITO','','','','','2026-02-12 17:35:22','2026-02-12 17:35:22',0.00,NULL,NULL,'pendiente',NULL,'SHALOM','','puno','2026-02-12','PENDIENTE','PICKING',NULL,NULL);
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
  KEY `idx_detalle_codigo` (`codigo`),
  KEY `idx_detalle_desc` (`descripcion`(100)),
  CONSTRAINT `ventas_detalle_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
(5,2,'producto','000000','PRODUCTO PARA PRUEBAS','PRUEBA',1,1,0.00,0.00,NULL,999999),
(6,3,'producto','000000','PRODUCTO PARA PRUEBAS','PRUEBA',1,0,0.00,0.00,NULL,999999),
(13,4,'producto','000000','PRODUCTO PARA PRUEBAS','PRUEBA',1,0,0.00,0.00,NULL,999999),
(14,5,'producto','000000','PRODUCTO DE PRUEBA','PRUEBA',1,0,5000.00,0.00,NULL,999999999),
(15,5,'regalo_requerimiento','REQ0003','hidrolavadora 16hp','REQUERIMIENTO',1,0,0.00,0.00,NULL,NULL);
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

-- Dump completed on 2026-02-12 17:00:18
