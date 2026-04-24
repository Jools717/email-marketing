# Email Marketing México & Dashboard INEGI

Sistema integral para el procesamiento, visualización y uso de datos de contacto de establecimientos minoristas en México.

## Componentes del Proyecto

El proyecto se divide en tres módulos principales:
1. **Email Marketing (Raíz)**: Envío de correos personalizados.
2. **Importación de Datos (`scripts/`)**: Procesamiento masivo de archivos CSV (1.2 GB+).
3. **Frontend (`frontend/`)**: Dashboard web interactivo creado con Next.js y Tailwind CSS para visualizar el directorio.

## Requisitos Previos

- **Node.js**: Versión 18 o superior.
- **PostgreSQL**: Base de datos para almacenar la información de los establecimientos.
- **Servicio SMTP**: Cuenta de correo (Gmail, Outlook, etc.) para el envío.

## Instalación y Configuración

1. Clona el repositorio e instala las dependencias del backend:
   ```bash
   cd backend
   npm install
   cd ..
   ```

2. Instala las dependencias del frontend:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. El archivo `.env` se encuentra en `backend/.env`. Copia ese mismo archivo a `/frontend/.env.local`.
   ```env
   # Database Configuration
   DB_HOST=tu_host
   DB_NAME=nombre_db
   DB_USER=usuario
   DB_PASS=contraseña
   DB_PORT=5432
   
   # Email Configuration
   EMAIL_SERVICE=gmail
   EMAIL_USER=tu-correo@gmail.com
   EMAIL_PASS=contraseña
   EMAIL_FROM="Tu Nombre <tu-correo@gmail.com>"
   ```

## Ejecución

### 1. Dashboard Web (Frontend)
Para levantar la interfaz gráfica y visualizar el mapa interactivo y la tabla de datos:
```bash
cd frontend
npm run dev
```
Accede a `http://localhost:3000`.

### 2. Importación de CSV (INEGI)
Si necesitas cargar un nuevo archivo CSV masivo a la base de datos:
```bash
cd backend
npx ts-node scripts/import_inegi_csv.ts
```

### 3. Envío de Correos (Email Marketing)
Para correr la campaña de correos desde el backend:
```bash
cd backend
npm run dev
# o en producción:
# npm run build && npm start
```
