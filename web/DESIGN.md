# DESIGN · Hilo Rosa

> Written by `/uak-design-lock` (HR-002) from the direction the human picked by looking: round R1, variant v2
> ("credencial"), with a light EIRA blush background instead of the dark one (human's words: "me gustó mucho la v2,
> esa animación de la credencial está muy buena, solo que el fondo negro no me gusta mucho"). Decision recorded with
> `uak decision HR-002`. Global changes after the lock need a human decision.

## Direction
- Name: `Credencial rosa` · Intent: the patient credential (folio + QR) is the product's face; everything else is plain, large and calm so a capturista under a tent and a 52-year-old on a shared phone both read it at a glance.
- The one memorable element: the credential card (`Credential` in the UI kit), white on EIRA blush, turning in 3D on the landing and shown flat (with the same folio type) wherever a patient is identified. Everything else is quiet.
- References: `web/public/design-lock/refs/eiraac-home-1280.png`, `web/public/design-lock/refs/eiraac-tamizaje-1280.png` (EIRA's own site, the brand source).
- Brand color source: **`#FFA9B8`**, EIRA's main pink, the most used pink in https://eiraac.org/css/main.css (34 uses; e.g. the "Donar" button background). From the same file: deep rose `#B7426C` (accent, AA on white), maroon `#7D3B3B` (EIRA's text color), plum `#6A2B51`. Captured 2026-11-21.
- Round record: `.uak/design/rounds/R1/` (v1 mapa, v2 credencial = winner, v3 Laura, v4 celular).

## Type
- Families: display `Bebas Neue` (400; headings, folio, big numbers) · body `Fira Sans` (400 / 600; everything else)
- Scale (px, ratio ≈ 1.25-1.5, 6 steps): `14 / 16 / 20 / 28 / 40 / 72`
- Body: `17` px (18 on the paciente screen) · line height `1.55` · hero display `72` px at 1280, `46` px at 390 · tabular figures for numbers: yes (`font-variant-numeric: tabular-nums`)
- Bebas is uppercase by design: use it only for short headings (≤ 6 words), folios and numbers; sentences and labels stay in Fira Sans, sentence case.

## Space and shape
- Spacing scale (px): `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64` (use 3-4 steps per screen)
- Radius family: `8 / 14 / 22` (8 inputs and chips, 14 buttons and panels, 22 the credential only) · elevation: one level (`--shadow: 0 18px 40px -24px rgba(106,43,81,.45)`), hairlines `1px var(--line)`
- Content width `1200` px · side panel `380` px

## Color (tokens in `web/src/index.css`)
| Token | Value | Job |
|---|---|---|
| `--bg` | `#FFE4EA` (to `#FFD3DC` on the landing hero) | page, EIRA blush |
| `--surface` | `#FFFFFF` | the one container level (panels, the credential) |
| `--text` / `--text-2` | `#6A2B51` / `#7D3B3B` | body and headings / secondary (both ≥ 5.9:1 on `--bg`) |
| `--accent` | `#B7426C` | the primary action and the brand moment, nothing else |
| `--accent-ink` | `#FFFFFF` | text on the accent (5.3:1) |
| `--brand` | `#FFA9B8` | EIRA pink: fills, rules, selected pills; never text |
| `--ok` / `--warn` / `--bad` | `#2E7D4F` / `#9A5B00` / `#C0392B` | data states only (en línea, pendiente, sin conexión / alta prioridad) |
| `--ok-ink` / `--warn-ink` / `--bad-ink` | `#FFFFFF` / `#FFFFFF` / `#FFFFFF` | text on each state color (≥ 4.5:1) |
Disabled: a primary button turns `--line` fill (`#F0C6D0`) with `--text-2` text and no shadow; never the accent at low opacity.

## Shell (owned by the design lock task)
- `AppShell` · `NavBar` (brand mark "Hilo Rosa" in Bebas + EIRA pink thread dot, segmented pills for the 4 views: Jornada, Laboratorio, Médica, Paciente; role selector that sets `X-Demo-Role` via `setDemoRole`; `ConnectionBadge` on the right) · `PageHeader` · `PageLayout` (`flow`, `list`, `dashboard`, `landing`)
- At 390 wide: the brand + badge stay on top; the views become a horizontal scroll row of pills under it; the role selector is a full-width select.
- Selecting a role navigates to its view (capturista → /jornada, laboratorio → /laboratorio, médica → /medica, paciente → /p/demo).

## Screens: one recipe and one hero each
| Screen | Recipe (skill `product-ui` §2) | Hero |
|---|---|---|
| Jornada (`/jornada`, capturista) | `flow` | the match card "Posible coincidencia 92%" with Es ella / Es otra, then the `Credential` with folio + QR |
| Laboratorio (`/laboratorio`) | `list` | the drop zone + the "Sin asociar" tray |
| Médica (`/medica`) | `dashboard` | the kanban of results (Por revisar → Autorizado → Notificado) |
| Acceso (`/p/:token`, paciente/familiar) | `flow` | the result sentence "Tu resultado salió normal" in display type, with 🔊 and PDF |
| Landing (`/`) | `landing-story` | the `Credential` turning in 3D (the wow), headline "Que ningún resultado se quede sin dueña." |
Locked screens (copy the one with your recipe, not the wow): `web/public/design-lock/screens/landing-*.png` (landing), `jornada-*.png` (flow), `laboratorio-*.png` (list).

## Components (`web/src/lib/ui/`)
- `Button` (sm 40 / md 48 / lg 56 px; primary = accent, secondary = white with accent border, quiet = text)
- `Card` (white surface, radius 14, one shadow; never nested)
- `ConnectionBadge` (🔴 Sin conexión / 🟢 En línea, from `navigator.onLine` or a prop)
- `Field` (label with the paper's field number in a pink circle: 18, 19, 20…; input 48 px tall, 18 px text)
- `Stepper` (numbered steps: a real sequence only)
- `KanbanColumn` (title + count + stacked cards)
- `Chip`, `Stat`, `SectionHeader`, `Credential` (folio + QR, `turning` prop for the landing)

## Motion
- One orchestrated moment: the credential turn (12 s loop on the landing; a single 0.6 s flip when a credential is issued in Jornada). State changes (sync count, kanban move) animate with `motion` in ≤ 250 ms. `prefers-reduced-motion` shows a still card.

## AI tells we refuse
- A colored side stripe on rows or cards · a card inside a card · a grid of equal boxes
- Purple-blue gradients, glass on every surface, emoji as icons, tracked-out uppercase eyebrows over every heading
- Three equal pricing or feature cards · every label in the same weight · `demo:`, `undefined` or raw IDs on screen
- Near-black backgrounds (the human rejected the dark version)
- Medical stock photos, stethoscope or ribbon icons as decoration
- Diagnosis words in any notice or preview: a notice says "tu resultado está listo", never the result
