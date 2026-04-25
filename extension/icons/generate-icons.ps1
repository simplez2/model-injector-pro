# Generate extension PNG icons from icon-source.svg.
# Requires Inkscape, ImageMagick, or another SVG rasterizer available locally.

param(
    [string]$Source = "icon-source.svg",
    [int[]]$Sizes = @(16, 32, 48, 128)
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourcePath = Join-Path $ScriptDir $Source

if (-not (Test-Path $SourcePath)) {
    throw "Icon source not found: $SourcePath"
}

function Test-Command($Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

foreach ($Size in $Sizes) {
    $Out = Join-Path $ScriptDir "icon-$Size.png"
    Write-Host "Generating $Out"

    if (Test-Command "inkscape") {
        & inkscape $SourcePath --export-type=png --export-filename=$Out --export-width=$Size --export-height=$Size
        continue
    }

    if (Test-Command "magick") {
        & magick -background none -density 256 $SourcePath -resize "${Size}x${Size}" $Out
        continue
    }

    if (Test-Command "convert") {
        & convert -background none -density 256 $SourcePath -resize "${Size}x${Size}" $Out
        continue
    }

    throw "No supported SVG rasterizer found. Install Inkscape or ImageMagick."
}

Write-Host "Done. Generated icon PNG files in $ScriptDir"
