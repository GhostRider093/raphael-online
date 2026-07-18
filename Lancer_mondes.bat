@echo off
REM ============================================================
REM   Lancer l'explorateur des 21 mondes Raphael
REM   Double-clique sur ce fichier pour jouer.
REM ============================================================

cd /d "%~dp0"

set PORT=8000
set START_PAGE=mondes.html
set URL=http://127.0.0.1:%PORT%/%START_PAGE%

where py >nul 2>nul
if %ERRORLEVEL%==0 (
    set PYCMD=py
) else (
    where python >nul 2>nul
    if %ERRORLEVEL%==0 (
        set PYCMD=python
    ) else (
        echo [ERREUR] Python n'est pas installe ou pas dans le PATH.
        echo Installe Python depuis https://www.python.org puis relance ce fichier.
        pause
        exit /b 1
    )
)

echo Fermeture des anciens serveurs sur le port %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>nul

%PYCMD% -c "import aiohttp" >nul 2>nul
if not %ERRORLEVEL%==0 (
    echo Installation du composant reseau...
    %PYCMD% -m pip install -r "%~dp0requirements.txt"
    if not %ERRORLEVEL%==0 (
        echo [ERREUR] Installation impossible.
        pause
        exit /b 1
    )
)

echo Demarrage des 21 mondes sur %URL%...
echo Laisse cette fenetre ouverte pendant le jeu.
start "" /min cmd /c "timeout /t 2 >nul & start %URL%"

%PYCMD% "%~dp0serve.py"

echo.
echo Serveur arrete.
pause
