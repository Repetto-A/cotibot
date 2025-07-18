from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import Color
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime, timedelta
import tempfile
import os

class PDFGenerator:
    def __init__(self):
        self.agromaq_green = Color(0.176, 0.314, 0.086)  # #2D5016
        self.agromaq_yellow = Color(0.957, 0.816, 0.247)  # #F4D03F

    async def generate_quotation_pdf(self, machine, quotation_data, final_price):
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            pdf_path = tmp_file.name

        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=A4,
            rightMargin=10*mm,
            leftMargin=10*mm,
            topMargin=8*mm,
            bottomMargin=20*mm
        )
        story = []
        styles = getSampleStyleSheet()

        # Estilos personalizados
        title_style = ParagraphStyle(
            'Title', parent=styles['Heading1'], fontSize=22, alignment=TA_CENTER, textColor=self.agromaq_green, spaceAfter=10, fontName='Helvetica-Bold')
        subtitle_style = ParagraphStyle(
            'Subtitle', parent=styles['Heading2'], fontSize=15, alignment=TA_CENTER, textColor=self.agromaq_green, spaceAfter=8, fontName='Helvetica-Bold')
        normal_style = ParagraphStyle(
            'Normal', parent=styles['Normal'], fontSize=11, alignment=TA_LEFT, fontName='Helvetica', spaceAfter=4)
        bullet_style = ParagraphStyle(
            'Bullet', parent=styles['Normal'], fontSize=11, leftIndent=15, bulletIndent=5, fontName='Helvetica', spaceAfter=2)
        price_style = ParagraphStyle(
            'Price', parent=styles['Heading2'], fontSize=16, alignment=TA_RIGHT, textColor=self.agromaq_green, fontName='Helvetica-Bold')
        footer_style = ParagraphStyle(
            'Footer', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=self.agromaq_green)

        # 1. Encabezado solo con logo centrado
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        logo_path = os.path.join(BASE_DIR, './assets/pdflogo.png')
        if os.path.exists(logo_path):
            logo_img = Image(logo_path, width=300, height=None)  # Solo ancho, alto proporcional
            logo_img.hAlign = 'CENTER'
            story.append(logo_img)
        else:
            story.append(Spacer(1, 80))
        story.append(Spacer(1, 20))  # Más espacio debajo del logo

        # Fecha arriba a la derecha
        meses = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ]
        hoy = datetime.now()
        fecha_str = f"Las Parejas; {hoy.day} de {meses[hoy.month-1]} del {hoy.year}"
        fecha_paragraph = Paragraph(fecha_str, ParagraphStyle(
            'Fecha', parent=normal_style, alignment=TA_RIGHT, fontSize=11, spaceAfter=6))
        story.append(fecha_paragraph)

        # 2. Datos del destinatario alineados a la izquierda
        client_name = getattr(quotation_data, 'clientName', '') or ''
        client_cuit = getattr(quotation_data, 'clientCuit', '') or ''
        client_address = getattr(quotation_data, 'clientAddress', '') or ''
        client_phone = getattr(quotation_data, 'clientPhone', '') or ''
        destinatario = [Paragraph('Sr.:', normal_style)]
        if client_name:
            destinatario.append(Paragraph(f'<b>{client_name}</b>', normal_style))
        if client_cuit:
            destinatario.append(Paragraph(f'<b>{client_cuit}</b>', normal_style))
        if client_address:
            destinatario.append(Paragraph(f'<b>{client_address}</b>', normal_style))
        if client_phone:
            destinatario.append(Paragraph(f'<b>{client_phone}</b>', normal_style))
        for p in destinatario:
            story.append(p)
        story.append(Spacer(1, 10))

        # 3. Título central más pequeño
        cotizacion_style = ParagraphStyle(
            'Cotizacion', parent=styles['Heading2'], fontSize=13, alignment=TA_CENTER, textColor=Color(0,0,0), fontName='Helvetica', spaceAfter=4)
        story.append(Paragraph('<u>COTIZACION</u>', cotizacion_style))
        story.append(Spacer(1, 1))

        # 4. Título de producto y modelo
        producto_style = ParagraphStyle(
            'Producto', parent=styles['Heading2'], fontSize=15, alignment=TA_CENTER, textColor=Color(0,0,0), fontName='Helvetica-Bold', spaceAfter=8)
        story.append(Paragraph('<u>ACOPLADO VOLCADOR TRIVUELCO DE USO RURAL</u>', producto_style))
        story.append(Spacer(1, 5))
        story.append(Paragraph('<b>MODELO A. V. A. 4000:</b>', normal_style))
        story.append(Spacer(1, 8))

        # 5. Especificaciones técnicas (viñetas y negritas)
        specs = [
            '<b>TRIVUELCO:</b> cambiando 1 perno de lugar elige si quiere descargar hacia la derecha, izquierda o atrás.',
            '<b>Capacidad de carga 8000 Kg.</b>',
            'Chasis construido con chapa plegada y estampada',
            'Dirección de giro con avantrén a bolillas',
            'Largo útil 4 Mts. - Ancho útil 2,10 Mts.',
            'Barandas cerradas de 70 Cts., de alto - Puertas desacoplables en su parte superior o inferior, esto permite poder volcar, sacar o descargar desde abajo.',
            '<b>Cilindro hidráulico, telescópico y oscilante de 3 tramos.</b>',
            '<b>2 Ejes macizos de 3"</b>',
            '<b>4 Elásticos reforzados 63 x 10 x 12 hojas</b>',
            'Piso de chapa',
            '<b>8 Llantas duales p/calzar neumáticos 750 x 16.</b> (no incluye neumáticos).',
        ]
        for spec in specs:
            story.append(Paragraph(f'• {spec}', bullet_style))
            story.append(Spacer(1, 7))  # Más espacio entre ítems
        story.append(Spacer(1, 10))

        # 6. Precio con línea de puntos y formato original adaptativo
        if final_price:
            price_str = f"${int(final_price):,}".replace(",", ".")
        else:
            price_str = "$-"
        total_length = 134  # longitud total deseada de la línea
        puntos = "." * max(1, total_length - len(price_str) - 2)  # -2 por '.='
        price_line = f"{puntos}{price_str}.="
        price_style = ParagraphStyle('Precio', parent=styles['Normal'], alignment=TA_RIGHT, fontSize=13, fontName='Helvetica')
        story.append(Paragraph(price_line, price_style))
        story.append(Spacer(1, 10))

        # 7. Notas y condiciones centradas
        condiciones_style = ParagraphStyle('Condiciones', parent=styles['Normal'], alignment=TA_CENTER, fontSize=11)
        story.append(Paragraph('<b>LOS PRECIOS COTIZADOS SON NETOS A CONCESIONARIOS</b>', condiciones_style))
        story.append(Paragraph('NO INCLUYEN EL 10,5% DE I.V.A.', condiciones_style))
        story.append(Paragraph('Los precios cotizados son puestos en fábrica sobre camión.', condiciones_style))
        story.append(Paragraph('Esta cotización se mantendrá por 1 día; luego caducará sin previo aviso.', condiciones_style))
        story.append(Spacer(1, 15))

        # 8. Pie de página
        story.append(Spacer(1, 30))
        story.append(Paragraph('Ruta Nacional 178 N° 545 – CP (2505) – La Parejas, Santa Fe, Argentina', footer_style))
        story.append(Paragraph('Tel/Fax: 03471 – 471388', footer_style))
        story.append(Paragraph('E-mail: ventas@agromaqslaparejas.com.ar – Web: www.agromaqargentina.com.ar', footer_style))

        doc.build(story)
        return pdf_path
