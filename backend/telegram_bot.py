import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from sqlalchemy.orm import sessionmaker
from db import engine, Machine, Quotation, MACHINERY_CATALOG
from pdf_generator import PDFGenerator
import json

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

class TelegramBot:
    def __init__(self):
        self.token = os.getenv("BOT_TOKEN")
        self.admin_ids = [int(id.strip()) for id in os.getenv("TELEGRAM_ADMIN_IDS", "").split(",") if id.strip()]
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        self.pdf_generator = PDFGenerator()
        
    def is_admin(self, user_id: int) -> bool:
        return user_id in self.admin_ids
    
    async def start(self):
        if not self.token:
            logging.warning("BOT_TOKEN not set, skipping bot initialization")
            return
            
        application = Application.builder().token(self.token).build()
        
        # Add handlers
        application.add_handler(CommandHandler("start", self.start_command))
        application.add_handler(CommandHandler("ayuda", self.help_command))
        application.add_handler(CommandHandler("listar_maquinas", self.list_machines))
        application.add_handler(CommandHandler("cotizar", self.generate_quote))
        application.add_handler(CommandHandler("set_price", self.set_price))
        
        # Start the bot
        await application.initialize()
        await application.start()
        await application.updater.start_polling()
        
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        welcome_message = (
            "🚜 *¡Bienvenido al Bot de Cotizaciones Agromaq!*\n\n"
            "Comandos disponibles:\n"
            "📋 `/listar_maquinas` - Ver catálogo completo de máquinas\n"
            "💰 `/cotizar <código> <cuit> <nombre> <teléfono> [--descuento]` - Generar cotización\n"
            "ℹ️ `/ayuda` - Ayuda detallada\n"
        )
        
        if self.is_admin(update.effective_user.id):
            welcome_message += "\n*Comandos de administrador:*\n💲 `/set_price <código> <precio>` - Actualizar precio"
            
        await update.message.reply_text(welcome_message, parse_mode='Markdown')
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        help_text = """
🚜 *Bot de Cotizaciones Agromaq - Ayuda Detallada*

*Comandos principales:*

📋 `/listar_maquinas` 
Ver todas las categorías y productos disponibles con códigos y precios actuales.

💰 `/cotizar <código> <cuit> <nombre> <teléfono> [--descuento]`
Generar cotización en PDF. Parámetros:
• `código`: Código del producto (ej: ACO001)
• `cuit`: CUIT del cliente (ej: 20-12345678-9)
• `nombre`: Nombre completo del cliente
• `teléfono`: Número de contacto
• `--descuento`: (opcional) Aplicar descuento del 10%

*Ejemplo:*
`/cotizar ACO001 20-12345678-9 "Juan Pérez" +541112345678 --descuento`

ℹ️ `/ayuda` - Mostrar esta ayuda
        """
        
        if self.is_admin(update.effective_user.id):
            help_text += """
*Comandos de administrador:*

💲 `/set_price <código> <nuevo_precio>`
Actualizar el precio de una máquina.
*Ejemplo:* `/set_price ACO001 25000`
            """
        
        await update.message.reply_text(help_text, parse_mode='Markdown')
    
    async def list_machines(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        db = self.SessionLocal()
        try:
            # Group machines by category
            machines = db.query(Machine).filter(Machine.active == True).all()
            if not machines:
                await update.message.reply_text("No hay máquinas disponibles.")
                return
            
            # Group by category
            categories = {}
            for machine in machines:
                if machine.category not in categories:
                    categories[machine.category] = []
                categories[machine.category].append(machine)
            
            message = "🚜 *Catálogo de Máquinas Agromaq*\n\n"
            
            for category, category_machines in categories.items():
                message += f"*📂 {category}*\n"
                for machine in category_machines[:5]:  # Limit to avoid message length issues
                    message += f"• `{machine.code}` - {machine.name}\n"
                    message += f"  💰 ${machine.price:,.2f}\n"
                
                if len(category_machines) > 5:
                    message += f"  ... y {len(category_machines) - 5} productos más\n"
                message += "\n"
            
            message += "💡 *Tip:* Usa `/cotizar <código> <cuit> <nombre> <teléfono>` para generar una cotización"
            
            # Split message if too long
            if len(message) > 4000:
                messages = [message[i:i+4000] for i in range(0, len(message), 4000)]
                for msg in messages:
                    await update.message.reply_text(msg, parse_mode='Markdown')
            else:
                await update.message.reply_text(message, parse_mode='Markdown')
                
        finally:
            db.close()
    
    async def generate_quote(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if len(context.args) < 4:
            await update.message.reply_text(
                "❌ *Uso incorrecto*\n\n"
                "*Formato:*\n"
                "`/cotizar <código> <cuit> <nombre> <teléfono> [--descuento]`\n\n"
                "*Ejemplo:*\n"
                "`/cotizar ACO001 20-12345678-9 \"Juan Pérez\" +541112345678`\n\n"
                "💡 Agrega `--descuento` al final para aplicar descuento del 10%",
                parse_mode='Markdown'
            )
            return
        
        machine_code = context.args[0]
        client_cuit = context.args[1]
        
        # Handle quoted names
        if context.args[2].startswith('"'):
            # Find the end quote
            name_parts = []
            phone_index = 2
            for i, arg in enumerate(context.args[2:], 2):
                name_parts.append(arg.strip('"'))
                if arg.endswith('"'):
                    phone_index = i + 1
                    break
            client_name = " ".join(name_parts).strip('"')
        else:
            client_name = context.args[2]
            phone_index = 3
            
        if phone_index >= len(context.args):
            await update.message.reply_text("❌ Falta el número de teléfono")
            return
            
        client_phone = context.args[phone_index]
        apply_discount = "--descuento" in context.args
        
        db = self.SessionLocal()
        try:
            machine = db.query(Machine).filter(Machine.code == machine_code, Machine.active == True).first()
            if not machine:
                await update.message.reply_text(f"❌ Máquina con código '{machine_code}' no encontrada.")
                return
            
            # Calculate final price
            final_price = machine.price
            if apply_discount:
                final_price = machine.price * 0.9
            
            # Create quotation object
            class QuotationData:
                def __init__(self):
                    self.machineCode = machine_code
                    self.clientCuit = client_cuit
                    self.clientName = client_name
                    self.clientPhone = client_phone
                    self.clientEmail = None
                    self.clientCompany = None
                    self.notes = f"Cotización generada via Telegram por @{update.effective_user.username or 'usuario'}"
                    self.applyDiscount = apply_discount
            
            quotation_data = QuotationData()
            
            # Save to database
            db_quotation = Quotation(
                machine_code=machine_code,
                client_cuit=client_cuit,
                client_name=client_name,
                client_phone=client_phone,
                notes=quotation_data.notes,
                discount_applied=apply_discount,
                final_price=final_price
            )
            db.add(db_quotation)
            db.commit()
            
            # Generate PDF
            pdf_path = await self.pdf_generator.generate_quotation_pdf(machine, quotation_data, final_price)
            
            # Send PDF
            with open(pdf_path, 'rb') as pdf_file:
                caption = (
                    f"✅ *Cotización generada*\n\n"
                    f"👤 Cliente: {client_name}\n"
                    f"🆔 CUIT: {client_cuit}\n"
                    f"🚜 Producto: {machine.name}\n"
                    f"🏷️ Código: {machine_code}\n"
                    f"💰 Precio: ${final_price:,.2f}"
                )
                
                if apply_discount:
                    caption += f"\n🎯 Descuento aplicado: 10%"
                
                await update.message.reply_document(
                    document=pdf_file,
                    filename=f"cotizacion-{client_name.replace(' ', '-')}-{machine_code}.pdf",
                    caption=caption,
                    parse_mode='Markdown'
                )
            
            # Clean up temporary file
            os.unlink(pdf_path)
            
        except Exception as e:
            logging.error(f"Error generating quote: {e}")
            await update.message.reply_text("❌ Error al generar la cotización. Intenta nuevamente.")
        finally:
            db.close()
    
    async def set_price(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not self.is_admin(update.effective_user.id):
            await update.message.reply_text("❌ No tienes permisos para ejecutar este comando.")
            return
        
        if len(context.args) != 2:
            await update.message.reply_text(
                "❌ *Uso incorrecto*\n\n"
                "*Formato:*\n"
                "`/set_price <código> <nuevo_precio>`\n\n"
                "*Ejemplo:*\n"
                "`/set_price ACO001 26000`",
                parse_mode='Markdown'
            )
            return
        
        machine_code = context.args[0]
        try:
            new_price = float(context.args[1])
        except ValueError:
            await update.message.reply_text("❌ El precio debe ser un número válido.")
            return
        
        db = self.SessionLocal()
        try:
            machine = db.query(Machine).filter(Machine.code == machine_code).first()
            if not machine:
                await update.message.reply_text(f"❌ Máquina con código '{machine_code}' no encontrada.")
                return
            
            old_price = machine.price
            machine.price = new_price
            db.commit()
            
            await update.message.reply_text(
                f"✅ *Precio actualizado*\n\n"
                f"🚜 Producto: {machine.name}\n"
                f"🏷️ Código: {machine_code}\n"
                f"📊 Precio anterior: ${old_price:,.2f}\n"
                f"💰 Precio nuevo: ${new_price:,.2f}",
                parse_mode='Markdown'
            )
            
        except Exception as e:
            logging.error(f"Error updating price: {e}")
            await update.message.reply_text("❌ Error al actualizar el precio.")
        finally:
            db.close()
