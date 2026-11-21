# Backlog published on claims (uak plan)

Append-only; added to .uak/TASKS.md from main. Why: adding tasks never waits for a PR.

## HR-013 · NavBar refleja el rol de la ruta actual (follow-up of HR-002)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** HR-002
- **Follow-up of:** HR-002
- **Paths:** web/DESIGN.md, web/src/index.css, web/src/lib/ui/, web/src/App.tsx, web/public/design-lock/
- **Freeze-Allowed:** no
- **Acceptance:**
  - NavBar refleja el rol de la ruta actual
- **Verify:** `test -s web/DESIGN.md && ls web/public/design-lock/screens/*-1280.png && bash .uak/bin/uak lint`

## HR-014 · IMPLEMENTADO_VS_SIMULADO refleja lo integrado (follow-up of HR-003)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** HR-003
- **Follow-up of:** HR-003
- **Paths:** docs/ARQUITECTURA.md, docs/IMPLEMENTADO_VS_SIMULADO.md, docs/SEGURIDAD.md, docs/RIESGOS_Y_PILOTO.md, docs/PREGUNTAS_EIRA.md
- **Freeze-Allowed:** no
- **Acceptance:**
  - IMPLEMENTADO_VS_SIMULADO refleja lo integrado
- **Verify:** `for f in ARQUITECTURA IMPLEMENTADO_VS_SIMULADO SEGURIDAD RIESGOS_Y_PILOTO PREGUNTAS_EIRA; do test -s docs/$f.md || exit 1; done`
## HR-015 · Pantalla de bitácora con integridad (paso 6 de la demo)

- **Type:** feature
- **Priority:** P1
- **Estimate:** 30 min
- **Rubric / Spec:** C1 · IDEA.md §4 paso 6 · Recipe: dashboard · Hero: sello "Integridad ✅" + "visto por Laura (hija)"
- **Depends on:** None
- **Uses contract:** HR-005, HR-010
- **Paths:** web/src/features/medica/Bitacora.tsx, web/src/features/medica/bitacoraLogic.ts, web/src/features/medica/bitacora.test.ts, web/src/features/medica/index.tsx
- **Freeze-Allowed:** no
- **Acceptance:** En `/medica` aparece una pestaña o sección "Bitácora" (sin tocar `web/src/App.tsx`) que llama `GET /api/audit` con el rol médica y muestra las entradas más recientes primero: hora, actor, rol y acción en lenguaje claro ("Laura (hija) vio el resultado", "Dra. … autorizó", "Aviso enviado sin diagnóstico")., Un sello grande "Integridad ✅ · la cadena de hashes no fue alterada" cuando `integridad_ok` es true; "⚠ Registro alterado en la entrada N" cuando es false., Cada entrada muestra los primeros 8 caracteres de su hash y del hash previo, para que se vea la cadena., Botón "Actualizar"; usa los componentes de `web/src/lib/ui/` y los tokens de `web/DESIGN.md`. Sin scroll horizontal a 390 px., Screenshots en `.uak-shots/HR-015/` (1280×720 y 390×844) y `VERDICT: SHIP` del design critic.
- **Tests:** labels_viewed_action_with_viewer_and_relationship, shows_integrity_ok_seal_when_chain_is_valid, shows_tampered_entry_index_when_chain_is_broken
- **Verify:** `node --test web/src/features/medica/bitacora.test.ts && npm --prefix web run build`
- **Next step:** leer `app/routers/audit.py` y `AuditResponse` en `web/src/api/types.ts`; escribir `bitacoraLogic.ts` (funciones puras) y sus 3 pruebas.

## HR-016 · Marcar celular compartido como supuesto a validar (follow-up of HR-012)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** HR-012
- **Follow-up of:** HR-012
- **Paths:** README.md, docs/PITCH.md, docs/DEMO.md, docs/media/, app/tests/test_e2e_demo.py
- **Freeze-Allowed:** no
- **Acceptance:**
  - Marcar celular compartido como supuesto a validar
- **Verify:** `uv run pytest -q app/tests/test_e2e_demo.py && test -s README.md && test -s docs/PITCH.md`

## HR-017 · DEMO.md y README apuntan a la pantalla de bitácora (follow-up of HR-012)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** HR-012
- **Follow-up of:** HR-012
- **Paths:** README.md, docs/PITCH.md, docs/DEMO.md, docs/media/, app/tests/test_e2e_demo.py
- **Freeze-Allowed:** no
- **Acceptance:**
  - DEMO.md y README apuntan a la pantalla de bitácora
- **Verify:** `uv run pytest -q app/tests/test_e2e_demo.py && test -s README.md && test -s docs/PITCH.md`

## HR-018 · Fila de bitácora: ya tiene pantalla (follow-up of HR-014)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** HR-014
- **Follow-up of:** HR-014
- **Paths:** docs/ARQUITECTURA.md, docs/IMPLEMENTADO_VS_SIMULADO.md, docs/SEGURIDAD.md, docs/RIESGOS_Y_PILOTO.md, docs/PREGUNTAS_EIRA.md
- **Freeze-Allowed:** no
- **Acceptance:**
  - Fila de bitácora: ya tiene pantalla
- **Verify:** `for f in ARQUITECTURA IMPLEMENTADO_VS_SIMULADO SEGURIDAD RIESGOS_Y_PILOTO PREGUNTAS_EIRA; do test -s docs/$f.md || exit 1; done`

## HR-019 · Fecha de nacimiento de María 2026-06-02 y script keepalive de Render (follow-up of HR-001)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** HR-001
- **Follow-up of:** HR-001
- **Paths:** pyproject.toml, uv.lock, .python-version, app/__init__.py, app/main.py, app/config.py, app/db.py, app/schemas/, app/fixtures/, app/routers/__init__.py, app/routers/health.py, app/routers/demo.py, app/services/__init__.py, app/services/store.py, app/tests/__init__.py, app/tests/conftest.py, app/tests/test_health.py, app/tests/test_seed.py, web/package.json, web/package-lock.json, web/vite.config.ts, web/tsconfig.json, web/tsconfig.node.json, web/index.html, web/src/main.tsx, web/src/api/, web/src/lib/api.ts, scripts/, Dockerfile, render.yaml, .dockerignore, .env.example, LICENSE
- **Freeze-Allowed:** no
- **Acceptance:**
  - Fecha de nacimiento de María 2026-06-02 y script keepalive de Render
- **Verify:** `uv run pytest -q && npm --prefix web ci && npm --prefix web run build`
