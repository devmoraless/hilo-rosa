# PROJECT · Hilo Rosa · Vibeathon Nerdearla México 2026 (sprint mode)

> Filled in by `/uak-setup` with the human at minute 0. uak reads the flat fields of the last block from
> the remote `main`, so a stale worktree can never change permissions.

## Event
| Field | Value |
|---|---|
| Event / challenge | Vibeathon Nerdearla México 2026 · Reto 4 (entrega digital segura de resultados de Papanicolaou) sobre la base del Reto 1 (expediente único + offline) · retos de EIRA (https://eiraac.org/) |
| Start | 2026-11-21 10:30 America/Mexico_City |
| Official deadline | 2026-11-21 16:00 America/Mexico_City (código, extendido +30 min) · envío a Devpost (confirmar hora) · platforms: Devpost + repo público GitHub `devmoraless/hilo-rosa` (MIT) |
| Freeze | 15:15 (`Freeze-Epoch: 1795295700`, +30 min: el evento se extendió) · el setup arrancó tarde (11:46): wave 1 sale ya |
| Clean rehearsal / plan B | 15:06 · video plan B v1 a las 13:00, final a las 15:20 |
| Internal submission | 15:15 |
| Humans | devmoraless: único humano · submission owner: devmoraless |
| Agents | Claude Code: `dm-1`, `dm-2` · Devin: `devin-1`, `devin-2` (decisión del humano: 4 agentes en paralelo) |
| Machines | laptop Windows 11 (Git Bash) + Devin (nube) |

## Official rubric (weights sum to 100)
Sin pesos oficiales: el brief solo lista 4 entregables (guía de EIRA). Pesos iguales, **sin verificar**.
| ID | Criterion | Weight | Evidence in the demo |
|---|---|---:|---|
| C1 | Prototipo con datos ficticios que muestre de inicio a fin el caso de uso del reto | 25 | Demo pasos 1–6 de IDEA.md §4 + `scripts/reset_demo.py` |
| C2 | Explicación breve de arquitectura, tecnologías, dependencias y decisiones, distinguiendo implementado vs simulado | 25 | `docs/ARQUITECTURA.md`, `docs/IMPLEMENTADO_VS_SIMULADO.md`, README |
| C3 | Riesgos, necesidades de seguridad, operación, costos y próximos pasos para un piloto real | 25 | `docs/SEGURIDAD.md`, `docs/RIESGOS_Y_PILOTO.md` |
| C4 | Preguntas abiertas y supuestos a validar con EIRA antes de producción | 25 | `docs/PREGUNTAS_EIRA.md` |

## Event rules
| Topic | Confirmed rule | Source |
|---|---|---|
| AI use / prior code | unverified: el brief recibido no lo especifica | brief del reto (Devpost) |
| Data and licenses | Solo datos ficticios | guía de EIRA en el brief |
| Format and video limits | Pitch de 2 min; límites de video sin verificar | IDEA.md §8 |

## Plan B
- A video of the whole flow at `docs/media/demo-planb.mp4` (v1 at 13:00, final at 15:20). Use it if the venue network, Telegram or Valkey fails.

## Executable config
A human sets `yes`. A missing field means `no`.

```text
Mode: sprint
Backlog-Proposed-Epoch: 0
Backlog-Approved: yes
Autonomy: yes
Auto-Merge: yes
Review-Mode: claims
Plan-Channel: claims
Freeze-Epoch: 1795295700
Lease-Seconds: 2700
Review-Lease-Seconds: 14400
Events-Per-Session: 100
Checkpoint-Percent: 60
Merge-Lease-Seconds: 1800
Merge-Wait-Seconds: 180
Merge-Adopt-Seconds: 300
Max-Parallel-Subagents: 4
Opus-Subagents-Per-Session: 2
Pace: auto
Subagent-Hard-Cap: 6
Strong-Hard-Cap: 3
Subagents-Per-Session: 40
Subagents-Per-Machine: 8
Subagent-Burst-Per-Minute: 6
Max-Worktree-Agents: 6
Blackbox: on
Additive-Paths: -
Test-First: yes
```
