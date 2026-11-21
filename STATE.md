# STATE

Phase: execution
Updated: 1795290718
AVAILABLE: -
CLAIMED: HR-011 HR-012 
BLOCKED: -
REVIEW: -
INTEGRATED: HR-001 HR-002 HR-003 HR-004 HR-005 HR-006 HR-007 HR-008 HR-009 HR-010 HR-013 
CANCELLED: -

Claims (first 24; status --task ID shows detail):
HR-011 | CLAIMED | dm-2 | until 1795293397
HR-012 | CLAIMED | dm-1 | until 1795293418

Blockers: BLOCKED tasks; use status --task ID --summary.
Current decisions (last 5):
- 1795287386 | HR-007 | year-of-birth field so the real match.ts score is 92% | Why: name only scores 100%
- 1795287669 | HR-009 | list endpoint at /api/review/results to avoid clash with HR-008 | Why: file ownership
- 1795287838 | HR-010 | Audit permits medica and capturista via reused jornada role helper; late verify guarded by request version; scanner stops after startup settles on selection
- 1795287947 | HR-013 | follow-up of HR-002 by dm-1: NavBar refleja el rol de la ruta actual | Why: same Paths, no scope change
- 1795288678 | allow | devmoraless | test change: HR-010 | Why: pdf_url assertion → /api/access/me/results/{id}/pdf

Global next step: available P0; else review PRs, tests, demo, rehearsal.
Why: bounded snapshot to resume without rereading history.
