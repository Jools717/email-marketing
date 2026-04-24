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
