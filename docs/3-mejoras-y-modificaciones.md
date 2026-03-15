# 🔧 ZeroTrace — Mejoras y Modificaciones Recomendadas

> **Auditoría completa · Marzo 2026**
> Clasificación: 🔴 Crítico · 🟠 Alto · 🟡 Medio · ⚪ Bajo

---

## Índice

1. [Seguridad](#1-seguridad)
2. [Código y Arquitectura](#2-código-y-arquitectura)
3. [UI / UX](#3-ui--ux)
4. [Nuevas Funcionalidades (alineadas al PRD)](#4-nuevas-funcionalidades-alineadas-al-prd)
5. [Rendimiento](#5-rendimiento)
6. [DevOps y Calidad](#6-devops-y-calidad)

---

## 1. Seguridad

### 🔴 SEC-01: Rate limiting inexistente

**Problema:** Las rutas `/api/imap/*` no tienen rate limiting. Un atacante puede hacer fuerza bruta de credenciales IMAP a través de la API.

**Solución:** Implementar rate limiting basado en IP en las serverless functions. Opciones:
- **Upstash Ratelimit** (ya compatible con la excepción Redis del PRD): contador IP → max 5 intentos/minuto.
- Header-based con `x-forwarded-for` + Map en memoria como fallback.

```ts
// Pseudo-implementación
import { Ratelimit } from "@upstash/ratelimit";
const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "60 s") });
```

---

### 🔴 SEC-02: Sin validación/sanitización de inputs en API

**Problema:** Las rutas API confían ciegamente en el body JSON. No se valida que `email` sea un email válido, que `imapHost` no sea un hostname interno (SSRF), ni que `uids` sean realmente números.

**Solución:**
- Validar `email` con regex RFC 5322 simplificado.
- Validar `imapHost` contra una allowlist de dominios IMAP conocidos, o al menos verificar que no apunte a `127.0.0.1`, `localhost`, redes privadas (10.x, 192.168.x).
- Validar que cada elemento de `uids[]` es un entero positivo.
- Máximo de UIDs por request (ej: 500) para evitar payloads destructivos masivos.

```ts
// Ejemplo de validación SSRF
const BLOCKED_HOSTS = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;
if (BLOCKED_HOSTS.test(imapHost)) {
    return NextResponse.json({ error: "Host no permitido" }, { status: 400 });
}
```

---

### 🟠 SEC-03: Console.logs filtran datos del usuario

**Problema:** `connect/route.ts` logea `console.log("-> Body parsed successfully", { email })` y `console.log("-> Total INBOX messages:", totalMessages)`. En producción en Vercel, estos logs son persistentes y accesibles.

**Solución:** Eliminar todos los `console.log` de las API routes o reemplazarlos con un logger que se desactive en producción.

---

### 🟠 SEC-04: Credenciales viajan sin protección adicional

**Problema:** Las credenciales viajan en el body JSON sobre HTTPS, lo cual es seguro en tránsito. Sin embargo, no hay expiración temporal ni token de sesión, lo que permite replay attacks si alguien captura la request.

**Solución (futuro):** Implementar un flujo de token efímero:
1. `/api/imap/connect` valida credenciales → devuelve un `sessionToken` (JWT firmado, exp: 10 min).
2. Las rutas `/scan` y `/delete` requieren este token en vez de credenciales raw en cada petición.
3. El token encripta las credenciales con AES-256-GCM y una clave del servidor.

> Compatibilidad PRD: El token vive en React state (no cookies). Las credenciales nunca se envían en más de una request.

---

### 🟡 SEC-05: No hay protección CSRF

**Problema:** Las API routes son POST simples sin token CSRF. Cualquier sitio puede enviar un formulario POST a `/api/imap/scan` si el usuario está en la misma red.

**Solución:** Verificar el header `Origin` o `Referer` en las API routes:
```ts
const origin = request.headers.get("origin");
if (origin !== "https://zerotrace.vercel.app") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

---

### 🟡 SEC-06: localStorage para contadores globales

**Problema:** Los contadores (`zeroTraceGlobalStats`) están en `localStorage`, lo que los hace manipulables por el usuario y no representan estadísticas globales reales (solo del navegador/dispositivo actual).

**Solución:** Migrar a **Upstash Redis** (permitido por el PRD) con un endpoint `/api/stats` para `INCR` atómico de contadores globales. Fetchar desde el frontend vía GET.

---

## 2. Código y Arquitectura

### 🔴 CODE-01: `DashboardStep.tsx` es un God Component (814 líneas)

**Problema:** Un único componente maneja: header, 4 paneles del acordeón, botón de eliminación, cálculos de selección, modal de confirmación, modal de resumen, toast system y lógica de desuscripción.

**Refactoring propuesto:**

```
components/
├── dashboard/
│   ├── DashboardStep.tsx          ← Orquestador (≤150L)
│   ├── DashboardHeader.tsx        ← Header sticky
│   ├── ScanSummaryCard.tsx        ← Card de "Limpieza Lista"
│   ├── panels/
│   │   ├── AccordionPanel.tsx     ← Componente genérico reutilizable
│   │   ├── ClanPanel.tsx          ← Lógica específica del Clan
│   │   ├── PueblosPanel.tsx       ← Lógica específica de Pueblos
│   │   ├── HubPanel.tsx           ← Lógica del Hub + Desuscripción
│   │   └── SpamPanel.tsx          ← Lógica del Radar
│   ├── DeleteFooter.tsx           ← Footer fijo
│   ├── ConfirmModal.tsx           ← Modal de confirmación
│   ├── SummaryModal.tsx           ← Modal de resumen final
│   └── Toast.tsx                  ← Sistema de toasts
├── AuthStep.tsx
└── shared/
    └── utils.ts                   ← formatBytes, getNameFromEmail, etc.
```

---

### 🟠 CODE-02: Interfaces duplicadas entre frontend y backend

**Problema:** Los tipos `ClanRemitente`, `PuebloFantasma`, `HubDesuscripcion`, `SpamGroup` están definidos tanto en `scan/route.ts` como en `DashboardStep.tsx`.

**Solución:** Crear un fichero compartido de tipos:
```
types/
└── imap.ts   ← Exporta ClanRemitente, PuebloFantasma, HubDesuscripcion, SpamGroup, ScanData
```

---

### 🟠 CODE-03: Lógica de `getProviderConfig` duplicada

**Problema:** Existe en `AuthStep.tsx` (client) y de forma diferente como `getImapConfig` en `connect/route.ts` (server). Además, `connect/route.ts` no soporta iCloud ni AOL, pero el frontend sí.

**Solución:** Unificar en un módulo compartido `lib/imap-providers.ts` importable tanto por el client como por el server.

---

### 🟠 CODE-04: El endpoint `/api/imap/connect` no se usa

**Problema:** Ningún componente del frontend llama a `/api/imap/connect`. Es código muerto desde que `page.tsx` llama directamente a `/scan`.

**Solución:** Eliminar o reconvertir en un endpoint de pre-validación rápida de credenciales (sin escaneo) para mejorar el UX de login.

---

### 🟡 CODE-05: Selección de items por INDEX es frágil

**Problema:** Los items seleccionados se identifican como `"clan-0"`, `"clan-1"`, etc., donde el número es el **índice del array**. Si el array se reordena o se borran elementos, los índices cambian pero los IDs seleccionados no se actualizan correctamente.

**Solución:** Usar el `email` (o un hash `email+uid`) como identificador único en vez de índices numéricos.

---

### 🟡 CODE-06: Fecha hardcodeada en scan

**Problema:** `scan/route.ts` línea 98: `const currentYear = 2024;`. Esto provoca que los "Pueblos Fantasma" (>2 años) no funcionen correctamente en 2026.

**Solución:** Usar `new Date().getFullYear()` directamente.

---

### 🟡 CODE-07: Función `formatBytes` duplicada

**Problema:** Definida identicamente en `AuthStep.tsx` (L58) y `DashboardStep.tsx` (L108).

**Solución:** Mover a `lib/utils.ts` o `shared/utils.ts`.

---

### ⚪ CODE-08: `package.json` con nombre genérico

**Problema:** `"name": "temp_app"` debería ser `"zerotrace"`.

---

## 3. UI / UX

### 🟠 UX-01: Implementar "Seleccionar Todo" por panel

**Problema:** Para borrar 200 remitentes del Clan, el usuario debe marcar 200 checkboxes individualmente.

**Solución:** Añadir un checkbox/botón "Seleccionar todos" en la cabecera de cada panel cuando está expandido:

```tsx
<button onClick={() => selectAllFromPanel("clan")}>
    ☑️ Seleccionar todos ({panel.length})
</button>
```

---

### 🟠 UX-02: Virtualización de listas largas

**Problema:** Con listas de 500+ items, se renderizan 500+ nodos DOM simultáneamente. Esto produce lag notable en móviles de gama media.

**Solución:** Implementar windowing con paginación simple (20 items por carga, botón "Ver más"):
```tsx
const [visibleCount, setVisibleCount] = useState(20);
// Renderizar solo los primeros `visibleCount` items
// Botón "Cargar más" incrementa en 20
```

> Nota: Evitar añadir dependencias como `react-virtualized` para mantener las reglas del PRD de cero dependencias extras.

---

### 🟠 UX-03: Agrupar Pueblos Fantasma por año

**Problema:** Los correos antiguos se listan individualmente sin agrupar, haciendo imposible la limpieza eficiente.

**Solución:** Agrupar por año con sub-headers colapsables:
```
> 📅 2020 (47 correos — 120 MB)
    ☐ Newsletter XYZ — 3 MB
    ☐ Factura ABC — 500 KB

> 📅 2019 (128 correos — 340 MB)
    ...
```

---

### 🟡 UX-04: Onboarding post-escaneo

**Problema:** Al llegar al Dashboard, los 4 paneles están cerrados. Un usuario nuevo no entiende que debe expandir, marcar, y borrar.

**Solución:** Auto-expandir el primer panel con más resultados y mostrar un tooltip-guía animado:
```
"👆 Abre un panel, marca lo que no quieras, y pulsa Eliminar abajo."
```

---

### 🟡 UX-05: Progreso de escaneo real, no fake

**Problema:** La barra de progreso usa `Math.random()` y muestra siempre "Analizando 2000 correos" sin importar el buzón.

**Solución (sin SSE):** Dividir el escaneo en fases y usar texto descriptivo:
1. "Conectando con tu servidor de correo…" (0-15%)
2. "Clasificando remitentes…" (15-40%)
3. "Detectando newsletters…" (40-60%)
4. "Escaneando correo antiguo…" (60-80%)
5. "Analizando spam…" (80-95%)
6. "¡Listo!" (100%)

**Solución avanzada (con SSE):** Implementar Server-Sent Events en `/api/imap/scan` para enviar progreso real al cliente.

---

### 🟡 UX-06: Copyright dinámico

**Problema:** Footer dice `© 2024`.

**Solución:** `© {new Date().getFullYear()} ZeroTrace.`

---

### 🟡 UX-07: Accesibilidad — quitar `userScalable: false`

**Problema:** Desactiva el zoom en móvil, violando WCAG 2.1 Level AA Success Criterion 1.4.4.

**Solución:** Cambiar `userScalable: false` → `userScalable: true` en `layout.tsx`.

---

### ⚪ UX-08: Icono PWA sobredimensionado

**Problema:** `icono-zerotrace.png` pesa **1.7 MB** para un icono de 192x192 / 512x512.

**Solución:** Comprimirlo con TinyPNG o convertir a WebP. Debería ser <50KB. Además, crear versiones reales de 192×192 y 512×512 en vez de usar la misma imagen para ambos tamaños.

---

### ⚪ UX-09: Duplicación de carga de Google Fonts en `layout.tsx`

**Problema:** Material Symbols se carga dos veces con `<link>` casi idénticos:
```html
<link href="...Material+Symbols+Outlined:wght@100..700,0..1..." />
<link href="...Material+Symbols+Outlined:wght,FILL@100..700,0..1..." />
```

**Solución:** Unificar en una única línea que incluya ambos ejes (wght, FILL).

---

## 4. Nuevas Funcionalidades (alineadas al PRD)

### 🟠 FEAT-01: Contadores Globales Reales (Redis/Upstash)

El PRD permite explícitamente una DB en memoria para contadores globales anónimos. Actualmente los contadores son locales (`localStorage`), lo que significa que cada usuario solo ve sus propios números.

**Implementación:**
1. Crear proyecto en Upstash Redis (free tier: 10K req/día).
2. `POST /api/stats/increment` → `INCRBY zerotrace:mails {count}` y `INCRBY zerotrace:bytes {bytes}`.
3. `GET /api/stats` → devuelve `{ mails, bytes, co2 }`.
4. El `AuthStep.tsx` hace fetch al montar para mostrar totales reales globales.

---

### 🟡 FEAT-02: Soporte Multi-Carpeta

Actualmente solo se escanea `INBOX`. Muchos proveedores tienen carpetas como `Promotions`, `Social`, `Updates` (Gmail labels como carpetas IMAP):

**Propuesta:**
1. Listar carpetas IMAP con `client.list()`.
2. Ofrecer un selector de carpetas post-login.
3. Escanear múltiples carpetas en secuencia.

---

### 🟡 FEAT-03: Exportar datos de sesión a CSV

Antes de destruir la sesión, permitir al usuario descargar un CSV con la lista de remitentes y sus conteos.

```
Remitente, Correos, Tamaño (MB), Categoría
newsletter@example.com, 47, 12.3, Clan
```

Esto no viola la política zero-data porque la exportación ocurre en el navegador del usuario.

---

### 🟡 FEAT-04: Escaneo de más de 2000 correos

El límite actual de 2000 mensajes es una restricción de timeout de serverless (10-60s). Soluciones:

1. **Paginación del escaneo:** Dividir en chunks de 500, hacer 4 llamadas API secuenciales desde el cliente y mergear los resultados.
2. **Streaming (SSE):** Mantener una única conexión IMAP y enviar resultados parciales al cliente.

---

### ⚪ FEAT-05: Preview del asunto del correo

En el panel Clan, mostrar un preview (último asunto o lista de asuntos) para que el usuario sepa **qué** tipo de correos está borrando de cada remitente, no solo el nombre.

---

### ⚪ FEAT-06: Detección de correos grandes (Heavy Mail)

Añadir un 5º panel: "📦 Correos pesados" que liste los N correos más grandes del buzón (>5 MB), independientemente de remitente o antigüedad.

---

## 5. Rendimiento

### 🟠 PERF-01: La blocklist de spam se descarga en cada request

**Problema:** `getSpamDomains()` usa `fetch` con `next: { revalidate: 86400 }`, pero en serverless de Vercel, cada cold start re-descarga los ~35K dominios de la blocklist porque no hay caché compartida entre invocaciones.

**Solución:** Cachear la lista en una variable global del módulo (que persiste entre invocaciones warm):

```ts
let cachedDomains: Set<string> | null = null;
let cachedAt = 0;

async function getSpamDomains(): Promise<Set<string>> {
    if (cachedDomains && Date.now() - cachedAt < 86400_000) return cachedDomains;
    // ... fetch ...
    cachedDomains = result;
    cachedAt = Date.now();
    return result;
}
```

---

### 🟡 PERF-02: La conexión IMAP se crea nueva para scan y luego otra para delete

**Problema:** El usuario hace scan (1ª conexión IMAP) y luego delete (2ª conexión IMAP). Cada conexión IMAP implica TCP handshake + TLS + IMAP login.

**Solución a futuro:** Implementar un sistema de sesiones efímeras que reutilicen la conexión IMAP durante la vida útil de la sesión del usuario (complejo en serverless, posible con Vercel KV).

---

### 🟡 PERF-03: Todo el componente DashboardStep re-renderiza por cada checkbox

**Problema:** `selectedItems` cambia en cada click, causando re-render de todo el componente de 814 líneas + recalcular `totalSelectedMails` y `totalSelectedBytes`.

**Solución:** Extraer cada panel en su propio componente envuelto en `React.memo`, y mover la selección a un `useReducer` o `useContext`.

---

## 6. DevOps y Calidad

### 🟡 DEV-01: Sin tests unitarios ni E2E

**Problema:** No hay ningún fichero de test. Las API routes con lógica de parsing de headers, validación de fechas y clasificación de correos son candidatas ideales para tests unitarios.

**Solución mínima:**
- Añadir `vitest` como devDependency.
- Test unitarios para `extractHeader()`, `getProviderConfig()`, `formatBytes()`, `getNameFromEmail()`.
- Test de integración para las API routes con mocks de ImapFlow.

---

### 🟡 DEV-02: Sin Prettier ni formato consistente

**Problema:** Mezcla de CRLF y LF, tabs inconsistentes, sin configuración de Prettier.

**Solución:** Añadir `.prettierrc`, `lint-staged`, y un script `format` en `package.json`.

---

### ⚪ DEV-03: Sin headers de seguridad HTTP

**Problema:** `next.config.mjs` está vacío. No hay `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, etc.

**Solución:** Configurar headers de seguridad en `next.config.mjs`:

```js
const nextConfig = {
    async headers() {
        return [{
            source: "/(.*)",
            headers: [
                { key: "X-Frame-Options", value: "DENY" },
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
            ]
        }];
    }
};
```

---

## Resumen Ejecutivo — Tabla de Prioridades

| ID | Tipo | Severidad | Esfuerzo | Descripción |
|---|---|---|---|---|
| SEC-01 | Seguridad | 🔴 | Medio | Rate limiting en API |
| SEC-02 | Seguridad | 🔴 | Bajo | Validación de inputs y anti-SSRF |
| CODE-01 | Código | 🔴 | Alto | Refactorizar DashboardStep (God Component) |
| SEC-03 | Seguridad | 🟠 | Bajo | Eliminar console.logs con datos sensibles |
| CODE-02 | Código | 🟠 | Bajo | Unificar interfaces en `types/imap.ts` |
| CODE-03 | Código | 🟠 | Bajo | Unificar `getProviderConfig` |
| CODE-04 | Código | 🟠 | Bajo | Eliminar endpoint muerto `/connect` |
| UX-01 | UX | 🟠 | Bajo | "Seleccionar todo" por panel |
| UX-02 | UX | 🟠 | Medio | Virtualización de listas |
| UX-03 | UX | 🟠 | Medio | Agrupar Pueblos por año |
| FEAT-01 | Feature | 🟠 | Medio | Contadores globales reales (Upstash) |
| PERF-01 | Perf | 🟠 | Bajo | Cache global de blocklist spam |
| SEC-04 | Seguridad | 🟠 | Alto | Token de sesión efímero |
| SEC-05 | Seguridad | 🟡 | Bajo | Verificar header Origin |
| CODE-05 | Código | 🟡 | Bajo | IDs por email en vez de índice |
| CODE-06 | Código | 🟡 | Bajo | Quitar año hardcodeado (2024) |
| CODE-07 | Código | 🟡 | Bajo | Deduplicar `formatBytes` |
| UX-04 | UX | 🟡 | Bajo | Onboarding post-escaneo |
| UX-05 | UX | 🟡 | Medio | Progreso de escaneo realista |
| UX-07 | UX | 🟡 | Bajo | Quitar `userScalable: false` |
| FEAT-02 | Feature | 🟡 | Alto | Soporte multi-carpeta |
| FEAT-03 | Feature | 🟡 | Bajo | Exportar sesión a CSV |
| FEAT-04 | Feature | 🟡 | Alto | Escaneo >2000 correos |
| DEV-01 | DevOps | 🟡 | Medio | Tests unitarios con Vitest |
| DEV-02 | DevOps | 🟡 | Bajo | Prettier + lint-staged |
| DEV-03 | DevOps | ⚪ | Bajo | Headers de seguridad HTTP |
| UX-06 | UX | ⚪ | Bajo | Copyright dinámico |
| UX-08 | UX | ⚪ | Bajo | Comprimir icono PWA |
| UX-09 | UX | ⚪ | Bajo | Deduplicar Material Fonts link |
| CODE-08 | Código | ⚪ | Bajo | Nombre en package.json |
| FEAT-05 | Feature | ⚪ | Medio | Preview del asunto |
| FEAT-06 | Feature | ⚪ | Medio | Panel de correos pesados |
