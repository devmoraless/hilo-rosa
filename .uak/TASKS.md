# TASKS · Hilo Rosa · backlog v1

State lives on the `claims` branch (`uak status`); this file holds only tasks.
SHORT EVENT: el plan arrancó a las 11:50, freeze a las 14:45. Ninguna tarea pasa de 45 min.
Layout: backend FastAPI en `app/` (stack fastapi-react), frontend Vite + React + TS en `web/`. El contrato vive en `app/schemas/` + `web/src/api/types.ts` (IDEA.md §6 decía `backend/` y `frontend/`: se usa el layout del kit).
Datos: solo ficticios (`demo_data: true`). La demo es la de IDEA.md §4 (María López Hernández y su hija Laura, en Tamazula).

## HR-001 · Esqueleto desplegable + contrato + seed de demo

- **Type:** setup
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C1 · IDEA.md §6
- **Depends on:** None
- **Paths:** pyproject.toml, uv.lock, .python-version, app/__init__.py, app/main.py, app/config.py, app/db.py, app/schemas/, app/fixtures/, app/routers/__init__.py, app/routers/health.py, app/routers/demo.py, app/services/__init__.py, app/services/store.py, app/tests/__init__.py, app/tests/conftest.py, app/tests/test_health.py, app/tests/test_seed.py, web/package.json, web/package-lock.json, web/vite.config.ts, web/tsconfig.json, web/tsconfig.node.json, web/index.html, web/src/main.tsx, web/src/api/, web/src/lib/api.ts, scripts/, Dockerfile, render.yaml, .dockerignore, .env.example, LICENSE
- **Freeze-Allowed:** no
- **Acceptance:**
  - Agrega TODAS las dependencias de una vez. Python: fastapi, uvicorn[standard], pydantic-settings, sqlmodel, rapidfuzz, pypdf, reportlab, qrcode[pil], python-multipart, httpx, tzdata, redis (Valkey) · dev: pytest, ruff, httpx2, playwright. Web: react, react-dom, react-router-dom, dexie, html5-qrcode, qrcode.react, tailwindcss v4, motion · dev: vite, typescript, @vitejs/plugin-react.
  - Pydantic en `app/schemas/` y tipos espejo en `web/src/api/types.ts` para Patient, TrustedContact, Jornada, Visit, Study, Result (estados `pendiente_asociar → por_revisar → autorizado → notificado → visto`), PapResult, BreastExam (campos 18–24), AuditLog, SyncOp, más los request/response de cada endpoint de IDEA.md §4.
  - `app/services/store.py`: SQLite vía SQLModel con funciones CRUD que importan las demás tareas.
  - `app/fixtures/` + `scripts/reset_demo.py`: 40 pacientes sintéticas con variaciones conocidas (acentos, "Ma.", apellidos invertidos, día/mes cruzado) + 10 no-coincidencias, jornada de Tamazula con su snapshot, María López Hernández (1974, ultrasonido mar 2025) y 2 PDFs sintéticos de resultado (uno con folio `EIRA-7K3P` en el texto y otro sin folio legible).
  - `POST /api/demo/reset` recarga el seed; `GET /api/health` → `{"status":"ok"}`; `app/main.py` descubre solo los routers de `app/routers/` y sirve `web/dist`.
  - `bash .uak/bin/uak deploy --write` genera el Dockerfile y `render.yaml`; `.env.example` lista TELEGRAM_BOT_TOKEN, VALKEY_URL, ANTHROPIC_API_KEY (vacías).
  - LICENSE MIT.
- **Tests:** health_returns_ok, reset_demo_loads_maria_and_tamazula_jornada, seed_contains_40_patients_and_10_non_matches, schemas_roundtrip_result_states
- **Verify:** `uv run pytest -q && npm --prefix web ci && npm --prefix web run build`
- **Next step:** seguir `.uak/stacks/fastapi-react/STACK.md` §Backend setup, luego el scaffold de Vite en `web/`.

## HR-002 · Design lock (rosa de EIRA + claridad de GOV.UK)

- **Type:** setup
- **Priority:** P0
- **Estimate:** 40 min
- **Rubric / Spec:** C1 · IDEA.md §0
- **Depends on:** None
- **Uses contract:** HR-001
- **Paths:** web/DESIGN.md, web/src/index.css, web/src/lib/ui/, web/src/App.tsx, web/public/design-lock/
- **Freeze-Allowed:** no
- **Acceptance:**
  - Se corre con `/uak-design-lock`; el humano elige la dirección a partir de screenshots.
  - El color de marca se toma del sitio de EIRA (https://eiraac.org/) y se anota la fuente en DESIGN.md.
  - UI kit en `web/src/lib/ui/`: Button grande, Card, Badge de conexión (🔴 Sin conexión / 🟢 En línea), Field con número de campo del papel (18, 19, 20…), Stepper, Kanban column.
  - `web/src/App.tsx`: shell con selector de rol (Capturista · Laboratorio · Médica · Paciente/familiar) que manda el header `X-Demo-Role`, y rutas `/jornada`, `/laboratorio`, `/medica`, `/p/:token`, `/`.
  - La tabla de recetas de DESIGN.md tiene una fila por pantalla: jornada, laboratorio, médica, acceso, landing.
- **Test-First: no (design lock: el gate son los screenshots y design-lint)**
- **Verify:** `test -s web/DESIGN.md && ls web/public/design-lock/screens/*-1280.png && bash .uak/bin/uak lint`
- **Next step:** `/uak-design-lock`.

## HR-003 · Documentos de la entrega (arquitectura, seguridad, riesgos, preguntas a EIRA)

- **Type:** docs
- **Priority:** P0
- **Estimate:** 40 min
- **Rubric / Spec:** C2, C3, C4
- **Depends on:** None
- **Paths:** docs/ARQUITECTURA.md, docs/IMPLEMENTADO_VS_SIMULADO.md, docs/SEGURIDAD.md, docs/RIESGOS_Y_PILOTO.md, docs/PREGUNTAS_EIRA.md
- **Freeze-Allowed:** yes
- **Acceptance:**
  - ARQUITECTURA: diagrama (mermaid) de capturista offline → sync → laboratorio → médica → aviso → acceso; tecnologías, dependencias y decisiones (matching determinístico, QR sin datos, OTP + TTL, cadena de hashes).
  - IMPLEMENTADO_VS_SIMULADO: tabla por componente, basada en IDEA.md §9 (LogNotifier, portal de laboratorio, roles por header, PDFs y pacientes sintéticos).
  - SEGURIDAD: datos mínimos, avisos sin diagnóstico, token revocable, OTP 5 min / 5 intentos, sesión de 15 min, bitácora encadenada; LFPDPPP, NOM-004-SSA3 y NOM-024-SSA3 como referencia.
  - RIESGOS_Y_PILOTO: riesgos, operación, costos estimados (marcados como estimados) y próximos pasos para un piloto en una jornada real.
  - PREGUNTAS_EIRA: las preguntas de IDEA.md §10 marcadas [To validate] y los supuestos (formato de Papanicolaou/Bethesda, hoja 1 del formato, % anormales, pacientes sin celular, si el laboratorio puede leer folio/QR).
  - Toda cifra lleva la URL de IDEA.md §10; nada inventado.
- **Test-First: no (documentación)**
- **Verify:** `for f in ARQUITECTURA IMPLEMENTADO_VS_SIMULADO SEGURIDAD RIESGOS_Y_PILOTO PREGUNTAS_EIRA; do test -s docs/$f.md || exit 1; done`
- **Next step:** leer IDEA.md §5, §9 y §10 y escribir `docs/IMPLEMENTADO_VS_SIMULADO.md` primero.

## HR-004 · Motor de coincidencias offline (match.ts) + validación

- **Type:** feature
- **Priority:** P0
- **Estimate:** 40 min
- **Rubric / Spec:** C1 · IDEA.md §5 (Reto 1)
- **Depends on:** None
- **Uses contract:** HR-001
- **Paths:** web/src/lib/match.ts, web/src/lib/match.test.ts, web/src/lib/match.fixtures.ts, docs/MATCHING.md
- **Freeze-Allowed:** no
- **Acceptance:**
  - TypeScript puro, sin dependencias (corre en el navegador sin red): normaliza (sin acentos, minúsculas, "Ma."→María, quita "de/del/la", apellidos en cualquier orden), token-set ratio sobre el nombre + reglas de fecha (exacta, día/mes invertido), teléfono y municipio → `{score 0–100, razones[]}`.
  - Umbral ≥85 = posible coincidencia; `findCandidates()` nunca fusiona, solo ordena candidatas.
  - "Maria Lopez" contra María López Hernández, 1974, Tamazula → score ≥85 con razones legibles.
  - `docs/MATCHING.md` reporta precisión y recall sobre las 40 + 10 sintéticas de `match.fixtures.ts` (números reales que imprime el test).
- **Tests:** matches_maria_lopez_without_accents_above_threshold, matches_inverted_surnames, matches_swapped_day_and_month_birthdate, does_not_match_different_person_same_surname, never_returns_a_merged_record
- **Verify:** `node --test web/src/lib/match.test.ts`
- **Next step:** escribir `match.test.ts` con los 5 nombres y verlos fallar (`uak red HR-004`).

## HR-005 · Reglas clínicas determinísticas + bitácora con cadena de hashes

- **Type:** feature
- **Priority:** P0
- **Estimate:** 40 min
- **Rubric / Spec:** C1 · IDEA.md §6 (tabla de reglas)
- **Depends on:** None
- **Uses contract:** HR-001
- **Paths:** app/services/rules.py, app/services/audit.py, app/tests/test_rules.py, app/tests/test_audit.py
- **Freeze-Allowed:** no
- **Acceptance:**
  - `classify(pap|breast)` implementa la tabla de IDEA.md §6: normal → recordatorio 12 meses + texto claro; BIRADS 3 / conducta 4 → seguimiento 6 meses; conducta 2–3, BIRADS 0/4/5 o Bethesda ≠ NILM → prioridad alta, tarea "llamar" y **sin texto automático**; insatisfactoria → repetir.
  - Los textos claros salen solo de plantillas fijas.
  - `audit.append(actor, rol, accion, entidad_id)` encadena SHA-256 (`prev_hash`, `hash`); `audit.verify()` detecta un registro alterado.
  - Funciones puras: no tocan la red ni el LLM.
- **Tests:** nilm_is_normal_with_12_month_reminder, birads_3_is_six_month_followup, abnormal_bethesda_has_no_automatic_text_and_creates_call_task, unsatisfactory_sample_asks_to_repeat, audit_chain_detects_tampered_entry
- **Verify:** `uv run --with pytest --with pydantic pytest -q app/tests/test_rules.py app/tests/test_audit.py`
- **Next step:** escribir los 5 tests y verlos fallar (`uak red HR-005`).

## HR-006 · API de jornada: snapshot, sync idempotente y credencial con folio + QR

- **Type:** feature
- **Priority:** P0
- **Estimate:** 40 min
- **Rubric / Spec:** C1 · IDEA.md §4 pasos 1–2
- **Depends on:** HR-001
- **Uses contract:** HR-005
- **Paths:** app/routers/jornadas.py, app/routers/sync.py, app/services/sync.py, app/services/credential.py, app/tests/test_sync.py
- **Freeze-Allowed:** no
- **Acceptance:**
  - `GET /api/jornadas/{id}/snapshot` devuelve las pacientes del municipio (datos mínimos) para guardarlas en IndexedDB.
  - `POST /api/sync` aplica un lote de SyncOp; repetir un `op_id` no duplica nada; `base_version` vieja → conflicto reportado, no se sobrescribe.
  - Registrar paciente genera folio `EIRA-XXXX` y `qr_token` revocable que no contiene datos personales; `GET /api/patients/{id}/credential.png` devuelve la credencial con QR.
  - Cada operación escribe en la bitácora (HR-005).
- **Tests:** snapshot_returns_tamazula_patients_only, sync_is_idempotent_by_op_id, stale_base_version_reports_conflict, new_patient_gets_folio_and_opaque_qr_token
- **Verify:** `uv run pytest -q app/tests/test_sync.py`
- **Next step:** escribir los tests contra el seed de HR-001.

## HR-007 · Pantalla de jornada offline (capturista)

- **Type:** feature
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C1 · IDEA.md §4 pasos 1–2 · Recipe: flow · Hero: tarjeta "Posible coincidencia"
- **Depends on:** HR-001, HR-002
- **Uses contract:** HR-004, HR-006
- **Paths:** web/src/features/jornada/, web/src/lib/db.ts, web/src/lib/outbox.ts, web/public/sw.js
- **Freeze-Allowed:** no
- **Acceptance:**
  - Con el wifi apagado: badge 🔴 "Sin conexión", buscar "Maria Lopez" muestra "Posible coincidencia 92%…" con razones y los botones **Es ella / Es otra** (usa `match.ts` sobre el snapshot en Dexie).
  - "Es ella" → agregar persona de confianza (Laura, hija, consentimiento) → registrar Papanicolaou; el contador "N pendientes" sube.
  - Al volver la red, el outbox sincroniza, el contador baja a 0 y se muestra la credencial con folio + QR.
  - La app carga sin red después de la primera visita (service worker).
- **Tests:** shows_offline_badge_when_navigator_offline, confirming_match_links_visit_to_existing_patient, pending_counter_drops_to_zero_after_sync
- **Verify:** `npm --prefix web run build && bash .uak/bin/smoke`
- **Next step:** `web/src/lib/db.ts` con Dexie (tablas patients, outbox).

## HR-008 · Laboratorio: carga de PDFs y asociación por folio

- **Type:** feature
- **Priority:** P0
- **Estimate:** 40 min
- **Rubric / Spec:** C1 · IDEA.md §4 paso 3 · Recipe: list · Hero: zona de arrastre + bandeja "sin asociar"
- **Depends on:** HR-001, HR-002
- **Uses contract:** HR-005
- **Paths:** app/routers/results.py, app/services/results.py, app/tests/test_results.py, web/src/features/laboratorio/
- **Freeze-Allowed:** no
- **Acceptance:**
  - `POST /api/results/upload` (multipart, varios PDFs): extrae texto con pypdf y busca el folio exacto con regex; con folio → Result `por_revisar` ligado al estudio; sin folio → `pendiente_asociar` con sugerencia.
  - `POST /api/results/{id}/associate` asocia a mano desde la bandeja.
  - Con el rol laboratorio, la respuesta no expone el expediente (solo folio y estado).
  - UI: arrastrar los 2 PDFs del seed → uno ✅ asociado, el otro en "sin asociar".
- **Tests:** pdf_with_folio_is_associated_automatically, pdf_without_folio_goes_to_unassociated_tray, manual_association_moves_result_to_review, lab_role_cannot_see_patient_record
- **Verify:** `uv run pytest -q app/tests/test_results.py && npm --prefix web run build`
- **Next step:** tests con los 2 PDFs sintéticos de `app/fixtures/`.

## HR-009 · Médica: revisión, autorización con cédula y aviso sin diagnóstico

- **Type:** feature
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C1 · IDEA.md §4 paso 4 · Recipe: dashboard · Hero: kanban de resultados
- **Depends on:** HR-001, HR-002, HR-005
- **Uses contract:** HR-008
- **Paths:** app/routers/review.py, app/services/review.py, app/services/notifier.py, app/tests/test_review.py, web/src/features/medica/
- **Freeze-Allowed:** no
- **Acceptance:**
  - Formulario con la numeración del papel: Bethesda + conducta para Papanicolaou; BIRADS (22) + conducta (23) para mama. Muestra el texto claro que generan las reglas de HR-005.
  - `POST /api/results/{id}/authorize` exige rol médica + nombre + cédula; pasa el resultado a `autorizado` → `notificado` y queda en la bitácora.
  - `Notifier`: interfaz con `TelegramNotifier` (si hay `TELEGRAM_BOT_TOKEN`) y `LogNotifier` de respaldo ("SMS simulado"); el mensaje **nunca** incluye diagnóstico.
  - Un resultado anormal no se notifica: crea la tarea "llamar".
  - Kanban: Por revisar → Autorizado → Notificado → Visto.
- **Tests:** authorize_requires_medica_role_and_cedula, notification_text_never_contains_diagnosis, abnormal_result_creates_call_task_instead_of_notification, falls_back_to_log_notifier_without_token
- **Verify:** `uv run pytest -q app/tests/test_review.py && npm --prefix web run build`
- **Next step:** `app/services/notifier.py` con la interfaz y el Fake.

## HR-010 · Acceso de la paciente o familiar: QR → fecha de nacimiento → OTP → resultado

- **Type:** feature
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C1 · IDEA.md §4 pasos 5–6 · Recipe: flow · Hero: "Tu resultado salió normal"
- **Depends on:** HR-001, HR-002
- **Uses contract:** HR-005, HR-009
- **Paths:** app/routers/access.py, app/services/access.py, app/services/otp.py, app/routers/audit.py, app/tests/test_access.py, web/src/features/acceso/
- **Freeze-Allowed:** no
- **Acceptance:**
  - `/p/<token>` → "¿Quién eres?" (paciente o persona de confianza) → fecha de nacimiento → código de 6 dígitos al teléfono registrado (vía Notifier; LogNotifier lo muestra en pantalla).
  - OTP: TTL 5 min, 5 intentos; usa Valkey si hay `VALKEY_URL`, si no un dict en memoria con expiración. Sesión de 15 min. Token revocado → 410.
  - `GET /api/access/me/results` solo devuelve resultados `notificado` con su texto claro + PDF; marca `visto por Laura (hija)` en la bitácora.
  - `GET /api/audit` muestra la bitácora con "integridad ✅" (verify de HR-005).
  - UI con botones grandes, 🔊 que lee el texto (Web Speech API) y escaneo con `html5-qrcode`; plan B: link precargado.
- **Tests:** wrong_birthdate_is_rejected, otp_expires_after_five_minutes, sixth_attempt_is_blocked, revoked_token_returns_410, trusted_contact_view_is_logged_in_audit
- **Verify:** `uv run pytest -q app/tests/test_access.py && npm --prefix web run build`
- **Next step:** `app/services/otp.py` con el store en memoria y los tests de TTL.

## HR-011 · Landing de Hilo Rosa

- **Type:** feature
- **Priority:** P1
- **Estimate:** 35 min
- **Rubric / Spec:** C1, C2 · Recipe: landing · Hero: credencial QR + "Que ningún resultado se quede sin dueña."
- **Depends on:** HR-002, HR-007, HR-010
- **Paths:** web/src/features/landing/, web/public/shots/
- **Freeze-Allowed:** yes
- **Acceptance:**
  - Hecha con el skill `landing-story`: la frase de IDEA.md §1, una cifra con fuente (+300 resultados/mes por WhatsApp; 11,919 casos de cáncer cervicouterino, GLOBOCAN 2024), el wow como screenshot real, 3 pasos y botón "Ver demo".
  - Screenshots reales de la app, no mockups.
- **Test-First: no (landing: el gate es design-lint + screenshots)**
- **Verify:** `npm --prefix web run build && bash .uak/bin/design-lint`
- **Next step:** tomar screenshots de jornada y acceso en 1280×720 y 390×844.

## HR-012 · Demo de punta a punta, README, pitch y video de respaldo

- **Type:** demo
- **Priority:** P0
- **Estimate:** 40 min
- **Rubric / Spec:** C1, C2
- **Depends on:** HR-006, HR-007, HR-008, HR-009, HR-010
- **Paths:** README.md, docs/PITCH.md, docs/DEMO.md, docs/media/, app/tests/test_e2e_demo.py
- **Freeze-Allowed:** yes
- **Acceptance:**
  - `app/tests/test_e2e_demo.py` recorre los pasos 1–6 por API sobre el seed (reset → sync → upload → authorize → access → audit).
  - README: qué es, cómo levantarlo (`uv sync`, `npm --prefix web ci`, variables de `.env.example`), URL del deploy en Render, enlaces a docs/, licencia MIT.
  - `docs/PITCH.md` (2 min) y `docs/DEMO.md` (guion de ≤3 min con el plan B de IDEA.md §4).
  - El video de respaldo lo graba el humano; esta tarea deja el guion y la ruta `docs/media/demo-planb.mp4`.
- **Tests:** full_demo_flow_from_offline_registration_to_family_access
- **Verify:** `uv run pytest -q app/tests/test_e2e_demo.py && test -s README.md && test -s docs/PITCH.md`
- **Next step:** escribir el test e2e con los endpoints del contrato.
