# DentalTrack

Aplicación Expo/React Native centrada en el paciente, con TypeScript y Supabase.

## Ejecutar en Windows

1. Descarga el ZIP de GitHub y extráelo en una carpeta de **C:**.
2. Copia tu archivo **`.env` en la raíz**, junto a `package.json` e `INICIAR_DENTALTRACK.bat`. Conserva ese nombre: no hace falta renombrarlo a `.env.local`.
3. Para las explicaciones mediante Brave, copiar también **`.env.education.local` en esa misma carpeta**. Esta clave se utiliza únicamente en el servicio local.
4.  doble clic en **`INICIAR_DENTALTRACK.bat`**. La primera vez descarga Node.js 24 LTS desde el sitio oficial en C:, instala las dependencias y prepara la aplicación. Necesita Internet durante esa instalación.
5. Abrir **http://127.0.0.1:8115/** e iniciar sesión cuenta test. 

### Archivos privados

`.env` contiene `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `.env.example` muestra los nombres. Nunca colocar `service_role`, secret keys ni la clave de Brave en una variable `EXPO_PUBLIC_*`.

`.env.education.local` contiene `BRAVE_ANSWERS_API_KEY`. El piloto contextual admite diez consultas externas al mes por instalación, sin guardar las respuestas. Los conceptos incluidos en el catálogo no consumen consultas. Esto no reemplaza el límite de facturación del proveedor

## Estructura

| Ruta | Contenido |
| --- | --- |
| `src/app` | Acceso, sesión y conexión con la ficha |
| `src/design/mobile` | Interfaz vigente, flujos y espacio del paciente |
| `src/domain` | Identidad dental neutral y reglas |
| `src/infra` | Adaptadores de Supabase y almacenamiento local |
| `src/features` | OCR, odontograma, explicaciones y notificaciones |
| `supabase/migrations` | Esquema reproducible, permisos y operaciones atómicas |
| `services` | OCR 8124, conceptos 8130 y servidor web 8115 |
| `scripts` | Arranque, compatibilidad y comprobaciones |
| `docs` | Documentación privada y entregables académicos; no incluida en Git |



