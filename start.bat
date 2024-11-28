@echo off
:: Navigate to the bot directory
cd /d "C:\Discord\T&L HOLYLANDS BOT"

:loop
:: Start the bot using npm and log errors
echo Starting Discord bot...
node bot.js

:: Always restart regardless of exit code
echo Restarting bot in 5 seconds...
timeout /t 5
goto :loop
