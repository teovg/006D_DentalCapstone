# DentalTrack

Aplicación móvil y web B2C centrada en el paciente para organizar el seguimiento odontológico personal entre consultas, de forma independiente a los ERP clínicos.

---

## 1. Descripción del proyecto

- **¿Qué hace?** Permite al paciente mantener su propio odontograma interactivo (32 piezas permanentes con identidad canónica neutral y presentación FDI o Universal), digitalizar presupuestos y recetas mediante OCR con revisión y confirmación humana obligatoria, controlar pagos y saldos de forma separada al avance clínico, agendar citas multipieza, registrar atenciones multisesión, configurar recordatorios/cuidados y consultar el significado de prestaciones dentales con fuentes confiables.
- **¿A quién va dirigido?** Pacientes odontológicos adultos y familias que desean administrar su propio historial y el de sus dependientes sin perder trazabilidad al cambiar de dentista o clínica.
- **¿Qué problema resuelve?** La fragmentación del historial dental entre clínicas y la dificultad de los pacientes para interpretar presupuestos complejos, recordar indicaciones post-atención y controlar el avance real de sus tratamientos y pagos.

---

## 2. Tecnologías utilizadas

| Capa | Tecnologías |
| :--- | :--- |
| **Aplicación móvil y web** | Expo SDK 57, React Native 0.86, Expo Router, TypeScript estricto, React 19, Tailwind CSS v4 + Uniwind, sistema de diseño propio **«Porcelana»** (`src/ui/kit/*`), `react-native-odontogram`, Reanimated. |
| **Backend y Base de Datos** | Supabase (PostgreSQL con Row Level Security y Supabase Auth). |
| **Almacenamiento local** | Originales fotográficos/documentales 100 % locales en dispositivo (`expo-file-system` / `localOriginalStore*`), SQLite (`expo-sqlite`) para recibos de notificaciones nativas. |
| **Servicio OCR local (`:8124`)** | Node.js + **RapidOCR ** con respaldo automático **Tesseract.js en español** (`@tesseract.js-data/spa`), 100 % local sin subir imágenes a terceros. |
| **Ayuda contextual (`:8130`)** | Catálogo odontológico local curado + **MedlinePlus Web Service API en español (NIH/NLM)** gratuita y sin API key (con opción legada de Brave Search solo si se configura explícitamente). 
---

## 3. Arquitectura de la solución

DentalTrack separa la aplicación cliente, la persistencia clínica multi-cuenta en Supabase y dos microservicios locales desacoplados para OCR y ayuda contextual:

```text
[ Cliente Expo / React Native (Android · Web :8115) ]
   ├── Persistencia clínica y sesión ──► [ Supabase: Auth + PostgreSQL (RLS + RPCs atómicas) ]
   ├── Originales locales (ADR-001)  ──► [ Almacenamiento del dispositivo / SQLite ]
   ├── Digitalización revisable      ──► [ Servicio OCR local (:8124 · RapidOCR ONNX + Tesseract.js) ]
   └── «Qué significa» (C02)         ──► [ Servicio Educación (:8130 · Catálogo + MedlinePlus NIH ES) ]
```

Los diagramas visuales completos en español (Arquitectura, Modelo ER SQL, UML Casos de Uso, Clases, Secuencia, Componentes) se encuentran en la carpeta académica de documentación.

---

## 4. Instrucciones para ejecutar el proyecto



###  Ejecución local en Windows (sin Docker)


 Para iniciar los servicios localmente:
   - App web/móvil en desarrollo: `npm start` (o doble clic en `INICIAR_DENTALTRACK.bat` para el paquete compilado en `:8115`).
   - Servicio OCR local: `npm run ocr` (`http://127.0.0.1:8124`).
   - Servicio Educación C02: `npm run education` (`http://127.0.0.1:8130`).

### Variables de entorno y seguridad

- `.env` (no versionado) acepta `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **Nunca** colocar `service_role` ni claves secretas en variables `EXPO_PUBLIC_*`.
- Con Supabase configurado se exige inicio de sesión real y los errores de red nunca hacen fallback silencioso a demo.
- Para inicializar una instancia nueva de Supabase, aplicar las migraciones en orden desde `supabase/migrations/`.

---

## 5. Integrantes del equipo y roles

- **Asignatura:** Capstone (`PTY 4614 - 006D`) · **Sede Maipú** · **Docente:** Aldo Alberto Martínez

| Integrante | Rol principal | Responsabilidades |
| :--- | :--- | :--- |
| **Leo Gutiérrez** | Desarrollo móvil, backend y documentación | Arquitectura, desarrollo Expo/React Native, base de datos PostgreSQL/Supabase, servicios OCR/C02, Docker, integración, gestión y documentación técnica. |
| **Ignacio Contreras** | Diseño UX/UI y aseguramiento de calidad (QA) | Diseño UX/UI inicial, flujos de usuario, prototipo interactivo en Figma, plan/matriz de pruebas y ejecución de QA formal. |

---

## 6. Metodología de trabajo

El equipo trabajó bajo un **enfoque tradicional secuencial por fases e hitos (Cascada adaptada)** — si bien en la definición inicial de Fase 1 se consideró Scrum, en la ejecución real no se utilizaron sprints ni ceremonias formales, organizando el proyecto en fases verificables:

1. **Definición y requerimientos:** levantamiento del problema, contratos de vistas (V01–V39), dominio dental canónico y decisiones ADR.
2. **Diseño y arquitectura:** modelo relacional SQL con RLS, diseño visual del sistema «Porcelana», arquitectura de microservicios locales y despliegue Docker.
3. **Implementación por módulos:** odontograma anatómico, agenda/tratamientos/sesiones, documentos ADR-001, presupuestos/pagos, recetas/recordatorios y perfil/familia.
4. **Verificación y cierre:** pruebas unitarias y SQL reproducibles, auditoría de accesibilidad y documentación técnica/académica.

---

## 7. Estructura del repositorio

| Ruta | Contenido |
| :--- | :--- |
| `app/` | Rutas de Expo Router (`(auth)`, `(onboarding)`, `(app)/(tabs)`, detalles y captura) |
| `src/ui/` | Tokens y primitivas del sistema de diseño «Porcelana» (`tokens.ts`, `kit/*`) |
| `src/domain/` | Identidad dental canónica neutral y reglas de negocio |
| `src/features/` | Odontograma, seguimiento, documentos/OCR, recordatorios, educación C02 y perfil |
| `src/infra/` | Repositorios Supabase y almacenamiento local ADR-001 |
| `supabase/migrations/` | Esquema SQL reproducible, RLS y funciones RPC atómicas |
| `services/` | Servidores locales `web` (`:8115`), `ocr` (`:8124`) y `education` (`:8130`) |
