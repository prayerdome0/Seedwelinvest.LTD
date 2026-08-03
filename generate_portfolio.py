"""
Generate a polished PDF portfolio for Zacheus Simbaya's Seedwel Investment LTD
based on the website content (Seedwelinvest.LTD).
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame,
    Paragraph, Spacer, Image, PageBreak, KeepTogether, Table, TableStyle, Flowable,
    NextPageTemplate
)
from datetime import date

# ─────────────────────  BRAND COLORS  ─────────────────────
RED         = colors.HexColor("#dc2626")
RED_DARK    = colors.HexColor("#b91c1c")
RED_SOFT    = colors.HexColor("#fef2f2")
INK         = colors.HexColor("#111827")
SLATE       = colors.HexColor("#334155")
SLATE_LIGHT = colors.HexColor("#64748b")
BORDER      = colors.HexColor("#e5e7eb")
BG_SOFT     = colors.HexColor("#f8fafc")
WHITE       = colors.white

PAGE_W, PAGE_H = A4
USABLE_W = PAGE_W - 36*mm          # 174 mm inside margins
USABLE_INNER = USABLE_W - 12*mm    # 162 mm after frame padding
# 3 columns:  162 / 3 = 54 mm each (with 4 mm gap)
# 2 columns:  162 / 2 = 81 mm each
# 4 columns:  162 / 4 = 40.5 mm each

# ─────────────────────  CUSTOM FLOWABLES  ─────────────────────
class ColorBox(Flowable):
    def __init__(self, w, h, fill=RED, stroke=None, radius=0):
        Flowable.__init__(self)
        self.w, self.h, self.fill, self.stroke, self.radius = w, h, fill, stroke, radius
    def draw(self):
        self.canv.setFillColor(self.fill)
        if self.stroke:
            self.canv.setStrokeColor(self.stroke)
            self.canv.setLineWidth(0.5)
        if self.radius:
            self.canv.roundRect(0, 0, self.w, self.h, self.radius,
                                stroke=1 if self.stroke else 0, fill=1)
        else:
            self.canv.rect(0, 0, self.w, self.h, stroke=1 if self.stroke else 0, fill=1)

class HRule(Flowable):
    def __init__(self, w, h=1, color=BORDER):
        Flowable.__init__(self)
        self.w, self.h, self.color = w, h, color
    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 0, self.w, self.h, fill=1, stroke=0)

# ─────────────────────  PAGE FRAME / DECORATION  ─────────────────────
def draw_page_decor(canv, doc):
    canv.saveState()
    # Left red ribbon
    canv.setFillColor(RED)
    canv.rect(0, 0, 6, PAGE_H, fill=1, stroke=0)
    # Footer band
    canv.setFillColor(BG_SOFT)
    canv.rect(0, 0, PAGE_W, 22 * mm, fill=1, stroke=0)
    canv.setStrokeColor(BORDER)
    canv.setLineWidth(0.5)
    canv.line(15 * mm, 22 * mm, PAGE_W - 15 * mm, 22 * mm)
    # Footer text
    canv.setFont("Helvetica", 8)
    canv.setFillColor(SLATE_LIGHT)
    canv.drawString(15 * mm, 12 * mm, "Seedwel Investment LTD  ·  Zacheus Simbaya")
    canv.drawRightString(PAGE_W - 15 * mm, 12 * mm, f"Page {doc.page}")
    canv.setFillColor(RED)
    canv.setFont("Helvetica-Bold", 8)
    canv.drawCentredString(PAGE_W / 2, 12 * mm, "seedwelinvestltd@gmail.com  ·  +260 973 028 342")
    canv.restoreState()

def draw_cover(canv, doc):
    """Cover: clean dark left + bold red right block. No diagonals crossing text."""
    canv.saveState()
    # Full dark backdrop
    canv.setFillColor(INK)
    canv.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Right red panel (start at 60% so dark area is wide enough for big title)
    PANEL_X = PAGE_W * 0.58
    canv.setFillColor(RED)
    canv.rect(PANEL_X, 0, PAGE_W - PANEL_X, PAGE_H, fill=1, stroke=0)
    # Soft red accent circle on dark side
    canv.setFillColor(colors.Color(0.86, 0.15, 0.15, alpha=0.12))
    canv.circle(PAGE_W * 0.10, PAGE_H * 0.18, 55 * mm, fill=1, stroke=0)
    # Top-left "ZACHEUS SIMBAYA" mark
    canv.setFillColor(WHITE)
    canv.setFont("Helvetica-Bold", 12)
    canv.drawString(22 * mm, PAGE_H - 28 * mm, "ZACHEUS SIMBAYA")
    canv.setStrokeColor(RED)
    canv.setLineWidth(2)
    canv.line(22 * mm, PAGE_H - 32 * mm, 75 * mm, PAGE_H - 32 * mm)
    # Big title (dark side only — ensure fits within 22mm..(PANEL_X-8mm))
    # PANEL_X = 0.58 * 210 = ~122 mm, so dark area is 22..114 mm = 92 mm wide
    title_max_x = PANEL_X - 8 * mm
    canv.setFont("Helvetica-Bold", 48)
    canv.setFillColor(WHITE)
    canv.drawString(22 * mm, PAGE_H - 75 * mm, "Search &")
    canv.drawString(22 * mm, PAGE_H - 105 * mm, "Digital")
    canv.setFillColor(RED)
    canv.drawString(22 * mm, PAGE_H - 135 * mm, "Services")
    # Subtitle / tag line under title
    canv.setFont("Helvetica", 10)
    canv.setFillColor(colors.Color(1, 1, 1, alpha=0.80))
    canv.drawString(22 * mm, PAGE_H - 155 * mm, "A premium digital agency portfolio")
    # Right panel headline
    canv.setFillColor(WHITE)
    canv.setFont("Helvetica-Bold", 12)
    canv.drawRightString(PAGE_W - 18 * mm, PAGE_H - 75 * mm, "PORTFOLIO")
    canv.setFont("Helvetica", 9)
    canv.setFillColor(colors.Color(1, 1, 1, alpha=0.85))
    canv.drawRightString(PAGE_W - 18 * mm, PAGE_H - 90 * mm, "Web · SEO · Branding")
    canv.drawRightString(PAGE_W - 18 * mm, PAGE_H - 100 * mm, "Business Registration")
    canv.drawRightString(PAGE_W - 18 * mm, PAGE_H - 110 * mm, "& More")
    # Small horizontal divider on red panel
    canv.setStrokeColor(WHITE)
    canv.setLineWidth(0.6)
    canv.line(PANEL_X + 10 * mm, PAGE_H - 125 * mm,
              PAGE_W - 18 * mm, PAGE_H - 125 * mm)
    # Stats on red panel
    canv.setFillColor(WHITE)
    canv.setFont("Helvetica-Bold", 14)
    canv.drawString(PANEL_X + 10 * mm, PAGE_H - 145 * mm, "150+")
    canv.setFont("Helvetica", 8)
    canv.drawString(PANEL_X + 10 * mm, PAGE_H - 154 * mm, "Projects")
    canv.setFont("Helvetica-Bold", 14)
    canv.drawString(PANEL_X + 42 * mm, PAGE_H - 145 * mm, "98.9%")
    canv.setFont("Helvetica", 8)
    canv.drawString(PANEL_X + 42 * mm, PAGE_H - 154 * mm, "Satisfaction")
    canv.setFont("Helvetica-Bold", 14)
    canv.drawString(PANEL_X + 10 * mm, PAGE_H - 168 * mm, "6+")
    canv.setFont("Helvetica", 8)
    canv.drawString(PANEL_X + 10 * mm, PAGE_H - 177 * mm, "Years experience")
    canv.setFont("Helvetica-Bold", 14)
    canv.drawString(PANEL_X + 42 * mm, PAGE_H - 168 * mm, "24/7")
    canv.setFont("Helvetica", 8)
    canv.drawString(PANEL_X + 42 * mm, PAGE_H - 177 * mm, "Support")
    # Bottom-left meta (dark side)
    canv.setFillColor(WHITE)
    canv.setFont("Helvetica-Bold", 14)
    canv.drawString(22 * mm, 35 * mm, "2026")
    canv.setStrokeColor(RED)
    canv.setLineWidth(2)
    canv.line(22 * mm, 30 * mm, 65 * mm, 30 * mm)
    canv.setFont("Helvetica", 9)
    canv.setFillColor(colors.Color(1, 1, 1, alpha=0.75))
    canv.drawString(22 * mm, 22 * mm, "Prepared by Seedwel Investment LTD")
    # Bottom-right meta (on red panel)
    canv.setFillColor(WHITE)
    canv.setFont("Helvetica-Bold", 9)
    canv.drawRightString(PAGE_W - 18 * mm, 35 * mm, "ZACHEUS SIMBAYA")
    canv.setFont("Helvetica", 9)
    canv.setFillColor(colors.Color(1, 1, 1, alpha=0.85))
    canv.drawRightString(PAGE_W - 18 * mm, 25 * mm, "Kabwe · Chama · Global Remote")
    canv.drawRightString(PAGE_W - 18 * mm, 16 * mm, "seedwelinvestltd@gmail.com")
    canv.restoreState()

# ─────────────────────  STYLES  ─────────────────────
styles = getSampleStyleSheet()

H1 = ParagraphStyle("h1", parent=styles["Heading1"], fontName="Helvetica-Bold",
                    fontSize=22, leading=28, textColor=INK, spaceBefore=4, spaceAfter=8)

KICKER = ParagraphStyle("kicker", parent=styles["Normal"], fontName="Helvetica-Bold",
                        fontSize=8, leading=10, textColor=RED, spaceAfter=2,
                        alignment=TA_LEFT, letterSpacing=2)

BODY = ParagraphStyle("body", parent=styles["BodyText"], fontName="Helvetica",
                      fontSize=10, leading=14, textColor=SLATE, spaceAfter=6,
                      alignment=TA_JUSTIFY)

BODY_LEFT = ParagraphStyle("bodyl", parent=BODY, alignment=TA_LEFT)

# Card text styles (white on red)
CARD_TITLE = ParagraphStyle("ctitle", fontName="Helvetica-Bold", fontSize=10,
                            leading=12, textColor=WHITE, alignment=TA_CENTER,
                            spaceAfter=2)
CARD_BODY = ParagraphStyle("cbody", fontName="Helvetica", fontSize=8.2,
                           leading=10.5, textColor=colors.Color(1,1,1,alpha=0.95),
                           alignment=TA_CENTER, spaceAfter=2)
CARD_TAGS = ParagraphStyle("ctags", fontName="Helvetica-Bold", fontSize=7.2,
                           leading=9.2, textColor=WHITE, alignment=TA_CENTER)

# ─────────────────────  BUILD DOCUMENT  ─────────────────────
class PortfolioDoc(BaseDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(filename, pagesize=A4,
                         leftMargin=18*mm, rightMargin=18*mm,
                         topMargin=18*mm, bottomMargin=28*mm, **kw)
        body_frame = Frame(18*mm, 22*mm, PAGE_W - 36*mm, PAGE_H - 40*mm,
                           leftPadding=6*mm, rightPadding=6*mm,
                           topPadding=0, bottomPadding=4*mm, showBoundary=0)
        cover_frame = Frame(0, 0, PAGE_W, PAGE_H, leftPadding=0, rightPadding=0,
                            topPadding=0, bottomPadding=0, showBoundary=0)
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[cover_frame], onPage=draw_cover),
            PageTemplate(id="body", frames=[body_frame], onPage=draw_page_decor),
        ])

# ─────────────────────  CONTENT HELPERS  ─────────────────────
def section_header(title, kicker=None):
    items = []
    if kicker:
        items.append(Paragraph(kicker.upper(), KICKER))
    items.append(Paragraph(title, H1))
    items.append(ColorBox(54, 2.4, fill=RED))
    items.append(Spacer(1, 8))
    return items

def stat_block():
    """4-cell KPI strip using USABLE_INNER width."""
    col = USABLE_INNER / 4
    data = [
        [Paragraph("<b>150+</b>", ParagraphStyle("s", fontName="Helvetica-Bold", fontSize=22, textColor=INK, alignment=TA_CENTER)),
         Paragraph("<b>98.9%</b>", ParagraphStyle("s", fontName="Helvetica-Bold", fontSize=22, textColor=INK, alignment=TA_CENTER)),
         Paragraph("<b>6+</b>", ParagraphStyle("s", fontName="Helvetica-Bold", fontSize=22, textColor=INK, alignment=TA_CENTER)),
         Paragraph("<b>24/7</b>", ParagraphStyle("s", fontName="Helvetica-Bold", fontSize=22, textColor=INK, alignment=TA_CENTER))],
        [Paragraph("Projects delivered", ParagraphStyle("s", fontName="Helvetica", fontSize=8.5, textColor=SLATE, alignment=TA_CENTER)),
         Paragraph("Client satisfaction", ParagraphStyle("s", fontName="Helvetica", fontSize=8.5, textColor=SLATE, alignment=TA_CENTER)),
         Paragraph("Years experience", ParagraphStyle("s", fontName="Helvetica", fontSize=8.5, textColor=SLATE, alignment=TA_CENTER)),
         Paragraph("Support available", ParagraphStyle("s", fontName="Helvetica", fontSize=8.5, textColor=SLATE, alignment=TA_CENTER))],
    ]
    t = Table(data, colWidths=[col]*4, rowHeights=[14*mm, 8*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), BG_SOFT),
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("LINEAFTER", (0,0), (2,0), 0.5, BORDER),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    return t

def service_card(title, blurb, items, col_w):
    """A colored service card sized to the column width."""
    body_html = blurb + "<br/><br/>" + " · ".join(
        f"<b>✓ {i}</b>" for i in items
    )
    data = [
        [Paragraph(title.upper(), CARD_TITLE)],
        [Paragraph(body_html, CARD_BODY)],
    ]
    t = Table(data, colWidths=[col_w], rowHeights=[9*mm, None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), RED),
        ("BACKGROUND", (0,1), (-1,1), RED_DARK),
        ("LEFTPADDING", (0,0), (-1,-1), 5),
        ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,0), 4),
        ("BOTTOMPADDING", (0,0), (-1,0), 2),
        ("TOPPADDING", (0,1), (-1,1), 5),
        ("BOTTOMPADDING", (0,1), (-1,1), 6),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]))
    return t

def value_card(label, title, body, col_w):
    """White card with red top accent. label is plain ASCII/short symbol."""
    data = [
        [Paragraph(f"<b>{label}</b>",
            ParagraphStyle("lab", fontName="Helvetica-Bold", fontSize=18,
                           textColor=WHITE, alignment=TA_CENTER))],
        [Paragraph(f"<b>{title}</b>", ParagraphStyle("vt", fontName="Helvetica-Bold",
            fontSize=10, textColor=INK, alignment=TA_CENTER))],
        [Paragraph(body, ParagraphStyle("vb", fontName="Helvetica",
            fontSize=8.2, textColor=SLATE, alignment=TA_CENTER))],
    ]
    t = Table(data, colWidths=[col_w], rowHeights=[10*mm, 7*mm, None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), RED),
        ("BACKGROUND", (0,1), (-1,-1), WHITE),
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("LINEBELOW", (0,0), (0,0), 2.5, RED_DARK),
        ("LEFTPADDING", (0,0), (-1,-1), 5),
        ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,0), 0),
        ("BOTTOMPADDING", (0,0), (-1,0), 0),
        ("TOPPADDING", (0,1), (-1,1), 6),
        ("BOTTOMPADDING", (0,1), (-1,1), 0),
        ("TOPPADDING", (0,2), (-1,2), 2),
        ("BOTTOMPADDING", (0,2), (-1,2), 8),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]))
    return t

def project_card(name, category, client, description, results, col_w):
    """A clean project card with proper internal spacing."""
    cat_p = Paragraph(category.upper(),
        ParagraphStyle("pc", fontName="Helvetica-Bold", fontSize=6.8,
                       textColor=RED_DARK, alignment=TA_LEFT, letterSpacing=1.5))
    title_p = Paragraph(name, ParagraphStyle("pt", fontName="Helvetica-Bold",
                        fontSize=11.5, textColor=INK, leading=13.5, alignment=TA_LEFT))
    client_p = Paragraph(f"<font color='#64748b'><b>CLIENT</b></font>  "
                         f"<font color='#334155'>{client}</font>",
                         ParagraphStyle("pcl", fontName="Helvetica", fontSize=8.2,
                                        leading=10.5, alignment=TA_LEFT))
    desc_p = Paragraph(description,
                       ParagraphStyle("pd", fontName="Helvetica", fontSize=8.2,
                                     leading=10.5, textColor=SLATE, alignment=TA_LEFT,
                                     spaceBefore=2, spaceAfter=2))
    res_p = Paragraph(f"<font color='#dc2626'><b>RESULTS</b></font>  "
                      f"<font color='#334155'>{results}</font>",
                      ParagraphStyle("pr", fontName="Helvetica", fontSize=8.2,
                                     leading=10.5, alignment=TA_LEFT))
    data = [[cat_p], [title_p], [client_p], [desc_p], [res_p]]
    t = Table(data, colWidths=[col_w], rowHeights=[5*mm, 7*mm, 5*mm, None, 6*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), WHITE),
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("LEFTPADDING", (0,0), (-1,-1), 7),
        ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,0), 5),
        ("BOTTOMPADDING", (0,0), (-1,0), 0),
        ("TOPPADDING", (0,1), (-1,1), 1),
        ("BOTTOMPADDING", (0,1), (-1,1), 1),
        ("TOPPADDING", (0,2), (-1,2), 0),
        ("BOTTOMPADDING", (0,2), (-1,2), 1),
        ("TOPPADDING", (0,3), (-1,3), 2),
        ("BOTTOMPADDING", (0,3), (-1,3), 2),
        ("TOPPADDING", (0,4), (-1,4), 3),
        ("BOTTOMPADDING", (0,4), (-1,4), 5),
        ("LINEABOVE", (0,0), (0,0), 3, RED),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]))
    return t

def step_card(num, title, body, col_w):
    """Numbered process step card."""
    data = [
        [Paragraph(f"<font color='white'><b>{num}</b></font>",
            ParagraphStyle("n", fontName="Helvetica-Bold", fontSize=20,
                           textColor=WHITE, alignment=TA_CENTER))],
        [Paragraph(f"<b>{title}</b>",
            ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=10,
                           textColor=INK, alignment=TA_LEFT))],
        [Paragraph(body, ParagraphStyle("b", fontName="Helvetica", fontSize=8.2,
                                      textColor=SLATE, alignment=TA_LEFT,
                                      leading=10.5))],
    ]
    t = Table(data, colWidths=[col_w], rowHeights=[10*mm, 6*mm, None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), RED),
        ("BACKGROUND", (0,1), (-1,-1), WHITE),
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING", (0,0), (-1,0), 0),
        ("BOTTOMPADDING", (0,0), (-1,0), 0),
        ("TOPPADDING", (0,1), (-1,1), 6),
        ("BOTTOMPADDING", (0,1), (-1,1), 0),
        ("TOPPADDING", (0,2), (-1,2), 2),
        ("BOTTOMPADDING", (0,2), (-1,2), 6),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]))
    return t

def contact_card():
    """A 2-row x 3-col contact card. Each col is 1/3 of USABLE_INNER."""
    col = USABLE_INNER / 3
    data = [
        [Paragraph("<b>PHONE</b>", ParagraphStyle("cl", fontName="Helvetica-Bold",
                fontSize=8.5, textColor=RED, alignment=TA_LEFT, letterSpacing=1.5)),
         Paragraph("<b>EMAIL</b>", ParagraphStyle("cl", fontName="Helvetica-Bold",
                fontSize=8.5, textColor=RED, alignment=TA_LEFT, letterSpacing=1.5)),
         Paragraph("<b>WEB</b>", ParagraphStyle("cl", fontName="Helvetica-Bold",
                fontSize=8.5, textColor=RED, alignment=TA_LEFT, letterSpacing=1.5))],
        [Paragraph("<b>+260 973 028 342</b>", ParagraphStyle("cv", fontName="Helvetica-Bold",
                fontSize=10.5, textColor=INK, alignment=TA_LEFT)),
         Paragraph("<b>seedwelinvestltd@gmail.com</b>", ParagraphStyle("cv", fontName="Helvetica-Bold",
                fontSize=10.5, textColor=INK, alignment=TA_LEFT)),
         Paragraph("<b>seedwelinvest.ltd</b>", ParagraphStyle("cv", fontName="Helvetica-Bold",
                fontSize=10.5, textColor=INK, alignment=TA_LEFT))],
        [Paragraph("Mon — Sun, all hours",
            ParagraphStyle("cs", fontName="Helvetica", fontSize=8.5, textColor=SLATE_LIGHT, alignment=TA_LEFT)),
         Paragraph("Fast reply within 1 business day",
            ParagraphStyle("cs", fontName="Helvetica", fontSize=8.5, textColor=SLATE_LIGHT, alignment=TA_LEFT)),
         Paragraph("Live portfolio + admin workspace",
            ParagraphStyle("cs", fontName="Helvetica", fontSize=8.5, textColor=SLATE_LIGHT, alignment=TA_LEFT))],
        [Paragraph("<b>LOCATIONS</b>", ParagraphStyle("cl", fontName="Helvetica-Bold",
                fontSize=8.5, textColor=RED, alignment=TA_LEFT, letterSpacing=1.5)),
         Paragraph("<b>WHATSAPP</b>", ParagraphStyle("cl", fontName="Helvetica-Bold",
                fontSize=8.5, textColor=RED, alignment=TA_LEFT, letterSpacing=1.5)),
         Paragraph("<b>HOURS</b>", ParagraphStyle("cl", fontName="Helvetica-Bold",
                fontSize=8.5, textColor=RED, alignment=TA_LEFT, letterSpacing=1.5))],
        [Paragraph("Kabwe · Chama · Global Remote",
            ParagraphStyle("cs", fontName="Helvetica", fontSize=8.8, textColor=INK, alignment=TA_LEFT)),
         Paragraph("wa.me/260973028342",
            ParagraphStyle("cs", fontName="Helvetica-Bold", fontSize=8.8, textColor=INK, alignment=TA_LEFT)),
         Paragraph("24/7 support available",
            ParagraphStyle("cs", fontName="Helvetica", fontSize=8.8, textColor=INK, alignment=TA_LEFT))],
    ]
    t = Table(data, colWidths=[col, col, col],
              rowHeights=[5*mm, 7*mm, 5*mm, 5*mm, 7*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), BG_SOFT),
        ("BOX", (0,0), (-1,-1), 0.5, BORDER),
        ("LINEBELOW", (0,2), (-1,2), 0.5, BORDER),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 7),
        ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ]))
    return t

# ─────────────────────  STORY  ─────────────────────
story = []

# 3-column gap layout: USABLE_INNER, gap=4mm -> col_w = (USABLE_INNER - 8mm) / 3
COL3 = (USABLE_INNER - 8*mm) / 3
COL2 = (USABLE_INNER - 4*mm) / 2
COL4 = (USABLE_INNER - 12*mm) / 4

# ─── COVER ───
story.append(Spacer(1, 1))
story.append(NextPageTemplate("body"))
story.append(PageBreak())

# ─── LETTER + ABOUT (page 2) ───
story += section_header("From Zacheus Simbaya", "Founder & Lead Digital Strategist")
story.append(Paragraph(
    "Thank you for taking the time to review this portfolio. "
    "I started Seedwel Investment LTD with a simple idea: businesses in Zambia and across "
    "the world deserve agency-quality digital work without the agency price tag. "
    "Six years later, that idea has grown into 150+ delivered projects, a 98.9% client "
    "satisfaction rate, and a 24/7 team that treats every project like our own.",
    BODY))
story.append(Paragraph(
    "Inside, you will find a clear summary of what we do, the search and digital "
    "services we provide, the results we have shipped, and a few featured projects. "
    "If something here is useful for your business, I would love to hear from you — "
    "the fastest way is WhatsApp or a call to the number on the back cover.",
    BODY))
story.append(Spacer(1, 4))
story.append(Paragraph("— Zacheus Simbaya", ParagraphStyle("sig",
    fontName="Helvetica-Oblique", fontSize=11, textColor=RED, alignment=TA_LEFT)))
story.append(Spacer(1, 10))

story += section_header("About Seedwel Investment LTD", "Who We Are")
story.append(Paragraph(
    "Seedwel Investment LTD is a premium digital agency dedicated to building "
    "experiences that drive growth. We serve clients across Zambia and globally, "
    "bringing modern digital solutions to businesses of all sizes — from solo "
    "founders to established companies.", BODY))
story.append(Paragraph(
    "Whether you need a stunning website, professional graphic design, "
    "compliance support with PACRA and ZRA, or ongoing virtual assistance, "
    "we handle it all with precision, care and a clear process.", BODY))
story.append(Spacer(1, 6))
story.append(stat_block())
story.append(Spacer(1, 10))

# Mission / Vision / Promise (3 cards)
mv_data = [[
    value_card("01", "Our Mission",
        "To empower businesses with world-class digital solutions that drive real growth and transformation.",
        COL3),
    value_card("02", "Our Vision",
        "To become Africa's most trusted digital agency, known for quality, innovation and client success.",
        COL3),
    value_card("03", "Our Promise",
        "We treat every project as our own. Quality delivery, on time, every time — that is our commitment.",
        COL3)
]]
t = Table(mv_data, colWidths=[COL3, COL3, COL3])
t.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 0),
    ("RIGHTPADDING", (0,0), (-1,-1), 4),
]))
story.append(t)
story.append(PageBreak())

# ─── WHY US (page 3) ───
story += section_header("Why Choose Seedwel", "The Seedwel Difference")
why_items = [
    ("01", "150+ Projects", "Proven track record with businesses across Zambia and beyond."),
    ("02", "98.9% Satisfaction", "Our clients love working with us — and it shows in the results."),
    ("03", "24/7 Available", "Round-the-clock support because your business never sleeps."),
    ("04", "Global Reach", "Based in Zambia, serving clients worldwide with personalised care."),
    ("05", "Trusted & Reliable", "Registered and compliant — PACRA, ZRA, Workers' Compensation."),
    ("06", "Fast Turnaround", "We respect your time. Quick delivery without compromising quality."),
]
# 2 rows × 3 cols
why_data = []
for i in range(0, 6, 3):
    row = [value_card(why_items[i][0], why_items[i][1], why_items[i][2], COL3),
           value_card(why_items[i+1][0], why_items[i+1][1], why_items[i+1][2], COL3),
           value_card(why_items[i+2][0], why_items[i+2][1], why_items[i+2][2], COL3)]
    why_data.append(row)
t = Table(why_data, colWidths=[COL3, COL3, COL3])
t.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 0),
    ("RIGHTPADDING", (0,0), (-1,-1), 4),
    ("TOPPADDING", (0,0), (-1,-1), 0),
    ("BOTTOMPADDING", (0,0), (-1,-1), 8),
]))
story.append(t)
story.append(Spacer(1, 14))

# Special offer
offer_data = [[
    Paragraph("<font color='white' size='12'><b>SPECIAL OFFER</b></font>",
              ParagraphStyle("o", fontName="Helvetica-Bold", fontSize=12,
                             textColor=WHITE, alignment=TA_LEFT)),
    Paragraph("<font color='white' size='9.5'>For every web development project we bundle in "
              "<b>FREE Website Hosting</b> and a <b>1 Year Free Domain</b> — get your business "
              "online with zero hosting cost for the first year.</font>",
              ParagraphStyle("o", fontName="Helvetica", fontSize=9.5,
                             textColor=WHITE, alignment=TA_LEFT)),
]]
t = Table(offer_data, colWidths=[38*mm, USABLE_INNER - 38*mm], rowHeights=[18*mm])
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), RED),
    ("LEFTPADDING", (0,0), (-1,-1), 12),
    ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("LINEBEFORE", (0,0), (0,0), 4, RED_DARK),
    ("LINEAFTER", (0,0), (0,0), 4, RED_DARK),
]))
story.append(t)
story.append(Spacer(1, 14))

# Testimonial-style quote block
quote_data = [[
    Paragraph("<font color='#dc2626' size='18'><b>&ldquo;</b></font>",
              ParagraphStyle("q", fontName="Helvetica-Bold", fontSize=22, textColor=RED, alignment=TA_CENTER)),
    Paragraph(
        "<i>“We treat every project as our own. Quality delivery, on time, every time — "
        "that is the Seedwel promise to every client, on every engagement, in every timezone.”</i>",
        ParagraphStyle("qb", fontName="Helvetica-Oblique", fontSize=10.5,
                       textColor=SLATE, leading=15, alignment=TA_LEFT)),
]]
t = Table(quote_data, colWidths=[10*mm, USABLE_INNER - 10*mm], rowHeights=[24*mm])
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), RED_SOFT),
    ("BOX", (0,0), (-1,-1), 0, WHITE),
    ("LINEBEFORE", (0,0), (0,0), 4, RED),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
    ("RIGHTPADDING", (0,0), (-1,-1), 10),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
]))
story.append(t)
story.append(PageBreak())

# ─── SERVICES (page 4) ───
story += section_header("Search & Digital Services", "What We Do")
story.append(Paragraph(
    "Twelve focused service lines, one accountable team. Every service is delivered "
    "by people who know the work, supported by a process you can actually follow.",
    BODY))
story.append(Spacer(1, 6))

services = [
    ("Business Registration",
     "Complete registration services — PACRA, ZRA, Workers' Compensation, NAPSA and EIZ.",
     ["PACRA", "ZRA TPIN", "Workers Comp", "NAPSA", "EIZ"]),
    ("Graphic Design",
     "Logos, flyers, social media graphics, packaging and full brand systems.",
     ["Logos", "Flyers", "Branding", "Social", "Packaging"]),
    ("Web Development",
     "Custom websites and e-commerce — FREE hosting + 1 year free domain included.",
     ["Sites", "E-Commerce", "Landing", "WordPress", "React"]),
    ("Mobile App Development",
     "Native and cross-platform iOS / Android apps for business, schools, bookings.",
     ["iOS", "Android", "Schools", "Business", "Booking"]),
    ("Virtual Assistant",
     "24/7 admin and customer support that saves you time and money.",
     ["Support", "Admin", "Email", "CRM", "24/7"]),
    ("Digital Marketing",
     "SEO, Google Ads, social media and email — data-driven growth strategies.",
     ["SEO", "Google Ads", "Social", "Email", "Analytics"]),
    ("Typing & Transcription",
     "Audio transcription, document typing, data entry and PDF conversion.",
     ["Audio", "Typing", "Data Entry", "PDF", "Copywriting"]),
    ("Online Tutoring",
     "Mathematics, programming and more — personalised online learning.",
     ["Math", "Programming", "Exams", "Homework", "Zoom/Skype"]),
    ("Video Editing",
     "YouTube editing, promo videos, motion graphics and animation.",
     ["YouTube", "Promo", "Motion", "Animation", "VO"]),
    ("Shopify & E-Commerce",
     "Shopify store setup, themes, product upload, payments and SEO.",
     ["Setup", "Themes", "Products", "Payments", "SEO"]),
    ("IT Consulting",
     "Cloud, cybersecurity, automation and database management.",
     ["Cloud", "Security", "Automation", "Databases", "Support"]),
    ("Voice Over & Recording",
     "Commercials, explainers, audiobooks, IVR and podcast production.",
     ["Commercial", "Explainer", "Audiobook", "IVR", "Podcasts"]),
]

# 4 rows × 3 cols
rows = []
for i in range(0, len(services), 3):
    group = services[i:i+3]
    while len(group) < 3:
        group.append((" ", " ", []))
    rows.append([service_card(group[0][0], group[0][1], group[0][2], COL3),
                 service_card(group[1][0], group[1][1], group[1][2], COL3),
                 service_card(group[2][0], group[2][1], group[2][2], COL3)])

t = Table(rows, colWidths=[COL3, COL3, COL3])
t.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 0),
    ("RIGHTPADDING", (0,0), (-1,-1), 4),
    ("TOPPADDING", (0,0), (-1,-1), 0),
    ("BOTTOMPADDING", (0,0), (-1,-1), 8),
]))
story.append(t)
story.append(PageBreak())

# ─── PROJECTS (page 5) ───
story += section_header("Featured Projects", "Portfolio Highlights")
story.append(Paragraph(
    "A snapshot of recent work delivered for clients across Zambia and globally. "
    "Each entry pairs the project with a clear result so you can see what was actually "
    "shipped, not just what was promised.", BODY))
story.append(Spacer(1, 6))

projects = [
    ("App Development & Publishing", "Mobile app", "Business technology",
     "Modern application development and Google Play publishing support for a growing business.",
     "App dev · Play Store · Ongoing support"),
    ("E-Commerce Platform", "E-commerce", "Retail",
     "A full-featured online store with payment integration, product management and reliable hosting.",
     "Online sales · Payments · Product mgmt"),
    ("Portfolio Website", "Website", "Creative professional",
     "A visual portfolio that puts a professional photographer's work front and centre on every device.",
     "Responsive · Optimised visuals · Fast"),
    ("Business Landing Page", "Website", "Service business",
     "A conversion-focused landing page that creates clear next steps and captures qualified leads.",
     "Lead gen · Mobile ready · Clear CTAs"),
    ("School Management System", "Website", "Education",
     "A school management platform for student records, fee tracking and a parent portal.",
     "Student records · Fees · Parent portal"),
    ("Brand Identity Package", "Branding", "Growing business",
     "A cohesive identity package with a distinctive logo, collateral and practical brand guidance.",
     "Logo system · Cards · Brand guidelines"),
    ("Company Registration (PACRA)", "Business registration", "Zambian business",
     "End-to-end PACRA company registration support to establish a business efficiently and compliantly.",
     "PACRA support · Clear process · Compliance"),
    ("ZRA VAT, TPIN & TOT", "Business registration", "Zambian business",
     "Practical assistance with TPIN, VAT and TOT registration so a business meets key tax requirements.",
     "TPIN · VAT · TOT registration"),
    ("Workers' Compensation", "Business registration", "Employer",
     "Registration support for statutory employee protection and Workers' Compensation compliance.",
     "Statutory · Employer guidance · Compliance"),
]

# 2-column rows
rows = []
for i in range(0, len(projects), 2):
    left = project_card(*projects[i], col_w=COL2)
    right = project_card(*projects[i+1], col_w=COL2) if i+1 < len(projects) else Spacer(COL2, 1)
    rows.append([left, right])
t = Table(rows, colWidths=[COL2, COL2])
t.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 0),
    ("RIGHTPADDING", (0,0), (-1,-1), 4),
    ("TOPPADDING", (0,0), (-1,-1), 0),
    ("BOTTOMPADDING", (0,0), (-1,-1), 8),
]))
story.append(t)
story.append(PageBreak())

# ─── HOW WE WORK + CONTACT (page 6) ───
story += section_header("How We Work", "Our Process")
story.append(Paragraph(
    "A simple, transparent process you can actually follow — from the first idea to the live handover.",
    BODY))
story.append(Spacer(1, 6))

steps = [
    ("01", "DISCOVER",
     "We start with a quick call or WhatsApp chat to understand your business, your goals, and the problem you want to solve."),
    ("02", "PLAN",
     "We turn the goal into a focused plan with deliverables, a timeline and a clear price. No surprises, no hidden costs."),
    ("03", "BUILD",
     "Our team executes the work — design, code, content, registration, whatever the project needs — with updates along the way."),
    ("04", "LAUNCH",
     "We hand over a finished, tested, share-ready result and stay available for ongoing support and improvements."),
]
# 1 row × 4 cols
grid = Table(
    [[step_card(steps[0][0], steps[0][1], steps[0][2], COL4),
      step_card(steps[1][0], steps[1][1], steps[1][2], COL4),
      step_card(steps[2][0], steps[2][1], steps[2][2], COL4),
      step_card(steps[3][0], steps[3][1], steps[3][2], COL4)]],
    colWidths=[COL4, COL4, COL4, COL4])
grid.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 0),
    ("RIGHTPADDING", (0,0), (-1,-1), 4),
]))
story.append(grid)
story.append(Spacer(1, 14))

# Insight cards
story += section_header("More Than a Service Provider", "Built For Clearer Growth")
insight_data = [[
    value_card("A", "Clear Direction",
        "We turn business goals into a focused plan, practical deliverables and a digital experience your customers can use with confidence.",
        COL3),
    value_card("B", "Media Ready to Grow",
        "Our portfolio workflow targets 1 TB media capacity with protected uploads and a transparent usage view for the administrator.",
        COL3),
    value_card("C", "Portfolio-Ready",
        "Published work can be shared by link, WhatsApp or email — present the latest projects to clients and partners without delay.",
        COL3),
]]
t = Table(insight_data, colWidths=[COL3, COL3, COL3])
t.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LEFTPADDING", (0,0), (-1,-1), 0),
    ("RIGHTPADDING", (0,0), (-1,-1), 4),
]))
story.append(t)
story.append(Spacer(1, 14))

# CONTACT
story += section_header("Let's Work Together", "Get In Touch")
story.append(Paragraph(
    "If you would like to start a project, ask a question, or share this portfolio with "
    "someone who needs it — the fastest path is WhatsApp or a call. Every message is read "
    "by a person, and we aim to reply within one business day.", BODY))
story.append(Spacer(1, 6))
story.append(contact_card())
story.append(Spacer(1, 14))

# Closing CTA
cta_data = [[
    Paragraph("<font color='white' size='13'><b>Ready to start your project?</b></font>",
        ParagraphStyle("cta", fontName="Helvetica-Bold", fontSize=13, textColor=WHITE, alignment=TA_LEFT)),
    Paragraph("<font color='white' size='9.5'>Get FREE hosting + 1 year domain with every website.</font>",
        ParagraphStyle("cta2", fontName="Helvetica", fontSize=9.5, textColor=WHITE, alignment=TA_LEFT)),
    Paragraph("<font color='white' size='10'><b>WhatsApp Us  →</b></font>",
        ParagraphStyle("cta3", fontName="Helvetica-Bold", fontSize=10, textColor=WHITE, alignment=TA_RIGHT)),
]]
t = Table(cta_data, colWidths=[55*mm, USABLE_INNER - 90*mm, 35*mm], rowHeights=[14*mm])
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), INK),
    ("LEFTPADDING", (0,0), (-1,-1), 12),
    ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("LINEBEFORE", (0,0), (0,0), 4, RED),
]))
story.append(t)

story.append(Spacer(1, 10))
story.append(HRule(USABLE_INNER, 0.5, BORDER))
story.append(Spacer(1, 3))
story.append(Paragraph(
    f"© 2026 Seedwel Investment LTD  ·  Zacheus Simbaya  ·  Generated {date.today().strftime('%B %Y')}  ·  "
    "All projects and case studies shown are real, anonymised where required.",
    ParagraphStyle("end", fontName="Helvetica", fontSize=7.5, textColor=SLATE_LIGHT, alignment=TA_CENTER)))

# ─────────────────────  BUILD  ─────────────────────
def build():
    out = "Zacheus_Simbaya_Portfolio.pdf"
    doc = PortfolioDoc(out)
    doc.build(story)
    print(f"Wrote: {out}")
    return out

if __name__ == "__main__":
    build()
