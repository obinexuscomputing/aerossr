#!/usr/bin/env pwsh
$basedir = Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe = ""
$nodeArgs = @()
$args = @()
$split = $myinvocation.line.Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)
if ($split.length -gt 1) {
    $args = $split[1..($split.length-1)]
}

if ($PSVersionTable.PSVersion -lt "6.0") {
    # Fix case when both the Windows and Linux builds of Node
    # are installed in the same directory
    $exe = "..\dist\cli\bin\index.cjs"
} else {
    $exe = "..\dist\cli\bin\index.mjs"
}

& "$basedir\$exe" $nodeArgs $args
exit $LASTEXITCODE