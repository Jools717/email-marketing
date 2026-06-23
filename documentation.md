# Presentación del Negocio

**Directorio Minorista** es una Agencia de Inteligencia de Datos y Partner de Crecimiento B2B.

Si tuvieras que presentar a Directorio Minorista como empresa ante un inversionista o un cliente grande, este sería el resumen de su identidad y propuesta de valor:

🚀 **Directorio Minorista: Inteligencia de Mercado para la Expansión Mayorista**  
Directorio Minorista se posiciona en la intersección del Big Data y la Estrategia Comercial. Nuestra misión es eliminar la incertidumbre en la búsqueda de clientes B2B, transformando datos masivos en oportunidades de negocio reales y accionables.

### ¿Qué hacemos? (Nuestros Pilares)
- **Inteligencia Geográfica de Mercado**: Procesamos y analizamos bases de datos a escala nacional (como el INEGI en México) para identificar con precisión quirúrgica dónde están los puntos de venta (minoristas) que tu empresa necesita.
- **Consultoría B2B Automatizada**: No creemos en el spam masivo. Diseñamos sistemas de comunicación que utilizan inteligencia artificial y datos variables para hablarle a cada prospecto por su nombre, entendiendo su sector y su potencial de compra.
- **Visualización Estratégica**: A través de nuestro Dashboard de Inteligencia, permitimos que los directores comerciales vean su mercado en mapas interactivos, filtren por zonas de oportunidad y tomen decisiones basadas en datos, no en suposiciones.
- **Trazabilidad y Atribución**: Sabemos exactamente quién hace clic, qué busca y qué le interesa. Nuestra infraestructura de tracking permite medir el retorno de inversión (ROI) de cada esfuerzo de marketing en tiempo real.

### Nuestra Filosofía: "Honestidad sobre Ventas"
A diferencia de otras plataformas de marketing, Directorio Minorista se presenta como un aliado consultivo. No buscamos "vender" en el primer contacto, sino ofrecer valor inmediato (un mapa de clientes potenciales) para construir una relación de confianza que desemboque en negocios de alto valor.

---

# Documentación del Proyecto: Email Marketing & Dashboard México

Este documento explica de forma detallada la arquitectura, estructura de código y flujo de trabajo de la solución integral desarrollada, la cual se compone de tres pilares principales.

---

## 1. Importación y Manejo de Datos (Big Data)

La base del sistema reside en la información de establecimientos a lo largo de México (provenientes del INEGI). Dado que el archivo principal (`comercio-al-por-menor-inegi.csv`) tiene un peso superior a **1.2 GB**, su procesamiento y optimización requirió el desarrollo de un pipeline de scripts especializados.

### Pipeline de Scripts de Base de Datos (`backend/scripts/`)

*   **`import_inegi_csv.ts` (Importación por Flujos):**
    *   **Lectura por Streams:** Para no saturar la memoria RAM del servidor, el archivo CSV se lee de forma secuencial utilizando streams.
    *   **Conversión de Codificación:** Utiliza `iconv-lite` para procesar el archivo codificado en `ISO-8859-1` y convertirlo a `UTF-8` al vuelo, asegurando la integridad de acentos y la letra ñ.
    *   **Inserción por Lotes (Bulk Import):** Los registros se acumulan y se insertan en transacciones agrupadas de **2,000 en 2,000**, reduciendo drásticamente las conexiones de red necesarias con PostgreSQL.
*   **`clean_database.ts` (Higiene y Depuración de Datos):**
    *   **Filtro de Contactabilidad:** Elimina registros que no cuenten con teléfono ni correo electrónico.
    *   **Filtro de Nombre Válido:** Borra registros con nombres genéricos inválidos (ej. `nom_estab` que sea NULL, vacío, o que contenga la cadena `"SIN NOMBRE"`). También elimina registros que contengan `"ABARROTES"` con una longitud menor a 12 caracteres para filtrar micro-negocios informales.
    *   **Filtro de Grandes Cadenas Corporativas:** Excluye registros que correspondan a grandes corporaciones o franquicias (como `OXXO`, `7-ELEVEN`, `CIRCULO K`, `TIENDAS NETO`, `TIENDAS 3B`, `BODEGA AURRERA`, `WALMART`, `SORIANA`, `CHEDRAUI`) para enfocar la base de datos únicamente en prospectos minoristas B2B independientes de interés.
    *   **Optimización Post-Limpieza:** Ejecuta un comando `VACUUM ANALYZE` en PostgreSQL para reclamar espacio en disco y actualizar las estadísticas del optimizador de consultas.
*   **`fix_duplicates.ts` (Control de Duplicados):**
    *   Elimina duplicaciones basadas en la clave única de establecimiento `clee` de INEGI, manteniendo únicamente el registro con el `id` numérico más bajo.
    *   Aplica un constraint de unicidad en la base de datos (`ALTER TABLE ... ADD CONSTRAINT unique_clee UNIQUE (clee)`) para prevenir futuras inserciones duplicadas.
*   **`map_sectors.ts` (Categorización y Mapeo):**
    *   Crea y rellena la columna `sector_limpio` en la tabla `comercio_minorista_inegi`.
    *   Ejecuta consultas comparativas de coincidencia de palabras clave (`nombre_act ILIKE '%keyword%'`) para agrupar los establecimientos en **10 sectores comerciales simplificados**:
        1.  *Alimentos y Abarrotes* (ej. semillas, minisupers, fruterías).
        2.  *Moda y Vestimenta* (ej. calzado, ropa, telas).
        3.  *Salud y Bienestar* (ej. farmacias, perfumerías, naturistas).
        4.  *Automotriz y Transporte* (ej. refaccionarias, llanteras, lubricantes).
        5.  *Ferretería y Construcción* (ej. ferreterías, vidrierías, pinturas).
        6.  *Hogar y Decoración* (ej. muebles, electrodomésticos, blancos).
        7.  *Tecnología y Electrónica* (ej. cómputo, telefonía).
        8.  *Entretenimiento y Deportes* (ej. juguetes, libros, instrumentos).
        9.  *Papelería y Regalos* (ej. papelerías, mercerías).
        10. *Otros Comercios* (por defecto para cualquier registro sin coincidencia).
*   **`add_tracking_columns.ts` (Migración de Campaña):**
    *   Prepara la tabla de destino `"leads-al-por-mayor-mexico"` añadiendo columnas de estado y control (`email_1_status` con valor predeterminado `'pendiente'`, `email_1_template`, `email_1_sent_at`, y `email_error`) para evitar reenvíos y registrar incidentes.
*   **`create_clicks_table.ts` (Infraestructura de Logs):**
    *   Crea la tabla `marketing_clicks_email_mexico` para almacenar el histórico de clics provenientes del correo de forma granular. Registra: `lead_id`, `fuente`, `medio`, `campana`, `contenido`, `fecha_clic`, `ip_usuario`, `user_agent` y la `url_completa`.
    *   Agrega índices sobre `lead_id` y `fecha_clic` para optimizar reportes en tiempo real.

---

## 2. Presentación Visual (Frontend para Mayoristas)

El frontend está desarrollado sobre **Next.js** y estilizado con **Tailwind CSS**. Está diseñado para ofrecer una experiencia interactiva fluida al consultar el directorio de establecimientos calificados.

### Estructura de Componentes Clave (`frontend/src/components/`)

*   **`Dashboard.tsx` (Núcleo de Estado):**
    *   Controla el estado global de la búsqueda (`search`), filtro por estado (`stateFilter`), filtro por categoría (`sectorFilter`), y la pestaña activa (`activeTab`).
    *   Al cargarse, lee los parámetros de la URL (UTMs y datos de lead) y coordina el envío de los eventos de analítica a Google Tag Manager.
*   **`TableTab.tsx` (Vista de Directorio):**
    *   Muestra un grid paginado e interactivo del directorio. Hace peticiones a `/api/locations` pasando parámetros de paginación y filtros en tiempo real.
*   **`MapTab.tsx` / `LeafletMap.tsx` (Visualización Geográfica):**
    *   Carga un mapa interactivo utilizando `react-leaflet`.
    *   **Optimización de Rendimiento:** Por cuestiones de memoria y procesamiento del navegador, el mapa limita dinámicamente la consulta a un máximo de **1,000 registros geográficos** según los filtros seleccionados, evitando congelamientos en dispositivos móviles o de gama baja.
*   **`WhatsAppButton.tsx` (Conversión de Contacto):**
    *   Botón flotante con micro-animaciones premium que abre un chat directo con el equipo comercial.
    *   **Enriquecimiento de Contexto:** Extrae datos del lead persistidos en el `localStorage` para generar automáticamente un mensaje personalizado, ej: *"Hola Alejandro, soy de la empresa [NombreEmpresa]. Me interesa saber más sobre el Directorio..."*.
*   **`PromotionBanner.tsx` (Banner de Captura):**
    *   Aparece con una transición suave en la cabecera del dashboard tras **15 segundos** de inactividad del usuario (usando `sessionStorage` para no molestar nuevamente si el usuario ya lo cerró). Invita a agendar una asesoría comercial.
*   **`GoogleTagManager.tsx` & `FacebookPixel.tsx` (Scripts de Terceros):**
    *   Componentes integrados con lógica de cliente (`'use client'`) encargados de inicializar y cargar de forma asíncrona y segura los scripts de GTM y Meta sin bloquear el renderizado inicial de la interfaz.

---

## 3. Marketing Automatizado (Backend)

La solución cuenta con un despachador masivo de correo electrónico proactivo ubicado en `backend/src/index.ts` que se encarga de ejecutar las campañas de marketing basadas en datos.

### Lógica de Ejecución del Envío (`backend/src/index.ts`)

1.  **Carga de Leads Calificados:** Consulta a la base de datos un lote (por defecto 100) de la tabla `"leads-al-por-mayor-mexico"` cuyo estado (`email_1_status`) sea `'pendiente'` o `'error'`, ordenados por fecha de creación.
2.  **Estrategia A/B Testing (Split 50/50):**
    *   El bucle itera sobre los leads alternando el diseño del correo basándose en el índice de iteración (`i % 2 === 0`).
    *   **Template `marketing`:** Envía un correo con diseño corporativo HTML detallando los beneficios y herramientas de la base de datos (utiliza el archivo `templates/marketing.html`).
        *   *Asunto:* `"El mapa exacto de tus próximos clientes 🗺️"`
    *   **Template `asesor`:** Envía un correo de estilo personal firmado por un consultor (Alejandro) centrado en una propuesta de valor de asesoría comercial (utiliza el archivo `templates/asesor.html`).
        *   *Asunto:* `"[Nombre de la Empresa] estás perdiendo más clientes."`
3.  **Procesamiento de Destinatarios Múltiples:** Soporta cadenas de correos separadas por comas (ej. `correo1@test.com, correo2@test.com`), enviando el mensaje a cada uno de forma individual.
4.  **Control de SPAM (Pausa Inteligente):** Incorpora una pausa configurable (`SLEEP_MS` por defecto de 2000ms) entre envíos para cumplir con las directivas de reputación de los servidores SMTP y evitar ser catalogados como SPAM.
5.  **Actualización de Estado:** Al finalizar la transacción del lead, actualiza la base de datos asignando el estado `'enviado'` o `'error'`, guardando la marca de tiempo exacta del envío (`email_1_sent_at`), el nombre de la plantilla inyectada, y registrando el error exacto (`email_error`) si lo hubiere.

### Configuración del Mailer (`backend/src/services/mailer.ts`)
*   Soporta conexiones a través del servicio nativo de **Gmail** o mediante un servidor **SMTP personalizado** (configurable mediante variables de entorno).
*   En SMTP personalizado, tiene deshabilitada temporalmente la verificación estricta de certificados TLS (`rejectUnauthorized: false`) para asegurar la compatibilidad con servidores de correo compartidos o autohospedados.
*   Inyecta dinámicamente variables del lead en la plantilla HTML: `{{nombre_empresa}}`, `{{enfoque_ventas}}`, `{{sector}}`, `{{base_url}}` y la URL de tracking `{{link_seguimiento}}`.

---

## 4. Tracking y Analítica Avanzada (B2B Intelligence)

La plataforma cuenta con un sistema cerrado de seguimiento y atribución para medir el rendimiento de la campaña.

### Parámetros de Atribución en URL (Link de Seguimiento)
El enlace inyectado en los correos contiene la siguiente estructura:
```
https://dominio.com/?utm_source=correo_directo_mexico&utm_medium=email_marketing_proactivo&utm_campaign=CAMPANA&utm_content=CONTENIDO&ref=LEAD_ID&empresa=EMPRESA&email=EMAIL
```

### Captura y Persistencia Local
Cuando el destinatario da clic en el correo y aterriza en el Dashboard:
1.  El componente `Dashboard.tsx` captura todos los parámetros URL.
2.  **Persistencia mediante LocalStorage:** Guarda un objeto JSON en el navegador del usuario bajo la clave `atribucion_marketing_mexico` que incluye la fecha de captura. Esto permite que si el usuario regresa directamente días después sin el enlace del correo, sus acciones posteriores (como contactar por WhatsApp o banner) se sigan atribuyendo a la campaña original.
3.  **Envío a DataLayer:** Inyecta en el objeto global `window.dataLayer` el evento personalizado `user_identified` con el correo, ID de lead y datos UTM.

### Endpoints de API de Analítica

#### **`POST /api/track-click` (Registro Interno en Base de Datos)**
Next.js expone este endpoint para guardar en PostgreSQL los logs de clics de los usuarios de forma directa, permitiendo auditorías y analítica interna sin depender exclusivamente de proveedores externos (Google/Meta).
*   **Payload esperado (JSON):**
    ```json
    {
      "lead_id": "123",
      "fuente": "correo_directo_mexico",
      "medio": "email_marketing_proactivo",
      "campana": "prospeccion_asesor",
      "contenido": "link_asesor_texto",
      "url_completa": "https://...",
      "user_agent": "Mozilla/..."
    }
    ```
*   El backend extrae la dirección IP del usuario del encabezado `x-forwarded-for` y guarda toda la información en la tabla `marketing_clicks_email_mexico`.

### Integración con Meta Pixel
El componente `FacebookPixel.tsx` inicializa el píxel de Meta (Facebook) y define los siguientes eventos:
-   **`PageView`**: Se dispara de forma automática en cada cambio de ruta (`pathname`) o parámetros de búsqueda (`searchParams`).
-   **`Search`**: Disparado en cada búsqueda o cambio de filtros en el dashboard, enviando los parámetros:
    ```javascript
    window.fbq('track', 'Search', {
      search_string: texto_buscado,
      content_category: sector_seleccionado,
      content_ids: [estado_seleccionado]
    });
    ```

### Resumen de Eventos en Capa de Datos (DataLayer de GTM)

| Evento GTM | Descripción | Parámetros Inyectados |
| :--- | :--- | :--- |
| `user_identified` | Registro del lead al llegar por primera vez desde el correo. | `lead_id`, `company_name`, `user_email`, UTMs. |
| `dashboard_search` | Búsqueda o filtrado de establecimientos en el Dashboard. | `search_string`, `sector_filter`, `state_filter`, lead_id, company_name. |
| `tab_change` | Cambio entre vista de Directorio (Tabla) y Mapa Interactivo. | `tab_name` (*"Directorio y Búsqueda"* / *"Mapa Interactivo"*), lead_id. |
| `whatsapp_contact` | Clic en el botón flotante de WhatsApp. | `platform` (*"whatsapp"*), `location` (*"floating_button"*), lead_id, empresa. |
| `promotion_banner_click` | Clic en el botón de asesoría del banner flotante. | `banner_name` (*"asesoria_mayorista"*), `action` (*"quiero_asesorarme"*), lead_id, empresa. |
| `virtual_page_view` | Navegación virtual dentro de la Single Page App. | `page_path`, `page_search`. |

---
© 2026 TomaPedidos B2B - Inteligencia Comercial.
