# 🧼 Mr Clean Sneakers — Sistema Web de Gestión y Notificaciones

Sistema web profesional, seguro y de alto rendimiento diseñado a medida para **Mr Clean Sneakers** (Limpieza y Restauración de Calzado).

---

## 🌟 Características Principales

1. **Panel Administrativo Elegante**:
   - Resumen financiero y KPIs en tiempo real (Pedidos hoy, en proceso, listos, entregados, ingresos y saldos por cobrar).
   - Creación y edición de pedidos con múltiples pares de tenis, precios individuales, cálculo de totales y carga de fotografías **Antes/Después**.
   - Selector rápido de estado en 1 clic: `Recibido` → `En proceso` → `Listo` → `Entregado` → `Cancelado`.
   - Búsqueda en tiempo real (por nombre, número de orden `#MC-000001`, teléfono o estado) y filtros de estado.

2. **Página Pública del Cliente (Link Único y Seguro)**:
   - Acceso sin registro ni contraseña a través de token seguro aleatorio criptográfico: `/pedido/MC-a8F3kP92xL`.
   - **Línea de tiempo y barra de avance visual**: `RECIBIDO → EN PROCESO → LISTO → ENTREGADO`.
   - Galería comparativa de fotos Antes/Después con visor interactivo.
   - Botón directo para contactar a la tienda por WhatsApp.
   - Seguridad RLS en Supabase: Cero permisos de modificación para clientes.

3. **Automatización de WhatsApp (Meta Cloud API Oficial)**:
   - Generación e integración con Meta WhatsApp Cloud API v19.0+.
   - Plantillas oficiales de WhatsApp de categoría `UTILITY` para notificaciones instantáneas de recepción, aviso de retiro cuando el calzado esté **Listo** y mensaje de agradecimiento al **Entregar**.
   - **Lógica de Idempotencia**: Evita el envío duplicado accidental de mensajes.
   - Botón de envío directo mediante WhatsApp Web / App como alternativa en 1 clic.

4. **Generador de Código QR**:
   - Generación e impresión de código QR para recibos físicos o etiquetas.

---

## 🚀 Guía de Configuración Paso a Paso

### 1. Clonar e Instalar Dependencias Locales

```bash
cd MRCLEAN
npm install
npm run dev
```

El servidor local se iniciará en `http://localhost:5173`.

---

### 2. Configurar la Base de Datos en Supabase (Gratis)

1. Regístrate o inicia sesión en [Supabase.com](https://supabase.com/).
2. Crea un nuevo proyecto llamado **Mr Clean Sneakers**.
3. Ve a la sección **SQL Editor** en la consola de Supabase.
4. Abre y copia el contenido del archivo [`supabase/schema.sql`](./supabase/schema.sql) de este repositorio y presiona **Run**.
   - *Esto creará las tablas `orders`, `order_items`, `business_settings`, la secuencia autoincrementable `MC-000001`, los generadores de token seguro, los índices, el bucket de almacenamiento `orders-photos` y las políticas de seguridad RLS.*

5. Obtén tus credenciales API en Supabase:
   - Ve a **Project Settings > API**.
   - Copia la **Project URL** y el **anon public key**.

6. Crea un archivo `.env` en la raíz de tu proyecto:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

---

### 3. Configuración de Meta WhatsApp Cloud API (Oficial)

1. Inicia sesión en [Meta for Developers](https://developers.facebook.com/).
2. Crea una aplicación de tipo **Negocios (Business)** y agrega el producto **WhatsApp**.
3. En el panel de WhatsApp de Meta, copia:
   - **Phone Number ID**
   - **User Access Token** (Token de acceso temporal o permanente de sistema)
4. Ve a la sección **Plantillas de mensajes** (Message Templates) y crea las siguientes plantillas en idioma `Español (ES)` con categoría `UTILIDAD` (`UTILITY`):

   - **Plantilla 1: `mr_clean_nuevo_pedido`**
     ```text
     🧼 MR CLEAN SNEAKERS

     Hola {{1}} 👋

     Hemos recibido tus tenis correctamente.

     Orden: #{{2}}
     Total: {{3}}

     Puedes consultar el avance de tu pedido aquí:
     {{4}}
     ```

   - **Plantilla 2: `mr_clean_pedido_listo`**
     ```text
     🧼 MR CLEAN SNEAKERS

     ¡Hola {{1}}! 👋

     ¡Tus tenis ya están listos! 🔥👟

     Orden: #{{2}}
     Estado: ✅ LISTO

     Consulta los detalles de tu pedido:
     {{3}}
     ```

   - **Plantilla 3: `mr_clean_pedido_entregado`**
     ```text
     🧼 MR CLEAN SNEAKERS

     ¡Gracias por confiar en nosotros! 🤝

     Tu orden #{{1}} ha sido entregada correctamente. Esperamos verte nuevamente pronto. 👟✨
     ```

5. En el Panel Admin de Mr Clean Sneakers, haz clic en el icono de **Configuración ⚙️** (esquina superior derecha) e ingresa tu **Phone Number ID** y tu **Access Token**.

---

### 4. Despliegue en Vercel (Hosting Gratuito)

1. Sube tu código a GitHub.
2. Inicia sesión en [Vercel.com](https://vercel.com/) y haz clic en **Add New > Project**.
3. Importa el repositorio `MRCLEAN`.
4. En la sección **Environment Variables**, agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Haz clic en **Deploy**. ¡Tu sistema estará en vivo en segundos con certificado SSL gratuito (`https://mrclean.vercel.app`)!

---

## 🔒 Arquitectura de Seguridad RLS

- Los clientes solo pueden acceder a su propio pedido si cuentan con el token alfanumérico seguro (ej. `/pedido/MC-a8F3kP92xL`).
- Ningún parámetro id secuencial `/pedido/1` es expuesto.
- Las políticas RLS bloquean completamente cualquier intento de creación, actualización o eliminación por parte del rol anónimo (`anon`).
- Únicamente los administradores autenticados mediante Supabase Auth pueden gestionar las órdenes y subir fotografías.
