# Seguridad y privacidad · Hilo Rosa

> Prototipo con datos ficticios. Las normas citadas son **referencia para un piloto**, no una certificación de cumplimiento.

## Principios
1. **Datos mínimos.** El snapshot offline lleva solo lo necesario para reconocer a una paciente en su municipio (nombre, fecha de nacimiento, municipio, folio, último estudio). El laboratorio solo ve folio y estado, nunca el expediente.
2. **Los avisos nunca incluyen diagnóstico.** El mensaje dice que hay un resultado listo y cómo abrirlo. Un resultado anormal no se avisa por mensaje: crea la tarea "llamar" y una persona de EIRA habla con la paciente.
3. **El QR no contiene datos personales.** Es un token opaco, aleatorio y **revocable** (token revocado → HTTP 410).
4. **Acceso con tres elementos sencillos:** algo que tiene (la credencial QR) + algo que sabe (fecha de nacimiento) + el teléfono registrado (OTP de 6 dígitos).
5. **Persona de confianza solo con consentimiento y revocable.** Se guarda `consentimiento_at` y `activo`; cada vista queda en la bitácora con su nombre y parentesco ("visto por Laura (hija)").
6. **Una persona siempre decide** lo clínico: confirmar una coincidencia, asociar un PDF sin folio y autorizar un resultado.

## Controles
| Control | Parámetro | Dónde |
|---|---|---|
| OTP | 6 dígitos · TTL 5 min · máximo 5 intentos (el 6.º se bloquea) | `app/services/otp.py` |
| Sesión de acceso | 15 min | `app/services/access.py` |
| Verificación previa al OTP | Fecha de nacimiento; si no coincide, se rechaza | `app/routers/access.py` |
| Token del QR | Opaco, revocable, sin datos personales | `app/services/credential.py` |
| Autorización clínica | Rol médica + nombre + cédula profesional | `app/routers/review.py` |
| Visibilidad por rol | Laboratorio no ve expediente; paciente/familiar solo ve resultados `notificado` | routers |
| Bitácora | Cada evento guarda `prev_hash` y `hash` SHA-256; `verify()` detecta alteraciones | `app/services/audit.py` |
| Idempotencia | `op_id` evita duplicados al reintentar; `base_version` evita sobrescribir | `app/services/sync.py` |
| Secretos | Solo en variables de entorno (`TELEGRAM_BOT_TOKEN`, `VALKEY_URL`, `ANTHROPIC_API_KEY`); nunca en el repo | `.env.example` |
| Sin enlaces permanentes | El link `/p/<token>` no abre nada sin fecha de nacimiento + OTP | flujo de acceso |

(Las rutas de archivo son las del backlog; ver el estado de cada una en `IMPLEMENTADO_VS_SIMULADO.md`.)

## Limitaciones conocidas del prototipo
- **Roles simulados** con el header `X-Demo-Role`: cualquiera puede elegir rol. Un piloto necesita login real por usuario.
- **IndexedDB sin cifrar** en la tablet (fuera de alcance). Mitigación para piloto: tabletas con bloqueo, borrado del snapshot al cerrar la jornada y cifrado en reposo.
- **SQLite en el servidor** sin cifrado ni respaldos gestionados.
- **El OTP va al teléfono registrado.** Si el celular es compartido, quien tenga el teléfono y la credencial y sepa la fecha de nacimiento puede entrar. Por eso un resultado anormal nunca se entrega solo por la app.
- **La cadena de hashes** detecta alteraciones, pero quien controla el servidor podría reescribirla completa. Para piloto: respaldar el hash más reciente fuera del servidor.
- **Telegram** como canal de aviso es una decisión de hackathon; el canal real se acuerda con EIRA (ver `PREGUNTAS_EIRA.md`).
- Sin limitación de tasa por IP ni monitoreo en el prototipo.

## Marco de referencia para un piloto
- **LFPDPPP** (Ley Federal de Protección de Datos Personales en Posesión de los Particulares): aviso de privacidad, consentimiento expreso para datos sensibles de salud, derechos ARCO.
- **NOM-004-SSA3** (expediente clínico): confidencialidad, conservación y responsable del expediente.
- **NOM-024-SSA3** (sistemas de información de registro electrónico para la salud): seguridad, trazabilidad e intercambio de información.

Qué revisar con EIRA y su asesoría legal antes de producción: quién es el responsable del tratamiento, tiempos de conservación, si la persona de confianza requiere consentimiento por escrito y si la autorización con nombre + cédula basta para liberar un resultado. Ver `PREGUNTAS_EIRA.md`.
