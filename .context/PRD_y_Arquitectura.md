# ZERO-TRACE: Privacy-First Mail Cleaner
## Documento de Contexto y Arquitectura Core

### 1. Filosofía Estricta: ZERO-DATA RETENTION (Stateless)
- **Regla de Oro:** ESTÁ PROHIBIDO el uso de bases de datos persistentes (SQL, NoSQL, Prisma, etc.) para almacenar información del usuario (emails, contraseñas, metadatos, UIDs).
- **Procesamiento Volátil:** Todo el procesamiento (conexiones IMAP, escaneo) ocurre en memoria y se destruye al finalizar el request HTTP.
- **Credenciales:** Las "App Passwords" residen en el estado del cliente (React) y viajan en el payload de cada petición. Nunca se guardan en el servidor.
- **Excepción:** Solo se permite una DB en memoria (Redis/Upstash) para contadores GLOBALES y ANÓNIMOS de impacto (CO2 ahorrado, Mails borrados).

### 2. Stack Tecnológico
- **Frontend:** Next.js 14 (App Router), React, TypeScript.
- **Estilos:** Tailwind CSS. Estética "Glassmorphism" estricta (Mobile-first, fondos oscuros bg-slate-900, paneles translúcidos bg-white/10 con backdrop-blur).
- **Backend:** Vercel Serverless Functions (Node.js runtime). *Importante: NO usar Edge runtime para las rutas de API que conecten con IMAP, ya que Edge no soporta Sockets TCP/TLS nativos requeridos por `imapflow`.*

### 3. Flujo MVP
1. **Landing / Auth:** Usuario introduce Email y App Password.
2. **Dashboard (Escaneo en memoria):** Muestra "Clan de Remitentes" (agrupado por From), "Pueblos Fantasma" (no leídos antiguos) y "Hub Desuscripción" (List-Unsubscribe).
3. **Limpieza:** Ejecución de borrado IMAP en lotes y destrucción de sesión.