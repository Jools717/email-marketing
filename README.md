# Email Marketing (Colombia & México) & Dashboard B2B

Sistema integral para el procesamiento, visualización y uso de datos de contacto de establecimientos minoristas en México, integrado con campañas de email marketing automatizado (A/B testing) e infraestructura de atribución y tracking analítico (GTM y Meta Pixel).

## Componentes del Proyecto

El proyecto se divide en tres módulos principales:
1. **Email Marketing (Backend - `backend/`)**: Envío de correos personalizados, procesamiento por lotes, A/B testing y APIs de consulta.
2. **Importación y Preparación de Datos (`backend/scripts/`)**: Scripts de limpieza, de-duplicación, mapeo de sectores y migración de base de datos.
3. **Frontend (`frontend/`)**: Dashboard web interactivo creado con Next.js, Tailwind CSS y Leaflet para visualizar el directorio georreferenciado.

---

## Requisitos Previos

- **Node.js**: Versión 18 o superior.
- **PostgreSQL**: Base de datos para almacenar la información de los establecimientos y los logs de clicks.
- **Servicio SMTP o Cuenta Gmail**: Credenciales para el envío masivo o de prueba de correos.

---

## Instalación Rápida (Automatizada)

El proyecto incluye un instalador automático para Windows. Simplemente ejecuta en tu consola:
```bash
setup.bat
```
### ¿Qué hace este instalador?
1. **Verifica** la instalación local de Node.js.
2. **Instala** las dependencias del Backend (Nodemailer, PostgreSQL client, ts-node, etc.).
3. **Instala** las dependencias del Frontend (Next.js, Lucide React, Leaflet, etc.).
4. **Crea** los archivos de entorno `.env` en `backend/` y `.env.local` en `frontend/` con plantillas predefinidas.

---

## Configuración Manual y Variables de Entorno

Si prefieres configurar manualmente, instala las dependencias en ambos directorios:
```bash
# Dependencias Backend
cd backend && npm install && cd ..

# Dependencias Frontend
cd frontend && npm install --legacy-peer-deps && cd ..
```

### Configuración del archivo `.env` (Backend y Frontend)
El backend requiere un archivo `backend/.env`. Para el frontend, copia este archivo como `frontend/.env.local`.

```env
# Configuración de Base de Datos PostgreSQL
DB_HOST=localhost
DB_NAME=nombre_de_tu_db
DB_USER=usuario_postgres
DB_PASS=contrasena_postgres
DB_PORT=5432

# URL Base para enlaces de email marketing (URL del Frontend)
BASE_URL=http://localhost:3000

# Frecuencia de envío de correos (pausa en milisegundos entre envíos para evitar SPAM)
SLEEP_MS=2000

# --- OPCIÓN 1: Servicio GMAIL ---
EMAIL_SERVICE=gmail
GMAIL_USER=tu-cuenta@gmail.com
GMAIL_PASS=tu-contraseña-de-aplicación-gmail
GMAIL_FROM="Tu Nombre B2B <tu-cuenta@gmail.com>"

# --- OPCIÓN 2: Servidor SMTP Personalizado ---
# EMAIL_SERVICE=smtp
# SMTP_HOST=mail.tu-dominio.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=contacto@tu-dominio.com
# SMTP_PASS=tu-contraseña-smtp
# SMTP_FROM="Tu Nombre B2B <contacto@tu-dominio.com>"
```

---

## Pipeline de Preparación de la Base de Datos

Antes de ejecutar las plataformas, se debe inicializar y limpiar la base de datos de PostgreSQL ejecutando los scripts en `backend/` en el siguiente orden:

1. **Importación del CSV Masivo**:
   Carga el archivo de datos raw descargado del INEGI (ej. `comercio-al-por-menor-inegi.csv` de 1.2 GB+).
   ```bash
   cd backend
   npx ts-node scripts/import_inegi_csv.ts
   ```

2. **Limpieza e Higiene de Datos**:
   Elimina registros sin datos de contacto (teléfono y correo), nombres inválidos o genéricos (como "SIN NOMBRE") y remueve grandes cadenas corporativas (Oxxo, Walmart, 7-Eleven, etc.) para enfocar la base en minoristas independientes de valor.
   ```bash
   npx ts-node scripts/clean_database.ts
   ```

3. **Eliminación de Duplicados**:
   Elimina filas redundantes según el código único `clee` y agrega una restricción UNIQUE en la columna `clee`.
   ```bash
   npx ts-node scripts/fix_duplicates.ts
   ```

4. **Clasificación y Mapeo de Sectores**:
   Clasifica automáticamente las actividades comerciales en 10 sectores limpios estructurados (Alimentos, Moda, Salud, Ferretería, etc.) y crea la columna `sector_limpio`.
   ```bash
   npx ts-node scripts/map_sectors.ts
   ```

5. **Añadir Columnas de Campaña (Tracking)**:
   Añade columnas (`email_1_status`, `email_1_template`, `email_1_sent_at`, `email_error`) a la tabla `"leads-al-por-mayor-mexico"` para controlar el envío de emails.
   ```bash
   npx ts-node scripts/add_tracking_columns.ts
   ```

6. **Creación de Tabla de Registro de Clicks**:
   Crea la tabla `marketing_clicks_email_mexico` y sus índices para loguear cada redirección y click a nivel base de datos.
   ```bash
   npx ts-node scripts/create_clicks_table.ts
   ```

---

## Ejecución del Sistema

### 1. Levantar el Frontend (Dashboard Web)
Inicia el servidor Next.js para visualizar el dashboard:
```bash
cd frontend
npm run dev
```
Accede a `http://localhost:3000`.

### 2. Ejecutar la Campaña de Email Marketing (Backend)

> [!IMPORTANTE]
> #### 🇨🇴 ¿Cómo ejecutar la Campaña para COLOMBIA?
> Para iniciar o reanudar el envío automatizado de correos a la base de datos de **Colombia** (Tomapedidos), abre una terminal y ejecuta:
> ```bash
> cd backend
> npm run campaign:colombia
> ```
> *Este comando gestiona de forma inteligente el límite de envíos diarios, reanudaciones de lotes e invierte las plantillas para el Email 2 de seguimiento.*

#### 🇲🇽 Ejecutar Campaña para MÉXICO
```bash
cd backend
npm run campaign:mexico
# O el comando por defecto:
npm run dev
```
*(Para producción utiliza: `npm run build && npm start`)*

#### 🤖 Ejecución Automática Programada (Scheduler / Cron)
El backend cuenta con un planificador basado en `node-cron` que ejecuta las campañas automáticamente en los días y horarios que configures en `.env`:
```bash
cd backend
npm run scheduler
```
* **Variables en `.env`:**
  * `CAMPAIGN_CRON_SCHEDULE="0 9 * * 1-5"` (por defecto: Lun-Vie 9:00 AM)
  * `CAMPAIGN_COUNTRY="colombia"` (o `mexico`, o `both`)
  * `CAMPAIGN_TIMEZONE="America/Bogota"`

#### 📲 Notificaciones y Alertas por WhatsApp
Integrado con el bot Chabito (`POST /api/notify`):
- **Alerta automática si la campaña se detiene o falla.**
- **Notificación al iniciar y al finalizar con el resumen del lote.**
- **Prueba rápida de conexión:**
  ```bash
  cd backend
  npm run notify:test
  ```

### 3. Scripts de Utilidad y Pruebas (Backend)
- **Enviar Correo de Prueba**: Envía correos de prueba de las dos plantillas de A/B testing (`marketing` y `asesor`) a tu dirección configurada para inspección:
  ```bash
  npx ts-node src/test-email.ts
  ```
- **Inspección de Schema**: Muestra las columnas disponibles de la tabla de datos y una fila de muestra:
  ```bash
  npx ts-node src/inspect_schema.ts
  ```
- **Analizar Estado de Limpieza**: Imprime estadísticas rápidas de registros válidos y cadenas en la DB:
  ```bash
  npx ts-node src/analyze_cleanup.ts
  ```

---

## 📊 Google Tag Manager, Meta Pixel & Analytics

El sistema cuenta con una arquitectura de analítica web robusta en Next.js para medir conversiones B2B de leads procedentes de las campañas de correo.

### Eventos Implementados (DataLayer de GTM)
1. **`user_identified`**: Registra al lead al aterrizar en el dashboard desde el correo. Captura `lead_id`, `company_name`, `user_email`, y variables UTM.
2. **`dashboard_search`**: Captura búsquedas de texto y filtros aplicados (sector, estado).
3. **`tab_change`**: Mide si el usuario interactúa con la vista de **Directorio** o la de **Mapa**.
4. **`whatsapp_contact`**: Disparado al presionar el botón flotante de WhatsApp.
5. **`promotion_banner_click`**: Clic en el botón "Quiero Asesorarme" del banner superior.
6. **`virtual_page_view`**: Registra vistas de páginas virtuales en la SPA al cambiar de ruta o parámetros.

### Integración de Píxeles
- **Google Tag Manager**: Inyecta el contenedor base `GTM-MRPVGSPK` y envía automáticamente datos al DataLayer.
- **Meta Pixel (Facebook)**: Carga el script de Pixel, registra eventos `PageView` dinámicos y eventos `Search` con parámetros enriquecidos (texto buscado, sector y estado).
- **Persistencia Local**: Los datos de UTM, `lead_id`, `empresa` y `email` se guardan en el `localStorage` del navegador (`atribucion_marketing_mexico`) para que si el usuario regresa más tarde sin las UTMs, las conversiones de WhatsApp y el banner sigan atribuidas a la campaña inicial.

---
© 2026 TomaPedidos B2B - Inteligencia Comercial.
