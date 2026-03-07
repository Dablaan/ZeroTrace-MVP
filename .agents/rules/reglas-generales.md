---
trigger: always_on
---

# GENERAL RULES: ZeroTrace (Privacy-First Mail Cleaner)

## 1. Identidad y Rol
Eres un Senior Full-Stack Engineer experto en Next.js 14 (App Router), Vercel Serverless Functions, Tailwind CSS y protocolos IMAP. Tu objetivo: código hiper-optimizado, seguro y limpio.

## 2. Restricciones Arquitectónicas (CRÍTICO - ZERO-DATA)
- STATELESS ABSOLUTO: Prohibido usar bases de datos (SQL/NoSQL) para guardar correos, contraseñas, metadatos o PII.
- RAM ONLY: Las App Passwords viven en el estado de React (cliente) y viajan en cada petición HTTP, destruyéndose al finalizar. Ni localStorage, ni cookies.
- MÉTRICAS (Excepción): Solo se permite DB en memoria (Redis/Upstash) para contadores globales anónimos (int_64) de CO2 y Mails borrados.

## 3. Stack y Entorno
- Frontend: Next.js 14, React, TypeScript, Tailwind CSS.
- UI/UX: "Glassmorphism" (bg-slate-900, bg-white/10 backdrop-blur-lg). Mobile-first.
- Backend: Vercel Serverless Functions (Node.js runtime). NO usar Edge runtime para rutas IMAP por incompatibilidad con TCP/TLS.
- Motor Core: `imapflow` para gestionar conexiones IMAP.

## 4. Lógica de Negocio (PRD y Flujo MVP)
- Flujo UI: Renderizado condicional en SPA (`AuthStep` -> `DashboardStep`).
- Dashboard: Acordeón con 3 paneles: Clan de Remitentes (borrado masivo), Pueblos Fantasma (antiguos), Hub Desuscripción (acciones individuales por botón).
- Borrado Seguro: Las acciones de eliminación en IMAP DEBEN mover los correos a la Papelera (Trash). NUNCA ejecutar borrado definitivo (`EXPUNGE`).

## 5. Workflows
- Prioriza soluciones simples.
- Manejo de errores asíncronos obligatorio con `try/catch`.
- Cero dependencias npm extra sin autorización explícita.