# Sistema de Inventario de Máquinas

Sistema completo de inventario desarrollado con **Node.js/Express** (Backend), **React** (Frontend) y **MySQL** (Base de Datos).

## 🚀 Características

- **Gestión de productos/máquinas**: Crear, editar y eliminar productos con ficha técnica (PDF) y ficha web.
- **Tipos de máquinas**: Módulo dedicado para crear/editar/eliminar tipos.
- **Gestor de Inventario**: Ingresos/Salidas en un solo módulo.
- **Escaneo de códigos**: Soporte con cámara (BarcodeDetector + ZXing) y modo “escanear una vez”.
- **Stock y alertas**: Indicadores de stock bajo y manejo de movimientos.
- **Autenticación**: Login con JWT y usuario admin por defecto.
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

Para cámara en móviles es obligatorio HTTPS.

1) Frontend build con API relativa:
```env
REACT_APP_API_URL=/api
```

```bash
cd frontend
npm run build
```

2) Caddyfile:
```
192.168.18.73:443 {
  tls internal

  handle /api/* {
    reverse_proxy 127.0.0.1:5000
  }

  handle {
    root * "G:/PROYECTO KRATOS/frontend/build"
    try_files {path} /index.html
    file_server
  }
}
```

3) Ejecutar Caddy:
```bash
caddy run --config "G:\PROYECTO KRATOS\caddyfile" --adapter caddyfile
```

Abrir `https://192.168.18.73`.

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
