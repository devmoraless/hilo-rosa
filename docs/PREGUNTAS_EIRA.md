# Preguntas abiertas y supuestos a validar con EIRA · Hilo Rosa

> Lo que asumimos para construir el prototipo y que necesitamos confirmar con EIRA (https://eiraac.org/) antes de usar datos reales. Ordenado por impacto en el diseño.

## 1. Formato de resultados
| # | Pregunta | Supuesto actual en el prototipo | Si la respuesta es distinta |
|---|---|---|---|
| P1 | ¿Cómo reporta el laboratorio el Papanicolaou? ¿Usa el sistema **Bethesda**? | `PapResult` con bethesda (NILM · ASC-US · LSIL · ASC-H · HSIL · AGC · insatisfactoria), conducta (rutina 1 año · repetir · colposcopía/referencia) y notas | Ajustar la tabla de reglas en `rules.py` y el formulario de la médica |
| P2 | ¿Nos pueden compartir el formato real del resultado de Papanicolaou (ejemplo anonimizado)? | Generamos PDFs sintéticos | Ajustar la extracción de folio y los campos |
| P3 | ¿Qué conducta sigue EIRA para cada resultado? | NILM → rutina en 1 año; insatisfactoria → nueva muestra; cualquier otro → llamada y referencia a 2.º nivel | Cambiar seguimiento automático y plantillas de texto claro |
| P4 | ¿Qué contiene la **hoja 1 del formato** (campos 1–17, datos de la paciente)? | Solo tenemos la hoja 2 (campos 18–24 de revisión mamaria). Usamos nombre, apellidos, fecha de nacimiento, municipio, teléfono | Ajustar el registro para usar la misma numeración del papel |
| P5 | ¿El texto claro de las plantillas es adecuado para sus pacientes? ¿Quién lo aprueba? | Plantillas fijas por clasificación, autorizadas por la médica | Reescribir plantillas con EIRA |

## 2. Pacientes y acceso
| # | Pregunta | Supuesto actual | Si la respuesta es distinta |
|---|---|---|---|
| P6 | ¿Qué porcentaje de pacientes **no tiene celular propio**? | Muchas comparten celular; por eso existe la persona de confianza | Si casi todas tienen celular, la persona de confianza pasa a opcional |
| P7 | ¿Es común que una hija u otro familiar reciba los resultados? ¿Con qué consentimiento? | Persona de confianza con consentimiento registrado y revocable | Ajustar el flujo de consentimiento (¿por escrito?) |
| P8 | ¿El perfil del caso demo (mujer rural de ~50 años que regresa a otra jornada) es típico? | Sí, por el regreso a jornadas y el celular compartido | Ajustar el caso y las prioridades de la UI |
| P9 | ¿La fecha de nacimiento + código al teléfono es un nivel de verificación aceptable para ustedes y sus pacientes? | Sí, más la credencial QR | Agregar otro factor o entrega asistida |
| P10 | ¿Pueden entregar una credencial física con folio y QR en la jornada? | Sí (la impresión está fuera de alcance del prototipo) | Usar solo folio escrito o el QR en pantalla |

## 3. Operación actual
| # | Pregunta | Supuesto actual | Si la respuesta es distinta |
|---|---|---|---|
| P11 | ¿Cómo entregan hoy los resultados **cuando WhatsApp falla**? | Se interrumpen las entregas (brief del reto: +300 resultados/mes por WhatsApp) | Integrar ese canal alternativo como respaldo |
| P12 | ¿Qué **porcentaje de Papanicolaou sale anormal**? | Desconocido; todo anormal genera una llamada | Dimensionar el equipo que hace llamadas |
| P13 | ¿El laboratorio puede **imprimir o leer el folio/QR** en sus PDFs? | Asociación por folio exacto en el texto del PDF; si no, bandeja manual | Si no puede, más carga manual o OCR (P2) |
| P14 | ¿Cuántas tabletas o dispositivos se usan por jornada y quién las tiene? | Pocos dispositivos por jornada; sin CRDT | Priorizar sincronización multidispositivo |
| P15 | ¿Qué canal de aviso prefieren (Telegram, SMS, WhatsApp Business)? | Telegram en la demo, con `LogNotifier` de respaldo | Implementar otro `Notifier` |
| P16 | ¿Quién en EIRA autoriza resultados y tiene cédula profesional? | Una médica autoriza con nombre + cédula | Ajustar roles y permisos |

## 4. Legal y datos
| # | Pregunta | Supuesto actual |
|---|---|---|
| P17 | ¿Quién es el responsable del tratamiento de datos y tienen aviso de privacidad vigente (LFPDPPP)? | Por definir con EIRA |
| P18 | ¿Cuánto tiempo deben conservarse los resultados y la bitácora (NOM-004-SSA3)? | Por definir |
| P19 | ¿Basta la autorización con nombre + cédula como "firma" para liberar un resultado? | Sí para el prototipo; por validar para producción |
| P20 | ¿Dónde pueden alojarse los datos (nube, servidor propio)? | Render en la demo |

## 5. Datos públicos que no cuadran
| # | Pregunta | Fuente |
|---|---|---|
| P21 | El texto del sitio dice **86,000 estudios**, pero la suma del mapa de alcance da **99,260** (Jalisco: 58 municipios y 85,337 estudios). ¿Cuál cifra debemos citar? | https://eiraac.org/ y https://eiraac.org/#impacto (datos en https://eiraac.org/js/mapa.js) |
| P22 | Los contactos están dispersos: el formato dice hola@eiraac.org, cel. 3411596782 y fijo 3414108111; la web dice contacto@eira.org y otros WhatsApp. ¿Cuál es el canal oficial que mostraría la app? | Formato anterior + https://eiraac.org/ |
| P23 | ¿Cuál es el rosa oficial de la marca EIRA para la interfaz? | Tomado del sitio https://eiraac.org/ (por confirmar) |
