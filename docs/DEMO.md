# Guion de la demo (≤ 3 min)

URL: https://hilo-rosa.onrender.com · abre la página **1 min antes** (el plan gratuito se duerme).
Antes de empezar: `POST /api/demo/reset` (o `uv run python scripts/reset_demo.py --url https://hilo-rosa.onrender.com`) para datos limpios.
Ten a mano: la laptop (capturista, laboratorio, médica) y el celular de "Laura" con Telegram.

| # | Pantalla | Haz | Debe verse |
|---|---|---|---|
| 1 | `/jornada` | Carga la página con red, luego **apaga el wifi**. Escribe "Maria Lopez" y año 1974. | 🔴 Sin conexión · "Posible coincidencia 92%: María López Hernández · 1974 · Tamazula · ultrasonido mar 2025" con razones. |
| 2 | `/jornada` | **Es ella** → agrega a Laura (hija, teléfono, consentimiento) → Registrar Papanicolaou. **Prende el wifi.** | "3 pendientes" baja a 0 · credencial **EIRA-7K3P** con QR. |
| 3 | `/laboratorio` | Arrastra `resultado_EIRA-7K3P.pdf` y `resultado_sin_folio.pdf` (en `app/fixtures/pdfs/`). | Uno ✅ asociado por folio; el otro en "sin asociar" con sugerencia. |
| 4 | `/medica` | Abre la tarjeta de María: Bethesda **NILM**, conducta **rutina 1 año**, nombre + cédula → **Autorizar**. | Pasa a "Notificado"; aviso **sin diagnóstico**. Llega el Telegram al celular. |
| 5 | celular | Escanea la credencial (o abre `/p/<token>`) → "Soy Laura (hija)" → fecha de nacimiento 12/05/1974 → código de 6 dígitos (Telegram). | Pide verificación; nadie sin la fecha y el código entra. |
| 6 | celular + laptop | Entra. En la laptop abre `https://hilo-rosa.onrender.com/api/audit` (pide header `X-Demo-Role: medica`; en la demo muéstralo con la pestaña de red o con `curl -H "X-Demo-Role: medica" .../api/audit`). | "Tu resultado salió normal… regresa en un año" + 🔊 + PDF · en la bitácora: acción de "visto" y `integridad_ok: true`. |

## Plan B
- **Sin Telegram o sin red:** sin `TELEGRAM_*` el aviso y el código salen en pantalla como "SMS simulado".
- **Sin cámara:** abre el link `/p/<token>` directo en el celular.
- **Wifi del lugar caído:** todo corre local: `uv run uvicorn app.main:app` y `http://localhost:8000`.
- **Todo falla:** video de respaldo en `docs/media/demo-planb.mp4` (lo graba el equipo a las 15:20).
