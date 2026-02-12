-- Limpieza total de datos manteniendo SOLO marcas y usuarios
-- Base: kratos_1 (ajusta si tu BD tiene otro nombre)
USE kratos_1;

SET FOREIGN_KEY_CHECKS = 0;

-- Tablas operativas y dependientes
TRUNCATE TABLE ventas_detalle;
TRUNCATE TABLE ventas;
TRUNCATE TABLE ingresos_salidas;
TRUNCATE TABLE inventario_detalle;
TRUNCATE TABLE maquinas_ubicaciones;
TRUNCATE TABLE inventarios;
TRUNCATE TABLE detalle_cotizacion;
TRUNCATE TABLE historial_cotizaciones;
TRUNCATE TABLE cotizaciones;
TRUNCATE TABLE kit_productos;
TRUNCATE TABLE kits;
TRUNCATE TABLE historial_acciones;

-- Maquinas/productos y catálogos relacionados
TRUNCATE TABLE maquinas;
TRUNCATE TABLE tipos_maquinas;

-- Clientes y permisos/roles
TRUNCATE TABLE clientes;
TRUNCATE TABLE rol_permisos;
TRUNCATE TABLE permisos;
TRUNCATE TABLE roles;

-- Mantener: marcas, usuarios

SET FOREIGN_KEY_CHECKS = 1;
