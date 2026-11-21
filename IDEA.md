# IDEA · Hilo Rosa

> Challenge: Reto 4 · Entrega digital segura de resultados de Papanicolaou (con base del Reto 1 · Expediente único y registro offline) · Event: Vibeathon Nerdearla México 2026, sábado 21 nov 2026, coding 10:30–**15:30** (CDMX), envío Devpost 16:00. Tags: **[Decided]** · **[Recommended]** · **[To validate]**.
> Every pitch number comes from §10 with a source. §4 → vertical tasks · §6 → contract · §7 → spikes · §8 → acceptance.

## 0. Name and brand (fixed at T0)
- Name: **Hilo Rosa** **[Decided]** · repo: `hilo-rosa` · domain: `hilo-rosa.onrender.com` · tagline: **"Que ningún resultado se quede sin dueña."**
- Renaming after T−50% (≈13:00) needs a human `uak decision`.
- Look: el sitio de EIRA (https://eiraac.org/) para heredar su rosa y que se sienta suyo, más la claridad de GOV.UK (botones grandes, alto contraste, texto simple) para la pantalla de jornada y la de familiar. Color de marca: el rosa de EIRA **[To validate]**: tomarlo del sitio.

## 1. One line
For **el personal de EIRA y las pacientes de comunidades rurales del sur de Jalisco**, who **entregan más de 300 resultados de Papanicolaou al mes por una sola cuenta de WhatsApp, asociándolos por nombre, y cuando la cuenta se bloquea las entregas se paran**, **Hilo Rosa** lets them **registrar a cada paciente una sola vez (aun sin internet), darle una credencial con folio y QR, y que ella o un familiar de confianza abra su resultado autorizado con verificación**, unlike **el escaneo y envío del PDF por WhatsApp a un nombre**.
Edge over other teams: la mayoría hará "portal con login" o "dashboard + IA". Nosotros unimos los dos retos con un **objeto físico** (la credencial QR) que sirve para reconocer a la paciente recurrente (Reto 1) y para que ella o un familiar sin cuenta ni contraseña acceda a su resultado (Reto 4). Además mostramos el **modo avión en vivo**.

## 2. Users
| Persona | Moment | Need | Flow step |
|---|---|---|---|
| Rosa, capturista de EIRA | Jornada en Tamazula, sin internet, fila de 40 mujeres | Registrar rápido y no duplicar a quien ya vino | 1, 2 |
| Laboratorio aliado | Le entrega resultados a EIRA | Subir PDFs sin ver expedientes | 3 |
| Dra. Ana, médica de EIRA | Revisa resultados | Clasificar y autorizar antes de que la paciente lo vea | 4 |
| María, paciente (52, Tamazula, celular compartido) | 3 semanas después | Saber su resultado sin ir a Ciudad Guzmán | 5 |
| Laura, hija de María (persona de confianza) | Recibe el aviso en su celular | Abrir el resultado de su mamá de forma segura | 5, 6 |

## 3. Demo case
María López Hernández (ficticia), 52 años, Tamazula de Gordiano, Jalisco. Es uno de los municipios reales donde EIRA trabaja (aparece en su mapa de alcance: 58 municipios y 85,337 estudios en Jalisco). Ya vino a una jornada en 2025 (ultrasonido) y hoy regresa a su Papanicolaou. No tiene celular propio; registra a su hija Laura como persona de confianza. Su resultado sale **normal**.
Por qué este caso: recorre todo el flujo (recurrente → offline → folio → laboratorio → firma → aviso → acceso del familiar) y retrata el perfil real de EIRA: rural, celular compartido y regreso a jornadas (2.15 estudios por mujer). **[To validate]** con EIRA: perfil típico y si hay persona de confianza.

## 4. Demo flow (6 steps, ≤3 min; each step = one vertical task)
| # | User does | Sees on screen | API | Prio |
|---|---|---|---|---|
| 1 | Capturista **apaga el wifi** y teclea "Maria Lopez" en la jornada de Tamazula | Badge 🔴 "Sin conexión" · tarjeta "Posible coincidencia 92%: María López Hernández, 1974, Tamazula, ultrasonido mar 2025" · botones **Es ella / Es otra** | local (Dexie + `match.ts`) · snapshot previo `GET /api/jornadas/{id}/snapshot` | P0 |
| 2 | "Es ella" → agrega a Laura (hija) → registra Papanicolaou → **prende el wifi** | **Wow:** credencial con folio `EIRA-7K3P` + QR; el contador "3 pendientes" baja a 0 al sincronizar | `POST /api/sync` | P0 |
| 3 | Laboratorio arrastra 2 PDFs | Uno se asocia solo por folio ✅; el otro cae en "sin asociar" con sugerencia | `POST /api/results/upload` | P0 |
| 4 | Médica abre el PDF, captura Bethesda "NILM" + conducta "Rutina en 1 año" (para mama: BIRADS + conducta, campos 22–23), ve el texto claro generado por regla y **Autoriza** con su cédula | Kanban: tarjeta pasa a "Notificado"; log del aviso **sin diagnóstico** | `POST /api/results/{id}/authorize` | P0 |
| 5 | En el celular de Laura llega el Telegram; ella **escanea la credencial** | `/p/<token>` → "¿Quién eres?" → fecha de nacimiento → código de 6 dígitos | `POST /api/access/start` · `POST /api/access/verify` | P0 |
| 6 | Laura entra | **Wow:** "Tu resultado salió normal, regresa en 1 año" + 🔊 + PDF · en la tablet: bitácora "visto por Laura (hija)" + "integridad ✅" | `GET /api/access/me/results` · `GET /api/audit` | P1 |

- Wow in one sentence: con el wifi apagado reconoce a una paciente que ya vino, y semanas después su hija abre el resultado escaneando la credencial, con verificación y sin que el mensaje diga el diagnóstico. · seconds until the wow: **~30** (paso 1–2).
- Plan B: OTP y Telegram → si no hay red/bot, `LogNotifier` muestra el código en pantalla ("SMS simulado"). Escaneo con cámara → link `/p/<token>` precargado en el celular. Wifi del venue caído → todo corre en localhost y video de respaldo grabado a las 15:20.

## 5. Technical core
- Method:
  - **Matching determinístico y explicable:** normalización (sin acentos, minúsculas, "Ma."→María, quita "de/del/la", apellidos en cualquier orden) + `rapidfuzz.token_set_ratio` sobre el nombre + reglas de fecha de nacimiento (exacta, día/mes invertido), teléfono y municipio → `score` 0–100 con `razones`. Umbral ≥85 = "posible coincidencia". **Nunca fusiona**: siempre confirma una persona (Fellegi–Sunter simplificado como referencia).
  - **Asociación de PDF por folio exacto** (regex sobre el texto del PDF); si no coincide → revisión humana.
  - **Offline-first:** snapshot del municipio en IndexedDB y outbox con `op_id` idempotente y `base_version` para detectar conflictos.
  - **Acceso:** el QR = token revocable, sin datos. Acceso = token + fecha de nacimiento + OTP al teléfono registrado (TTL 5 min, 5 intentos) → sesión de 15 min. Bitácora con cadena de hashes SHA-256.
  - **Seguimiento por reglas del formato real:** BIRADS / Bethesda + "conducta a seguir" (campo 23) → clasificación, fecha de próximo control y tareas (ver tabla en §6).
- The LLM does **not** produce the key number: el score de coincidencia, la asociación, la clasificación, el seguimiento y los permisos son código determinístico. El texto claro sale de plantillas por regla. El LLM es opcional (P2) solo para suavizar la redacción, que la médica edita y autoriza.
- Honest validation: 40 pacientes sintéticas con variaciones conocidas (acentos, abreviaturas, apellidos invertidos, fecha con día/mes cruzado) + 10 no-coincidencias. Reportamos precisión y recall del matching en ese set en el README. No hay dataset público de pacientes; lo decimos tal cual.

## 6. Data (contract in `backend/app/schemas.py` + `frontend/src/api/types.ts`)
| Entity | Key fields | Source (license) |
|---|---|---|
| Patient | id (uuid), folio, nombre, apellidos, fecha_nacimiento, municipio, telefono?, telefono_propio, canal_aviso, qr_token, version | Sintético (seed, MIT) |
| TrustedContact | patient_id, nombre, parentesco, telefono, consentimiento_at, activo | Sintético |
| Jornada / Visit / Study | municipio, sede, fecha · patient_id, device_id · tipo, folio_muestra | Sintético; municipios reales del mapa de EIRA |
| Result | study_id, pdf_path, estado, tipo_estudio, clasificacion (derivada), conducta, proximo_control, explicacion_clara, autorizado_por_nombre, autorizado_por_cedula, autorizado_at | PDFs sintéticos generados |
| BreastExam (campos 18–24 del formato real de EIRA) | exploracion_clinica (18, texto), termografia (19: 1 simétrico · 2 asimétrico), ultrasonido (20, texto; equipo CHISON 5, 10 MHz), realizo_nombre + realizo_cedula (21), birads (22: 0–5), conducta (23: 1 rutina 1 año · 2 mastografía de tamizaje · 3 imagen complementaria · 4 evaluación 6 meses), motivo_referencia (24: 1 tumoración palpable · 2 signos sugestivos · 3 estudio anormal · 4 factores de riesgo), notas | Formato de revisión mamaria de EIRA (hoja 2, compartido por EIRA el 21 nov) |
| PapResult **[To validate]** | bethesda (NILM · ASC-US · LSIL · ASC-H · HSIL · AGC · insatisfactoria), conducta (rutina 1 año · repetir · colposcopía/referencia), notas | Supuesto; pedir el formato real del laboratorio |

**Reglas determinísticas del formato → seguimiento y texto claro [Decided]:**
| Entrada | clasificacion | Seguimiento automático | Texto claro (plantilla) |
|---|---|---|---|
| Conducta 1 · BIRADS 1–2 · Bethesda NILM | normal | Recordatorio en 12 meses | "Tu resultado salió normal / con hallazgos benignos. No es cáncer. Regresa en un año." |
| Conducta 4 · BIRADS 3 | seguimiento | Recordatorio en 6 meses + aviso | "Necesitamos revisarte otra vez en 6 meses. Es una medida de cuidado." |
| Conducta 2 o 3 · BIRADS 0, 4, 5 · Bethesda ≠ NILM | seguimiento (prioridad alta) | Caso abierto + tarea "llamar" + referencia a 2.º nivel; no se cierra sin acción | Sin texto automático: EIRA llama antes de mostrar el resultado |
| Bethesda insatisfactoria | repetir | Tarea "citar para nueva muestra" | "Tu muestra no se pudo leer. Hay que tomarla otra vez, no es por algo malo." |
- La UI de captura usa la **misma numeración del papel** (18, 19, 20…) para que la capturista copie campo por campo sin capacitación extra.
- Autorizar exige **nombre + cédula profesional** (campo 21 / sello institucional) → queda en la bitácora como la "firma digital".
| AuditLog | actor, rol, accion, entidad_id, ts, prev_hash, hash | Generado |
| SyncOp | op_id, device_id, tipo, payload, base_version | Generado |

## 7. AI and external APIs (each = a 30-min spike + a recorded fallback)
| Use | Model/API [To validate] | Key owner | Fallback |
|---|---|---|---|
| Aviso y OTP | Telegram Bot API | Equipo (bot de la hackathon) | `LogNotifier` en pantalla ("SMS simulado") |
| OTP y sesiones con TTL | Valkey (patrocinador) | Equipo / Render | Diccionario en memoria con expiración |
| Texto claro sugerido (P2) | Claude (`claude-sonnet-5-5`) | Equipo | Plantillas fijas por clasificación |
| Escaneo QR | `html5-qrcode` (navegador) | — | Link `/p/<token>` precargado |
| Lectura de folio en PDF escaneado (P2) | Claude visión / tesseract | Equipo | Elegir a mano en la bandeja de "sin asociar" |

## 8. Rubric → evidence
| Official criterion | Weight | Step/artifact that proves it |
|---|---|---|
| Prototipo con datos ficticios de inicio a fin | [To validate] | Demo pasos 1–6 + `scripts/reset_demo.py` |
| Reto 4: carga de PDF + asociación con identidad | [To validate] | Paso 3 (folio exacto + bandeja manual) |
| Reto 4: revisión y autorización clínica | [To validate] | Paso 4 (máquina de estados, rol médica) |
| Reto 4: aviso sin diagnóstico + acceso autenticado sin enlaces permanentes | [To validate] | Pasos 4–5 (plantillas, OTP, TTL) |
| Reto 4: alternativas asistidas | [To validate] | Credencial + persona de confianza + entrega en persona (docs) |
| Reto 1 (base): ID estable, coincidencias con confirmación humana, offline + sync | [To validate] | Pasos 1–2 |
| Roles y bitácora | [To validate] | Selector de rol + paso 6 (cadena de hashes) |
| Transversales: accesibilidad, conectividad, privacidad, operación, costos, interoperabilidad | [To validate] | UI de botones grandes + 🔊 · offline · `docs/SEGURIDAD.md` · `docs/RIESGOS_Y_PILOTO.md` · export CSV/JSON |
| Arquitectura e implementado vs simulado | [To validate] | `docs/ARQUITECTURA.md`, `docs/IMPLEMENTADO_VS_SIMULADO.md` |
| Riesgos, próximos pasos, preguntas a EIRA | [To validate] | `docs/RIESGOS_Y_PILOTO.md`, `docs/PREGUNTAS_EIRA.md` |
| Repo público con licencia + README | Requisito | MIT, README con cómo levantar y variables |
| Pitch de 2 min | Requisito | `docs/PITCH.md` |

## 9. Scope
Out: sincronización multidispositivo robusta (CRDT), cifrado en reposo de IndexedDB, integración real con el laboratorio, SMS real, login real por usuario, impresión física de credenciales, otros estudios (mastografía) en el flujo de resultados.
Simulated with `demo_data`: SMS y correo (`LogNotifier`), portal del laboratorio (vista dentro de la misma app), roles (header `X-Demo-Role`), PDFs de resultados, pacientes y jornadas.
UI language: español de México, lenguaje claro y botones grandes.
Ethics/data: solo datos ficticios; el QR no lleva datos personales; los avisos nunca incluyen diagnóstico; persona de confianza solo con consentimiento y revocable; un resultado anormal dispara llamada humana, no solo mensaje; datos mínimos (LFPDPPP, NOM-004-SSA3, NOM-024-SSA3 como referencia para el piloto).

**Timeline (deadline de código 15:30):**
| Hora | Hito |
|---|---|
| 10:30–11:00 | T0 contratos + seed en `main` |
| 11:00–13:30 | Tareas paralelas T1–T10 |
| 13:30–14:30 | Comida; preguntas a mentores de EIRA (§10 / `PREGUNTAS_EIRA.md`) |
| 14:30–15:10 | Integración T11 + deploy |
| 15:10–15:30 | Congelar código, grabar video de respaldo, README final |
| 15:30–16:00 | Ensayo del pitch y envío a Devpost |

## 10. Citable facts (verified on 2026-11-21)
| Fact | Source URL |
|---|---|
| EIRA, fundada en 2017 en Zapotlán el Grande, Jalisco; consultorio en Ciudad Guzmán | https://eiraac.org/ |
| "Más de 40,000 mujeres impactadas y 86,000 estudios realizados" (2025) | https://eiraac.org/ |
| Mapa de alcance: Jalisco 58 municipios y 85,337 estudios; 7 estados; la suma del mapa da 99,260 estudios (≠ 86,000 del texto) | https://eiraac.org/#impacto (datos en https://eiraac.org/js/mapa.js) |
| Tamizaje Rosa: ultrasonido, mastografía, Papanicolaou y nutrición en comunidades rurales e indígenas | https://eiraac.org/tamizaje.html |
| +300 resultados de Papanicolaou/mes enviados por WhatsApp; si la cuenta se bloquea, las entregas se interrumpen | Brief del reto (Devpost, Vibeathon México 2026) |
| Cáncer cervicouterino en México: 11,919 casos nuevos y 4,967 muertes estimadas (GLOBOCAN 2024) | https://www.scielo.org.mx/pdf/gmm/v159n6/2696-1288-gmm-159-6-591.pdf |
| Cáncer de mama: 8,451 muertes en 2024 (INEGI) | https://www.elsiglodetorreon.com.mx/noticia/2026/concluyen-jornadas-de-mastografias-gratuitas-durante-octubre-se-realizaron-y-gestionaron-107-mastografias-gra.html |
| Caravana Rosa: 61% (2024) y 73.29% (2025) de pases de mastografía gratuita redimidos → pérdida de seguimiento | misma nota de El Siglo de Torreón |
| Formato de revisión mamaria de EIRA (hoja 2): campos 18–24 con exploración clínica, termografía, ultrasonido (CHISON 5, 10 MHz), BIRADS 0–5, conducta a seguir, motivo de referencia, nombre/firma/cédula y sello institucional | Drive compartido por EIRA, `Formato de revision mamaria.jpeg` (21 nov 2026) |
| Contactos de EIRA dispersos: el formato dice hola@eiraac.org, cel. 3411596782 y fijo 3414108111; la web dice contacto@eira.org y otros WhatsApp | Formato anterior + https://eiraac.org/ |
| **[To validate]** Hoja 1 del formato (campos 1–17, datos de la paciente) y formato/resultado de Papanicolaou (¿Bethesda?) | Pedir a mentores de EIRA |
| **[To validate]** % de Papanicolaou anormales, pacientes sin celular propio, cómo entregan hoy sin WhatsApp, si el laboratorio puede leer folio/QR | Preguntar a mentores de EIRA |
