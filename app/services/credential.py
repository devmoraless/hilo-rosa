"""Folio EIRA-XXXX, opaque revocable QR token and the printable credential (IDEA.md §2).

The QR encodes only <public_url>/p/<qr_token>: no name, birthdate or folio. Revoking means
setting qr_revocado and issuing a new token with `rotate_qr_token`.
"""

import io
import secrets

import qrcode
from PIL import Image, ImageDraw, ImageFont
from sqlmodel import Session, select

from app.config import settings
from app.db import Patient

FOLIO_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L: dictated by phone
TOKEN_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
TOKEN_LENGTH = 22


def new_folio(s: Session) -> str:
    while True:
        folio = "EIRA-" + "".join(secrets.choice(FOLIO_ALPHABET) for _ in range(4))
        if s.exec(select(Patient).where(Patient.folio == folio)).first() is None:
            return folio


def new_qr_token(s: Session) -> str:
    while True:
        token = "".join(secrets.choice(TOKEN_ALPHABET) for _ in range(TOKEN_LENGTH))
        if s.exec(select(Patient).where(Patient.qr_token == token)).first() is None:
            return token


def rotate_qr_token(s: Session, patient: Patient) -> str:
    """Revoke the printed QR (lost credential) and issue a new one."""
    patient.qr_token = new_qr_token(s)
    patient.qr_revocado = False
    s.add(patient)
    return patient.qr_token


def qr_url(patient: Patient) -> str:
    return f"{settings.hilo_public_url.rstrip('/')}/p/{patient.qr_token}"


def _font(size: int) -> ImageFont.ImageFont:
    for name in ("DejaVuSans-Bold.ttf", "Arial Bold.ttf", "arialbd.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def render_credential_png(patient: Patient) -> bytes:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
    qr.add_data(qr_url(patient))
    qr.make(fit=True)
    code = qr.make_image(fill_color="black", back_color="white").convert("RGB").resize((360, 360), Image.NEAREST)

    card = Image.new("RGB", (900, 500), "white")
    draw = ImageDraw.Draw(card)
    draw.rectangle([0, 0, 899, 70], fill=(214, 51, 132))
    draw.text((30, 18), "Hilo Rosa · EIRA", font=_font(32), fill="white")
    card.paste(code, (510, 100))
    nombre_corto = f"{patient.nombre.split()[0]} {patient.apellidos[:1]}."
    draw.text((30, 120), "Folio", font=_font(24), fill=(90, 90, 90))
    draw.text((30, 150), patient.folio, font=_font(64), fill="black")
    draw.text((30, 250), nombre_corto, font=_font(36), fill="black")
    draw.text((30, 320), "Escanea para ver tus resultados.", font=_font(22), fill=(90, 90, 90))
    draw.text((30, 350), "Se pide verificación: nadie más los abre.", font=_font(22), fill=(90, 90, 90))
    draw.text((30, 440), "DEMO · datos ficticios", font=_font(18), fill=(150, 150, 150))
    buf = io.BytesIO()
    card.save(buf, format="PNG")
    return buf.getvalue()
