# Motor de coincidencias offline (`web/src/lib/match.ts`)

TypeScript puro, sin dependencias y sin red: corre en el navegador de la brigada aun sin señal.
Es determinístico y explicable: para cada paciente registrada devuelve `{ score 0–100, razones[] }`.
**Nunca fusiona registros**: `findCandidates()` solo ordena candidatas; una persona confirma "Es ella / Es otra".

## Método

1. **Normalización del nombre** (`nameTokens`): sin acentos, minúsculas, `Ma.` / `Ma` → `maria`,
   se quitan las partículas `de, del, la, las, los, el, y`, y cualquier signo separa palabras.
   El orden no importa (los apellidos pueden venir invertidos).
2. **Similitud del nombre** (`tokenSetRatio`): token-set ratio al estilo `rapidfuzz.fuzz.token_set_ratio`
   (similitud indel normalizada sobre intersección y diferencias ordenadas). Si una búsqueda es subconjunto
   del nombre registrado ("Maria Lopez" ⊂ "María López Hernández") da 100.
3. **Regla del nombre de pila**: si ninguna palabra del nombre de pila registrado aparece (similitud ≥ 85)
   en la búsqueda, la similitud del nombre se multiplica por 0.6 y se explica ("Nombre de pila distinto").
   Así "Rosa López Hernández" no se confunde con "María López Hernández" aunque compartan apellidos.
4. **Evidencia adicional** (Fellegi–Sunter simplificado con pesos fijos; solo cuentan los campos que
   existen en ambos lados):

   | Campo | Peso | Valor |
   |---|---|---|
   | Nombre | 60 | token-set ratio (0–1), con la regla del nombre de pila |
   | Fecha de nacimiento | 25 | exacta 1 · día/mes invertidos 0.8 · solo año y coincide 0.7 · distinta 0 |
   | Municipio | 10 | igual 1 · distinto 0 (sin acentos; "Tamazula" = "Tamazula de Gordiano") |
   | Teléfono | 10 | mismos últimos 10 dígitos 1 · distinto 0 |

   `score = round(100 × Σ peso·valor / Σ pesos presentes)`.
   Fechas aceptadas: `AAAA-MM-DD`, `DD/MM/AAAA` o solo `AAAA`.
5. **Umbral**: `score ≥ 85` = "posible coincidencia". Por defecto `findCandidates()` devuelve solo esas,
   ordenadas de mayor a menor, máximo 5; cada una apunta al mismo objeto del registro (no copia ni mezcla
   campos de la búsqueda).

Ejemplo: "Maria Lopez" contra María López Hernández (1974, Tamazula de Gordiano) → score 100, con razones
"Nombre coincide 100% (sin acentos ni mayúsculas)" y "La búsqueda no incluye: hernandez".

## Validación

Set sintético en `web/src/lib/match.fixtures.ts` (todos los datos son ficticios, `DEMO_DATA = true`):

- **40 pacientes registradas** y **40 búsquedas con variaciones conocidas**, una por paciente: acentos y
  mayúsculas, "Ma.", apellidos invertidos, día/mes cruzado, sin segundo apellido, partículas
  ("Pérez de la Cruz" → "Perez Cruz"), erratas ("Esquibel", "Carillo") y combinaciones. Incluye a
  María López Hernández, 1974, Tamazula de Gordiano, ultrasonido mar 2025.
- **10 no-coincidencias**: personas que no están registradas pero se parecen a alguien (mismos apellidos,
  misma fecha y municipio con otro nombre de pila, homónimas con otra fecha, "Rosario" vs "Rosa", etc.).

Se evalúa **por pares**: cada búsqueda (40 + 10) contra cada paciente registrada (40) = 2000 pares.
Un par es positivo si `score ≥ 85`; es correcto si la búsqueda corresponde a esa paciente.

Resultado que imprime `node --test web/src/lib/match.test.ts` (21 nov 2026):

```
MATCHING_METRICS pares=2000 umbral=85 TP=40 FP=0 FN=0 precision=1.000 recall=1.000
```

- **Precisión 1.000 · Recall 1.000** en este set (40 verdaderos positivos, 0 falsos positivos, 0 falsos negativos).
- Las 40 búsquedas verdaderas puntuaron entre 94 y 100; la no-coincidencia más alta llegó a 74
  (homónima de Juana Sánchez Díaz, mismo municipio, otro año de nacimiento).

### Límites (dicho tal cual)

- No existe un dataset público de pacientes; estas 50 búsquedas son **sintéticas** y se escribieron junto
  con el motor, así que los números son optimistas y no prueban el desempeño con datos reales.
- Homónimas exactas sin fecha de nacimiento (solo nombre y municipio) sí cruzan el umbral: por eso el motor
  nunca fusiona y siempre pide confirmación humana.
- No resuelve apodos ("Lupita" → Guadalupe) ni cambios de apellido por matrimonio.
