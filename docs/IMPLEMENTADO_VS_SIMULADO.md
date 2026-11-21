# Implementado vs simulado · Hilo Rosa

> Basado en IDEA.md §9 y actualizado al cierre del código (21 nov 2026, 14:10 CDMX): **"integrado"** = el código está en `main`, desplegado en https://hilo-rosa.onrender.com y cubierto por pruebas (`uv run pytest -q`, incluida la prueba de punta a punta `app/tests/test_e2e_demo.py`). Todo dato es ficticio (`demo_data: true`).

**Leyenda:** **Implementado** = código real que corre en la demo · **Simulado** = funciona en la demo pero reemplaza a un sistema real · **Fuera de alcance** = no se construye en el prototipo.

## Por componente
| Componente | Clasificación | Qué hay en el prototipo | Qué faltaría en producción | Tarea · estado |
|---|---|---|---|---|
| Registro offline (IndexedDB + outbox + service worker) | Implementado | Snapshot del municipio en Dexie, cola con `op_id` y `base_version` | Cifrado en reposo y manejo multidispositivo robusto | HR-007 · integrado |
| Motor de coincidencias (`match.ts`) | Implementado | Score 0–100 con razones; umbral ≥85; nunca fusiona. Precisión/recall sobre 40 + 10 sintéticas en `docs/MATCHING.md` | Validar con datos reales de EIRA | HR-004 · integrado |
| Sync idempotente y detección de conflictos | Implementado | `POST /api/sync`; `op_id` repetido no duplica; versión vieja → conflicto | Resolución de conflictos asistida | HR-006 · integrado |
| Folio `EIRA-XXXX` + credencial con QR opaco | Implementado | Token revocable sin datos personales; PNG de credencial | Impresión física de credenciales | HR-006 · integrado |
| Carga de PDFs y asociación por folio | Implementado | pypdf + regex de folio exacto; bandeja "sin asociar" | Lectura de folio en PDF escaneado (OCR, P2) | HR-008 · integrado |
| Portal del laboratorio | **Simulado** | Vista dentro de la misma app con rol laboratorio (solo ve folio y estado) | Integración real con el laboratorio | HR-008 · integrado |
| Reglas clínicas (Bethesda / BIRADS / conducta) | Implementado | Tabla de IDEA.md §6 en `rules.py`; texto claro solo de plantillas | Validar el formato real de Papanicolaou con EIRA | HR-005 · integrado |
| Autorización médica con nombre + cédula | Implementado | Queda en la bitácora como "firma digital" | Firma electrónica avanzada / verificación de cédula | HR-009 · integrado |
| Aviso a la paciente/familiar por Telegram | Implementado (con respaldo) | `TelegramNotifier` si hay token del bot; mensaje sin diagnóstico | Canal acordado con EIRA (WhatsApp Business, SMS) | HR-009 · integrado |
| SMS y correo | **Simulado** | `LogNotifier` muestra el mensaje y el OTP en pantalla ("SMS simulado") | Proveedor de SMS real | HR-009 / HR-010 · integrado |
| Acceso QR → fecha de nacimiento → OTP → sesión | Implementado | OTP 5 min / 5 intentos, sesión 15 min, token revocado → 410 | Pruebas de usabilidad con pacientes | HR-010 · integrado |
| Almacén de OTP con TTL | Implementado (con respaldo) | Valkey si hay `VALKEY_URL`; si no, dict en memoria con expiración | Valkey/Redis gestionado | HR-010 · integrado |
| Escaneo de QR con cámara | Implementado (con respaldo) | `html5-qrcode`; plan B: link `/p/<token>` precargado | — | HR-010 · integrado |
| Bitácora con cadena SHA-256 | Implementado | `append()` + `verify()`; `GET /api/audit` devuelve la cadena e `integridad_ok` (aún sin pantalla propia) | Anclaje externo del hash / respaldo inmutable | HR-005 · integrado |
| Roles (capturista, laboratorio, médica, paciente) | **Simulado** | Selector de rol que manda el header `X-Demo-Role` | Login real por usuario | HR-002 · integrado |
| Pacientes, jornadas y PDFs de resultados | **Simulado** | Seed sintético: 40 pacientes con variaciones + 10 no-coincidencias; 2 PDFs generados | Datos reales bajo aviso de privacidad | HR-001 · integrado |
| Texto claro sugerido por LLM (P2) | Opcional | Claude solo sugiere redacción; la médica edita y autoriza. Fallback: plantillas fijas | — | sin tarea en backlog v1 |
| Despliegue | Implementado | Docker + Render, un solo servicio | Infraestructura acordada con EIRA | HR-001 · integrado |

## Fuera de alcance (IDEA.md §9)
- Sincronización multidispositivo robusta (CRDT).
- Cifrado en reposo de IndexedDB.
- Integración real con el laboratorio.
- SMS real.
- Login real por usuario.
- Impresión física de credenciales.
- Otros estudios (mastografía) en el flujo de resultados. El formulario de mama (campos 18–24) está en el contrato y en las reglas, pero la demo de entrega es de Papanicolaou.
