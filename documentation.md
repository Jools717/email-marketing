# Documentación del Proyecto: Email Marketing & Dashboard México

Este documento explica de forma detallada la arquitectura y el flujo de trabajo de la solución integral desarrollada, la cual se compone de tres pilares principales.

---

## 1. Importación y Manejo de Datos (Big Data)

La base del sistema reside en la información de establecimientos a lo largo de México (provenientes del INEGI).
Dado que el archivo principal (`comercio-al-por-menor-inegi.csv`) tiene un peso superior a **1.2 GB**, su procesamiento requirió un enfoque especial.

### Flujo de Importación
- Se diseñó el script `scripts/import_inegi_csv.ts`.
- **Lectura por Flujos (Streams):** Para no saturar la memoria RAM, el archivo se lee línea por línea.
- **Conversión de Codificación:** Utiliza `iconv-lite` para leer el archivo desde formato `ISO-8859-1` y convertirlo a `UTF-8`, garantizando la correcta visualización de acentos y caracteres especiales.
- **Inserción por Lotes:** La información extraída no se inserta una a una. Se agrupan registros de 2,000 en 2,000 para insertarlos en bloque en PostgreSQL, garantizando altísima velocidad y estabilidad de red.

---

## 2. Presentación Visual (Frontend para Mayoristas)

Para atraer a los mayoristas, se desarrolló un frontend moderno con **Next.js** y **Tailwind CSS**. Este sistema se diseñó para alojarse fácilmente en plataformas como Vercel.

### Características del Dashboard
- **Arquitectura de APIs Rápidas**: El frontend no carga toda la base de datos de golpe. Posee una API para estadísticas (`/api/stats`) y otra paginada (`/api/locations`) para búsquedas.
- **Vista de Directorio**: Una tabla de datos completa donde el usuario puede buscar empresas por nombre o municipio, y aplicar un filtro rápido por estado.
- **Vista de Mapa**: Al estar trabajando con coordenadas (latitud/longitud), se integró `react-leaflet`. Por temas de rendimiento, el mapa muestra hasta 1000 puntos clave dependiendo de los filtros (para no colapsar la memoria del navegador).

---

## 3. Marketing Automatizado (Backend)

Una vez que se tiene una base de datos perfilada, el flujo inicial de marketing entra en acción.

### Proceso de Envío
1. El sistema lee registros de PostgreSQL que cumplen con una calificación (`score >= 7`).
2. Implementa **Batch Processing** (Envío por lotes) con pausas entre cada envío (ej. 2 segundos) para que la actividad parezca orgánica y evitar caer en las bandejas de *spam*.
3. Genera el contenido dinámicamente inyectando variables (como el nombre de la empresa) en una plantilla HTML.
4. Envía el correo mediante SMTP (`nodemailer`) y arroja un informe de éxito/error en la consola.

---

## 4. Tracking y Analítica Avanzada (B2B Intelligence)

Para medir el éxito de las campañas y entender el comportamiento de los clientes potenciales, se implementó una infraestructura de medición robusta utilizando **Google Tag Manager (GTM)** y **Google Analytics 4 (GA4)**.

### Identificadores del Proyecto
- **GTM Container ID:** `GTM-MRPVGSPK`
- **GA4 Measurement ID:** `G-JZPXB9HYV4`

### Estrategia de Atribución y Persistencia
El sistema captura parámetros críticos de la URL (`ref`, `empresa`, `email` y UTMs) al momento de que el usuario aterriza en el dashboard. 
- **Persistencia:** Estos datos se almacenan en el `localStorage` del navegador bajo la llave `atribucion_marketing_mexico`. Esto garantiza que si el usuario regresa días después sin el enlace original, sus acciones sigan atribuidas a la campaña inicial.
- **Identificación:** Se prioriza el envío del `lead_id`, `company_name` y `user_email` en cada evento para un análisis de embudo individualizado.

### Eventos Personalizados Implementados

| Evento GTM | Descripción | Parámetros Clave |
| :--- | :--- | :--- |
| `user_identified` | Se dispara al detectar un nuevo lead llegando desde el email. | `lead_id`, `company_name`, `user_email`, UTMs. |
| `dashboard_search` | Captura búsquedas y uso de filtros (sector/estado). | `search_string`, `sector_filter`, `state_filter`. |
| `tab_change` | Mide la preferencia entre vista de Tabla o Mapa. | `tab_name` (Directorio o Mapa). |
| `whatsapp_contact` | Clic en el botón flotante de contacto. | `platform`, `location`. |
| `promotion_banner_click` | Interés en asesoría personalizada (Calendly). | `banner_name`, `action`. |
| `virtual_page_view` | Seguimiento de navegación en la Single Page App. | `page_path`, `page_search`. |

### Configuración en Google Tag Manager
Para que el flujo funcione, se configuraron los siguientes elementos en el contenedor:
1.  **Variables de Capa de Datos (Data Layer Variables):** Una por cada parámetro enviado desde el código (ej. `{{dlv - lead_id}}`).
2.  **Activadores (Triggers):** De tipo "Evento personalizado" que coinciden exactamente con los nombres de la tabla anterior.
3.  **Etiqueta de Google (Google Tag):** La base que conecta con `G-JZPXB9HYV4` disparada en todas las páginas.
4.  **Etiquetas de Evento GA4:** Una etiqueta por cada trigger, mapeando las variables de capa de datos a parámetros de evento de Analytics.

### Modo Debug (Depuración)
Se ha habilitado el parámetro `debug_mode: true` en el código de producción de forma temporal para facilitar la monitorización en tiempo real desde el **DebugView** de Google Analytics 4 sin necesidad de usar el emulador de GTM.

