"""Fictitious demo data (demo_data: true). Deterministic: the same seed every reset.

- PATIENTS: 40 synthetic patients in real municipalities of southern Jalisco. María López Hernández
  (IDEA.md §3) is the demo case: Tamazula, 1974, ultrasound in March 2025, credential EIRA-7K3P.
- MATCH_CASES: 40 queries a capturista might type for a patient who already came (known
  variations: no accents, "Ma.", inverted surnames, swapped day/month, missing second surname,
  typo). NON_MATCH_CASES: 10 queries for people who are NOT in the registry, several sharing a
  surname or municipality with a real one. Used to report the matcher's precision/recall.
"""

import random
import unicodedata

MUNICIPIOS = [
    "Tamazula de Gordiano",
    "Zapotlán el Grande",
    "Tuxpan",
    "Zapotiltic",
    "Tecalitlán",
    "Pihuamo",
    "Gómez Farías",
    "Sayula",
]

NOMBRES = [
    "María", "Guadalupe", "Josefina", "Rosa", "Juana", "Margarita", "Verónica", "Leticia",
    "Patricia", "Elena", "Martha", "Teresa", "Silvia", "Alejandra", "Gabriela", "Claudia",
    "Norma", "Irma", "Lucía", "Adriana",
]
APELLIDOS = [
    "López", "Hernández", "García", "Martínez", "Ramírez", "Sánchez", "Pérez", "González",
    "Rodríguez", "Flores", "Gómez", "Díaz", "Cruz", "Morales", "Reyes", "Gutiérrez",
    "Ortiz", "Chávez", "Ruiz", "Mendoza", "Vargas", "Castillo", "Jiménez", "Aguilar",
]

FOLIO_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L

MARIA = {
    "id": "pat-maria",
    "folio": "EIRA-7K3P",
    "nombre": "María",
    "apellidos": "López Hernández",
    "fecha_nacimiento": "1974-05-12",
    "municipio": "Tamazula de Gordiano",
    "telefono": "+523411000001",  # Laura's phone (shared); fictitious
    "telefono_propio": False,
    "canal_aviso": "telegram",
    "qr_token": "Xb7nQ2vRk9TzWm4pHs8dLc",
}
LAURA = {
    "id": "tc-laura",
    "patient_id": "pat-maria",
    "nombre": "Laura Martínez López",
    "parentesco": "hija",
    "telefono": "+523411000001",
}
JORNADA = {
    "id": "jor-tamazula-2026-11",
    "municipio": "Tamazula de Gordiano",
    "sede": "Centro de Salud Tamazula",
    "fecha": "2026-11-21",
}
PAST_JORNADA = {
    "id": "jor-tamazula-2025-03",
    "municipio": "Tamazula de Gordiano",
    "sede": "Casa de la Cultura Tamazula",
    "fecha": "2025-03-08",
}


def _strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def _folio(rng: random.Random) -> str:
    return "EIRA-" + "".join(rng.choice(FOLIO_ALPHABET) for _ in range(4))


def _token(rng: random.Random) -> str:
    return "".join(rng.choice("abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(22))


def _build_patients() -> list[dict]:
    rng = random.Random(2026_11_21)
    patients = [MARIA]
    used_names = {("María", "López Hernández")}
    used_folios = {MARIA["folio"]}
    i = 1
    while len(patients) < 40:
        nombre = NOMBRES[i % len(NOMBRES)]
        ap1, ap2 = rng.sample(APELLIDOS, 2)
        if (nombre, f"{ap1} {ap2}") in used_names:
            continue
        folio = _folio(rng)
        if folio in used_folios:
            continue
        used_names.add((nombre, f"{ap1} {ap2}"))
        used_folios.add(folio)
        year = rng.randint(1958, 1998)
        month = rng.randint(1, 12)
        day = rng.randint(1, 28)
        # Tamazula gets half of the registry so the jornada snapshot is realistic.
        municipio = MUNICIPIOS[0] if i % 2 else MUNICIPIOS[i % len(MUNICIPIOS)]
        propio = rng.random() > 0.35
        patients.append(
            {
                "id": f"pat-{i:03d}",
                "folio": folio,
                "nombre": nombre,
                "apellidos": f"{ap1} {ap2}",
                "fecha_nacimiento": f"{year:04d}-{month:02d}-{day:02d}",
                "municipio": municipio,
                "telefono": f"+52341{rng.randint(1000000, 9999999)}",
                "telefono_propio": propio,
                "canal_aviso": "telegram" if propio else "sms",
                "qr_token": _token(rng),
            }
        )
        i += 1
    return patients


PATIENTS: list[dict] = _build_patients()


def _swap_day_month(fecha: str) -> str:
    y, m, d = fecha.split("-")
    if int(d) > 12:  # cannot swap into a valid date: keep the same date (exact match variation)
        return fecha
    return f"{y}-{d}-{m}"


def _variation(p: dict, kind: int) -> dict:
    ap1, ap2 = p["apellidos"].split(" ", 1)
    q = {
        "nombre": p["nombre"],
        "apellidos": p["apellidos"],
        "fecha_nacimiento": p["fecha_nacimiento"],
        "municipio": p["municipio"],
        "telefono": None,
    }
    if kind == 0:  # no accents, lower case
        q["nombre"] = _strip_accents(p["nombre"]).lower()
        q["apellidos"] = _strip_accents(p["apellidos"]).lower()
    elif kind == 1:  # "Ma." abbreviation (or initial for other names)
        q["nombre"] = "Ma." if p["nombre"] == "María" else p["nombre"][:3] + "."
    elif kind == 2:  # inverted surnames
        q["apellidos"] = f"{ap2} {ap1}"
    elif kind == 3:  # swapped day and month
        q["fecha_nacimiento"] = _swap_day_month(p["fecha_nacimiento"])
    elif kind == 4:  # only the first surname, with "de"
        q["apellidos"] = f"de {ap1}"
    else:  # typo in the first surname (one dropped letter), phone given
        q["apellidos"] = f"{ap1[:-2]}{ap1[-1]} {ap2}"
        q["telefono"] = p["telefono"]
    return q


def _build_match_cases() -> list[dict]:
    cases = []
    for idx, p in enumerate(PATIENTS):
        q = _variation(p, idx % 6)
        cases.append({"query": q, "expected_patient_id": p["id"], "variation": idx % 6})
    # The demo query from IDEA.md §4 step 1 replaces María's generated one.
    cases[0] = {
        "query": {
            "nombre": "Maria",
            "apellidos": "Lopez",
            "fecha_nacimiento": "1974-05-12",
            "municipio": "Tamazula de Gordiano",
            "telefono": None,
        },
        "expected_patient_id": "pat-maria",
        "variation": 0,
    }
    return cases


MATCH_CASES: list[dict] = _build_match_cases()

NON_MATCH_CASES: list[dict] = [
    {"query": q, "expected_patient_id": None}
    for q in [
        {"nombre": "María", "apellidos": "López Zúñiga", "fecha_nacimiento": "1991-10-30", "municipio": "Tamazula de Gordiano", "telefono": None},
        {"nombre": "Ana", "apellidos": "Hernández Soto", "fecha_nacimiento": "1980-01-15", "municipio": "Tuxpan", "telefono": None},
        {"nombre": "Karla", "apellidos": "Villaseñor Ibarra", "fecha_nacimiento": "1995-07-04", "municipio": "Sayula", "telefono": None},
        {"nombre": "Rosa", "apellidos": "Navarro Cervantes", "fecha_nacimiento": "1966-02-20", "municipio": "Pihuamo", "telefono": None},
        {"nombre": "Fernanda", "apellidos": "Macías Robles", "fecha_nacimiento": "2001-12-01", "municipio": "Zapotiltic", "telefono": None},
        {"nombre": "Guadalupe", "apellidos": "Toscano Medina", "fecha_nacimiento": "1972-09-09", "municipio": "Tecalitlán", "telefono": None},
        {"nombre": "Brenda", "apellidos": "Arreola Fajardo", "fecha_nacimiento": "1988-04-18", "municipio": "Tamazula de Gordiano", "telefono": None},
        {"nombre": "Esperanza", "apellidos": "Quintero Llamas", "fecha_nacimiento": "1959-06-25", "municipio": "Gómez Farías", "telefono": None},
        {"nombre": "Diana", "apellidos": "Ochoa Pulido", "fecha_nacimiento": "1993-03-03", "municipio": "Zapotlán el Grande", "telefono": None},
        {"nombre": "Susana", "apellidos": "Barajas Delgado", "fecha_nacimiento": "1977-11-11", "municipio": "Tamazula de Gordiano", "telefono": None},
    ]
]
