@echo off
setlocal

rem ============================================================
rem  folder_structure.bat
rem
rem  Outputs an ASCII tree of the directory containing this .bat,
rem  including all subfolders and files.
rem
rem  Output file:
rem      folder_structure.txt
rem ============================================================

rem Get the folder where this .bat file is located
set "ROOT=%~dp0"

rem Normalize the root path
for %%I in ("%ROOT%.") do set "ROOT=%%~fI"

rem Set output file path
set "OUT=%ROOT%\folder_structure.txt"

rem Create the output
(
    echo Folder and file structure for:
    echo %ROOT%
    echo.
    tree "%ROOT%" /A /F
) > "%OUT%"

rem Display the output in the console
type "%OUT%"

echo.
echo ============================================================
echo Output written to:
echo %OUT%
echo ============================================================
echo.

pause
endlocal