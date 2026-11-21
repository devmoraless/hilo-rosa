# Shared-file owners

One writer per shared file. Others ask the owner with `uak msg ID --kind request`. Patterns are relative, with no spaces; directories end in `/`.
An owner is not a prerequisite for everyone: consumers work on published contracts and mocks. To transfer ownership, open a PR to main.

| Pattern | Owner task |
|---|---|
| pyproject.toml | HR-001 |
| uv.lock | HR-001 |
| web/package.json | HR-001 |
| web/package-lock.json | HR-001 |
| app/main.py | HR-001 |
| app/schemas/ | HR-001 |
| app/services/store.py | HR-001 |
| web/src/api/ | HR-001 |
| web/src/App.tsx | HR-002 |
| web/src/index.css | HR-002 |
| web/src/lib/ui/ | HR-002 |
| web/DESIGN.md | HR-002 |
| app/services/audit.py | HR-005 |
| app/services/rules.py | HR-005 |
| app/services/notifier.py | HR-009 |
