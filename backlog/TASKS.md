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
