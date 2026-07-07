from io import BytesIO
from pathlib import Path

import qrcode
from reportlab.graphics.barcode import code128
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from app.config import get_settings
from app.models import Box


def _font() -> str:
    for path in [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]:
        if Path(path).exists():
            try:
                pdfmetrics.registerFont(TTFont("STEMFont", path))
                return "STEMFont"
            except Exception:
                pass
    return "Helvetica"


FONT = _font()
FONT_BOLD = FONT if FONT != "Helvetica" else "Helvetica-Bold"


def _short(text: str | None, limit: int) -> str:
    text = (text or "").strip()
    return text[:limit]


def make_qr_image(data: str) -> ImageReader:
    img = qrcode.make(data)
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


def generate_box_label_pdf(box: Box) -> bytes:
    settings = get_settings()
    public_url = f"{settings.public_base_url.rstrip()}/box/{box.public_token}"

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4

    label_w = 100 * mm
    label_h = 70 * mm
    x = 15 * mm
    y = page_h - 20 * mm - label_h

    c.rect(x, y, label_w, label_h)

    c.setFont(FONT_BOLD, 12)
    c.drawString(x + 5 * mm, y + 60 * mm, _short(box.project.project_code, 32))
    c.setFont(FONT_BOLD, 10)
    box_position = ""
    if box.box_number and box.total_boxes:
        box_position = f"Позиция {box.box_number}/{box.total_boxes}"
    c.drawRightString(x + label_w - 5 * mm, y + 60 * mm, box_position)

    c.setFont(FONT_BOLD, 10)
    c.drawString(x + 5 * mm, y + 53 * mm, _short(box.title or box.label_text, 42))

    # QR for people: opens public page
    qr = make_qr_image(public_url)
    c.drawImage(qr, x + 5 * mm, y + 18 * mm, width=28 * mm, height=28 * mm)

    # Barcode for scanner/TSD: short box code only
    barcode = code128.Code128(box.box_code, barHeight=18 * mm, barWidth=0.45 * mm)
    barcode.drawOn(c, x + 38 * mm, y + 24 * mm)

    c.setFont(FONT_BOLD, 13)
    c.drawString(x + 38 * mm, y + 18 * mm, box.box_code)

    c.setFont(FONT, 8)
    if box.comment:
        c.drawString(x + 5 * mm, y + 7 * mm, f"Комментарий: {_short(box.comment, 90)}")
    c.setFont(FONT, 7)
    c.drawRightString(x + label_w - 5 * mm, y + 4 * mm, "QR: состав и история | Barcode: сканирование")

    c.showPage()
    c.save()
    return buffer.getvalue()
