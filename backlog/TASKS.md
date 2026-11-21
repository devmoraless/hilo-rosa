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
