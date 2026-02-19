# Sistema de Inventario de Máquinas

Sistema completo de inventario desarrollado con **Node.js/Express** (Backend), **React** (Frontend) y **MySQL** (Base de Datos).

## 🚀 Características

- **Gestión de productos/máquinas**: Crear, editar y eliminar productos con ficha técnica (PDF) y ficha web.
- **Tipos de máquinas**: Módulo dedicado para crear/editar/eliminar tipos.
- **Gestor de Inventario**: Ingresos/Salidas en un solo módulo.
- **Escaneo de códigos**: Soporte con cámara (BarcodeDetector + ZXing) y modo “escanear una vez”.
- **Stock y alertas**: Indicadores de stock bajo y manejo de movimientos.
- **Autenticación**: Login con JWT y soporte de sesión por cookie httpOnly.
- **Interfaz moderna**: Diseño responsivo y optimizado.

## 📋 Requisitos

- Node.js (v14 o superior)
- MySQL (v5.7 o superior)
- npm o yarn

## ⚙️ Instalación y Ejecución Local

### Backend

```bash
cd backend
npm install
```

Crear/editar `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=kratos_1
DB_PORT=3306
PORT=5000
NODE_ENV=development
JWT_SECRET=tu_secreto_super_seguro_aqui
TRUST_PROXY=0
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SEED_DEFAULT_ADMIN=false
ADMIN_EMAIL=admin
ADMIN_PASSWORD=define_un_password_seguro
AUTH_COOKIE_SECURE=false
ALLOW_BOOTSTRAP_REGISTRATION=false
BACKUP_SCHEDULER_ENABLED=false
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE_RETENTION_DAYS=120
# Seguridad de migraciones: por defecto NO se ejecutan limpiezas destructivas
ALLOW_DESTRUCTIVE_MIGRATION=false
# Si ALLOW_DESTRUCTIVE_MIGRATION=true, puedes simular sin ejecutar cambios
DRY_RUN_DESTRUCTIVE_MIGRATION=false
```

Inicializar la base de datos:

```bash
npm run init-db
```

Iniciar el servidor:

```bash
npm start
# o con auto-reload:
npm run dev
```

### Frontend (local)

```bash
cd frontend
npm install
```

`.env` local:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Iniciar:

```bash
npm start
```

Abrir `http://localhost:3000`.

## 🌐 LAN con HTTPS (Caddy)

1) Build del frontend:
```env
REACT_APP_API_URL=/api
```

```bash
cd frontend
npm run build
```

2) Variables del backend para proxy:
```env
NODE_ENV=production
TRUST_PROXY=1
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=strict
CORS_ORIGINS=https://tu-dominio-o-ip
PUBLIC_BASE_URL=https://tu-dominio-o-ip
BACKUP_SCHEDULER_ENABLED=true
```

3) Variables para el `caddyfile` versionado (LAN):
```bash
set LAN_HOST=192.168.18.131
set FRONTEND_BUILD_DIR=C:\ruta\PROYECTO KRATOS\frontend\build
set API_UPSTREAM=127.0.0.1:5000
```

4) Ejecutar Caddy:
```bash
caddy run --config "C:\Users\user\Documents\marco\NODE\PROYECTO KRATOS\caddyfile" --adapter caddyfile
```

## 📡 API REST Endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/registro`
- `GET /api/auth/me`

### Tipos de Máquinas
- `GET /api/tipos-maquinas`
- `GET /api/tipos-maquinas/:id`
- `POST /api/tipos-maquinas`
- `PUT /api/tipos-maquinas/:id`
- `DELETE /api/tipos-maquinas/:id`

### Productos
- `GET /api/productos`
- `GET /api/productos` (opcional: q, tipo, marca, stock=bajo|sin, minimo, page, limit)
- `GET /api/productos/:id`
- `POST /api/productos` (multipart/form-data)
- `PUT /api/productos/:id` (multipart/form-data)
- `DELETE /api/productos/:id`
- `GET /api/productos/descargar/:filename`

### Movimientos
- `POST /api/movimientos`
- `GET /api/movimientos`
- `GET /api/movimientos/maquina/:maquina_id`
- `GET /api/movimientos/estadisticas/dashboard`

## 🔧 Troubleshooting

### Puerto 5000 en uso
```bash
PORT=5001 npm start
```

### Login no funciona
```bash
npm run init-db
```

## 📄 Licencia

Este proyecto está bajo licencia ISC.
