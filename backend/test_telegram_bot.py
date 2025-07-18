import pytest
from unittest.mock import AsyncMock, MagicMock
from telegram_bot import TelegramBot
from telegram import Update, Message, User, Chat

@pytest.fixture
def bot():
    return TelegramBot()

@pytest.fixture
def mock_update():
    update = MagicMock(spec=Update)
    update.effective_user = MagicMock(spec=User)
    update.effective_user.id = 123456789
    update.effective_user.username = "testuser"
    update.message = MagicMock(spec=Message)
    update.message.reply_text = AsyncMock()
    return update

@pytest.mark.asyncio
async def test_start_command(bot, mock_update):
    context = MagicMock()
    await bot.start_command(mock_update, context)
    mock_update.message.reply_text.assert_called_once()
    call_args = mock_update.message.reply_text.call_args[0][0]
    assert "Hola! Soy el bot de cotizaciones de Agromaq" in call_args

@pytest.mark.asyncio
async def test_help_command(bot, mock_update):
    context = MagicMock()
    await bot.help_command(mock_update, context)
    mock_update.message.reply_text.assert_called_once()
    call_args = mock_update.message.reply_text.call_args[0][0]
    assert "Bot de Cotizaciones Agromaq" in call_args

@pytest.mark.asyncio
async def test_list_machines_command(bot, mock_update):
    context = MagicMock()
    
    # Mock database session
    bot.SessionLocal = MagicMock()
    mock_db = MagicMock()
    bot.SessionLocal.return_value.__enter__.return_value = mock_db
    bot.SessionLocal.return_value.__exit__.return_value = None
    
    # Mock machine data
    mock_machine = MagicMock()
    mock_machine.code = "TEST001"
    mock_machine.name = "Test Machine"
    mock_machine.price = 10000.0
    mock_machine.description = "Test description"
    mock_db.query.return_value.all.return_value = [mock_machine]
    
    await bot.list_machines(mock_update, context)
    mock_update.message.reply_text.assert_called_once()
