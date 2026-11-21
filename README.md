# Hilo Rosa

**Que ningún resultado se quede sin dueña.**

Prototipo para la Vibeathon Nerdearla México 2026 · **Reto 4** (entrega digital segura de resultados de Papanicolaou) sobre la base del **Reto 1** (expediente único y registro offline), para [EIRA](https://eiraac.org/).

🔗 **Demo en vivo:** https://hilo-rosa.onrender.com · todos los datos son **ficticios**.

> El plan gratuito de Render se duerme tras 15 min sin visitas: la primera carga puede tardar ~1 min.

## El problema

EIRA entrega más de 300 resultados de Papanicolaou al mes por una sola cuenta de WhatsApp, asociándolos por nombre; si la cuenta se bloquea, las entregas se detienen (brief del reto, Devpost). Sus pacientes viven en comunidades rurales y regresan a varias jornadas. Suponemos que muchas comparten celular con su familia (supuesto a validar con EIRA, ver `docs/PREGUNTAS_EIRA.md`).

## Qué hace Hilo Rosa

Un **objeto físico** une los dos retos: la **credencial con folio y QR**.

1. **Jornada sin internet (Reto 1).** La capturista busca "Maria Lopez" con el wifi apagado; el motor de coincidencias (en el navegador) propone "Posible coincidencia 92%" con razones legibles. Ella confirma **Es ella / Es otra**: nunca se fusiona solo. Registra a la persona de confianza (Laura, hija) y el Papanicolaou en una cola offline.
2. **Sincroniza** al volver la red (idempotente por `op_id`, conflictos visibles) y entrega la credencial con folio `EIRA-7K3P` + QR **sin datos personales**.
3. **Laboratorio** arrastra los PDFs: se asocian solos por folio; los que no, caen en una bandeja "sin asociar". El laboratorio solo ve folio y estado.
4. **Médica** captura Bethesda/BIRADS + conducta con la numeración del formato en papel, ve el texto claro generado por reglas y **autoriza con su cédula**. El aviso a la paciente **nunca dice el diagnóstico**; un resultado anormal crea la tarea "llamar" en lugar de un mensaje.
5. **La paciente o su familiar** escanea la credencial → fecha de nacimiento → código de 6 dígitos (5 min, 5 intentos) → sesión de 15 min → "Tu resultado salió normal, regresa en 1 año" + 🔊 + PDF.
6. **Bitácora** con cadena de hashes SHA-256 (`GET /api/audit`, rol médica): registra "visto por Laura (hija)" y verifica la integridad de toda la cadena (`integridad_ok`). Hoy se consulta por API; la pantalla de bitácora es el siguiente paso.

## Cómo correrlo

Requisitos: [uv](https://docs.astral.sh/uv/) y Node 20+.

```bash
uv sync
npm --prefix web ci && npm --prefix web run build
uv run uvicorn app.main:app --reload        # http://localhost:8000
uv run python scripts/reset_demo.py         # reinicia los datos ficticios
```

Desarrollo del frontend con recarga: `npm --prefix web run dev` (proxy de `/api` al puerto 8000).

Pruebas: `uv run pytest -q` · `node --test web/src/lib/match.test.ts` · `node --test web/src/features/jornada/jornada.test.ts`.

### Variables de entorno (todas opcionales)

Copia `.env.example` a `.env`. Sin llaves, cada servicio usa su respaldo local.

| Variable | Para qué | Sin ella |
|---|---|---|
| `HILO_PUBLIC_URL` | URL que va dentro del QR | `http://localhost:8000` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_DEMO_CHAT_ID` | aviso y código por Telegram | "SMS simulado" en pantalla |
| `VALKEY_URL` | códigos y sesiones con TTL | memoria del proceso con expiración |

## Arquitectura

FastAPI + SQLite (SQLModel) en `app/`, React + Vite + Tailwind en `web/`, una sola imagen Docker en Render. Detalle en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

| Documento | Contenido |
|---|---|
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | flujo, tecnologías, dependencias y decisiones |
| [`docs/IMPLEMENTADO_VS_SIMULADO.md`](docs/IMPLEMENTADO_VS_SIMULADO.md) | qué es real y qué es simulado |
| [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) | privacidad, controles y límites del prototipo |
| [`docs/RIESGOS_Y_PILOTO.md`](docs/RIESGOS_Y_PILOTO.md) | riesgos, operación, costos y próximos pasos |
| [`docs/PREGUNTAS_EIRA.md`](docs/PREGUNTAS_EIRA.md) | supuestos y preguntas abiertas para EIRA |
| [`docs/MATCHING.md`](docs/MATCHING.md) | método del motor de coincidencias y su validación |
| [`docs/PITCH.md`](docs/PITCH.md) · [`docs/DEMO.md`](docs/DEMO.md) | pitch de 2 min y guion de la demo |

## Lo que decide el código, no un modelo

El puntaje de coincidencia, la asociación por folio, la clasificación, el seguimiento y los permisos son **código determinístico y probado**. Los textos claros salen de plantillas fijas por regla. No se usa ningún LLM en el flujo.

## Ética y datos

Solo datos ficticios. El QR no lleva datos personales. Los avisos nunca incluyen diagnóstico. La persona de confianza requiere consentimiento y es revocable. Un resultado anormal dispara una llamada humana, no solo un mensaje.

## Licencia

[MIT](LICENSE)
