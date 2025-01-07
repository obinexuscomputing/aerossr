@echo off
setlocal

set basedir=%~dp0

set exe=
set args=%*

rem Check if the script is running in a Windows environment
if "%OS%"=="Windows_NT" (
    set exe=..\..\dist\cli\bin\index.mjs
) else (
    set exe=..\..\dist\cli\bin\index.cjs
)

call "%basedir%%exe%" %args%
exit /b %errorlevel%