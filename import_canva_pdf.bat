@echo off
setlocal

if "%~1"=="" (
  echo Usage: import_canva_pdf.bat "C:\path\to\canva-songbook.pdf"
  exit /b 1
)

"%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" "%~dp0scripts\import_canva_pdf.py" "%~1" --clean

endlocal
