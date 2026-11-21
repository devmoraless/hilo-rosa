# DECISIONS

Coordination decisions on the claims branch.
Why: a reversible option after 15 min keeps work moving.
- 1795283665 | deadline freeze/event/1795272300 | FREEZE_DEMO_FIXES_ONLY | New claims only with Freeze-Allowed: yes; respect authorization.
- 1795284019 | HR-005 | dataclass result, list-based audit | Why: storage-agnostic for HR-001
- 1795284164 | HR-003 | components marked planeado; costs por confirmar | Why: nothing merged in main yet; no verified prices
- 1795284321 | HR-004 | pesos fijos nombre60/fecha25/municipio10/tel10 + penalizacion nombre de pila x0.6 | Why: explicable y deterministico; evita falsos positivos por apellidos compartidos
- 1795284480 | HR-001 | layout app/ + web/; main.tsx carga App.tsx por glob | Why: no tocar archivos de HR-002
- 1795286060 | HR-002 | Direction 2 credencial, light EIRA blush bg (human pick) | Why: human picked v2 by looking, rejected dark bg
- 1795286093 | deadline decision/HR-002-1795285107/1795286007 | BLOCKED_OTHER_TASK | Option: Direction 2 (credencial), fondo claro rosa EIRA en vez de oscuro; Why: elección del humano viendo las capturas: le gustó la animación de la credencial, no el fondo negro; no money, accounts, publishing or scope expansion.
- 1795286981 | HR-010 | Reuse existing sync audit helpers; local send_otp fallback; QR dependency already installed | Why: Keep changes inside task Paths without duplicating dependency files
- 1795287014 | HR-010 | Only task Paths changed, screenshots stored under acceso; no done or PR; reused existing SQLite audit helpers | Why: Avoid dependency copies and out-of-scope edits
- 1795287239 | HR-010 | Direct app.services.audit.verify; static mobile action area prevents validation-error input occlusion; self-critique per lead request | Why: Use merged dependency and preserve editable birthdate on narrow screens
- 1795287313 | HR-010 | local LogNotifier fallback until HR-009 | Why: HR-009 not started
- 1795287386 | HR-007 | year-of-birth field so the real match.ts score is 92% | Why: name only scores 100%
- 1795287669 | HR-009 | list endpoint at /api/review/results to avoid clash with HR-008 | Why: file ownership
- 1795287838 | HR-010 | Audit permits medica and capturista via reused jornada role helper; late verify guarded by request version; scanner stops after startup settles on selection/unmount | Why: Address reviewed data exposure, false view logs and camera lifetime within task Paths
