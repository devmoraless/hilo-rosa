# Riesgos, operación, costos y piloto · Hilo Rosa

## El problema que atacamos
- EIRA entrega **más de 300 resultados de Papanicolaou al mes por WhatsApp**; si la cuenta se bloquea, las entregas se interrumpen. Fuente: brief del reto (Devpost, Vibeathon México 2026).
- La pérdida de seguimiento es real en programas similares: en la Caravana Rosa se redimió el **61% (2024)** y el **73.29% (2025)** de los pases de mastografía gratuita. Fuente: https://www.elsiglodetorreon.com.mx/noticia/2026/concluyen-jornadas-de-mastografias-gratuitas-durante-octubre-se-realizaron-y-gestionaron-107-mastografias-gra.html
- Contexto: cáncer cervicouterino en México, **11,919 casos nuevos y 4,967 muertes estimadas** (GLOBOCAN 2024). Fuente: https://www.scielo.org.mx/pdf/gmm/v159n6/2696-1288-gmm-159-6-591.pdf
- Escala de EIRA: **"Más de 40,000 mujeres impactadas y 86,000 estudios realizados"** (2025), https://eiraac.org/ · su mapa de alcance reporta Jalisco con 58 municipios y 85,337 estudios, https://eiraac.org/#impacto (la suma del mapa da 99,260, distinta de los 86,000 del texto; ver `PREGUNTAS_EIRA.md`).

## Riesgos
| # | Riesgo | Impacto | Mitigación en el diseño | Pendiente para piloto |
|---|---|---|---|---|
| R1 | Coincidencia equivocada (se liga el estudio a otra mujer) | Alto: resultado a la persona equivocada | Matching explicable con razones; nunca fusiona; la capturista confirma "Es ella / Es otra" | Medir precisión/recall con datos reales; capacitación |
| R2 | PDF asociado a la paciente equivocada | Alto | Solo folio exacto; sin folio → bandeja manual | Confirmar si el laboratorio puede imprimir el folio/QR en el PDF |
| R3 | Resultado anormal recibido sin acompañamiento | Alto | Anormal no se avisa por mensaje: tarea "llamar" y referencia a 2.º nivel | Protocolo de llamada y responsables en EIRA |
| R4 | Celular compartido: otra persona ve el resultado | Medio | OTP + fecha de nacimiento + credencial; aviso sin diagnóstico; bitácora de quién vio | Validar con pacientes si aceptan este nivel |
| R5 | Pérdida o robo de la credencial | Bajo | QR sin datos; token revocable | Proceso de reposición en jornada |
| R6 | Pérdida de la tablet con el snapshot | Medio | Datos mínimos | Cifrado en reposo, bloqueo y borrado remoto (fuera de alcance del prototipo) |
| R7 | Conflictos al sincronizar varios dispositivos | Medio | `op_id` idempotente y `base_version`: se reporta, no se sobrescribe | Pantalla de resolución de conflictos |
| R8 | Canal de aviso bloqueado (el mismo problema de hoy) | Alto | `Notifier` intercambiable (Telegram, log, SMS); el acceso no depende del mensaje: la credencial abre el resultado | Elegir canal oficial y uno de respaldo |
| R9 | Pacientes sin celular o con baja alfabetización digital | Alto | Persona de confianza; botones grandes; lectura en voz; entrega en persona sigue disponible | Medir cuántas pacientes no tienen celular propio |
| R10 | Formato real de Papanicolaou distinto al supuesto (Bethesda) | Medio | Reglas en una tabla aislada (`rules.py`) | Obtener el formato real del laboratorio |
| R11 | Uso indebido por roles simulados | Alto en producción | Solo demo | Login real por usuario y permisos |

## Operación en una jornada
1. **Antes (con internet):** la tablet descarga el snapshot del municipio y la app queda disponible sin red.
2. **Durante (sin internet):** registro, búsqueda de recurrentes, persona de confianza y estudio; todo queda en la cola local.
3. **Al volver a la red:** sincronización; se generan folio y credencial (impresión física fuera de alcance del prototipo).
4. **Laboratorio:** sube los PDFs; los que no traen folio los revisa una persona.
5. **Médica:** revisa, captura Bethesda/BIRADS y conducta, autoriza con nombre y cédula.
6. **Aviso:** normal/repetir → mensaje sin diagnóstico; anormal → llamada.
7. **Acceso:** la paciente o su familiar escanea la credencial y abre el resultado; EIRA ve en la bitácora quién y cuándo.

Roles necesarios: capturista, persona de laboratorio, médica(s) con cédula, alguien que atienda la bandeja "sin asociar" y las tareas "llamar", y un responsable técnico.

## Costos estimados
**Todas las cifras de este bloque son estimaciones o están por confirmar.** No verificamos precios durante la hackathon; no se cita ningún precio que no hayamos comprobado.

| Concepto | Supuesto | Costo |
|---|---|---|
| Hosting de la app (Render, un servicio web) | Un solo servicio con API + web estática; volumen de ~300 resultados/mes | **Por confirmar** en el plan vigente de Render. El plan gratuito sirve para la demo, no para producción (se duerme y no garantiza persistencia del disco) |
| Base de datos | Migrar de SQLite a PostgreSQL gestionado para el piloto | **Por confirmar** |
| Valkey para OTP/sesiones | Instancia pequeña gestionada (o se omite con el respaldo en memoria si hay una sola instancia) | **Por confirmar** |
| Telegram Bot API | Avisos y OTP por bot | Estimado: sin costo por mensaje (supuesto, **por confirmar** en los términos vigentes de Telegram) |
| SMS / WhatsApp Business | Si EIRA elige un canal oficial | **Por confirmar** con el proveedor; depende del volumen (~300 avisos/mes más OTP) |
| LLM opcional (P2) | Solo para sugerir redacción; se puede apagar | Estimado: $0 si se usan solo plantillas |
| Tabletas | EIRA ya opera jornadas; se asume que puede usar equipos existentes con navegador moderno | **Por confirmar** con EIRA |
| Impresión de credenciales | Tarjeta con folio y QR por paciente | **Por confirmar** |

## Próximos pasos para un piloto en una jornada real
1. **Validar supuestos con EIRA** (`PREGUNTAS_EIRA.md`): formato de Papanicolaou, hoja 1 del formato, canal de aviso, pacientes sin celular.
2. **Seguridad mínima para datos reales:** login por usuario, HTTPS, PostgreSQL con respaldos, cifrado del snapshot en la tablet, aviso de privacidad y consentimiento (LFPDPPP).
3. **Piloto acotado:** una jornada en un municipio (por ejemplo Tamazula de Gordiano), en paralelo al proceso actual por WhatsApp, sin reemplazarlo.
4. **Medir:** tiempo de registro por paciente, coincidencias confirmadas vs rechazadas, PDFs asociados por folio vs manuales, resultados abiertos por la paciente o su familiar, llamadas por resultado anormal completadas.
5. **Laboratorio:** acordar que el folio (o el QR) aparezca en el PDF para que la asociación sea automática.
6. **Decidir** con base en las métricas si se extiende a más municipios y a mastografía/ultrasonido.
