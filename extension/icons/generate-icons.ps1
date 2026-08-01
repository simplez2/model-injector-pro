Add-Type -AssemblyName System.Drawing

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function New-PointF([float] $x, [float] $y) {
    [System.Drawing.PointF]::new($x, $y)
}

function New-RoundedRectPath([float] $x, [float] $y, [float] $width, [float] $height, [float] $radius) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $radius * 2
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
    $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    $path
}

function New-LensPath([float] $unit, [float] $offsetY = 0) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.StartFigure()
    $path.AddBezier(
        (New-PointF (128 * $unit) ((89 + $offsetY) * $unit)),
        (New-PointF (154 * $unit) ((105.4 + $offsetY) * $unit)),
        (New-PointF (154 * $unit) ((150.6 + $offsetY) * $unit)),
        (New-PointF (128 * $unit) ((167 + $offsetY) * $unit))
    )
    $path.AddBezier(
        (New-PointF (128 * $unit) ((167 + $offsetY) * $unit)),
        (New-PointF (102 * $unit) ((150.6 + $offsetY) * $unit)),
        (New-PointF (102 * $unit) ((105.4 + $offsetY) * $unit)),
        (New-PointF (128 * $unit) ((89 + $offsetY) * $unit))
    )
    $path.CloseFigure()
    $path
}

function Draw-OrbitalLensIcon([int] $size, [string] $outputPath) {
    # Render at 4x, then downsample. This keeps the open orbit and central pupil
    # legible at 16 px without adding small-size-only geometry.
    $renderScale = 4
    $canvas = $size * $renderScale
    $unit = $canvas / 256.0

    $bitmap = [System.Drawing.Bitmap]::new($canvas, $canvas, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $cardPath = New-RoundedRectPath (16 * $unit) (16 * $unit) (224 * $unit) (224 * $unit) (55 * $unit)
    $bgBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 13, 25, 39))
    $graphics.FillPath($bgBrush, $cardPath)

    $cardBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(26, 255, 255, 255), [float] (1.5 * $unit))
    $graphics.DrawPath($cardBorder, $cardPath)

    $orbitRect = [System.Drawing.RectangleF]::new(54 * $unit, 54 * $unit, 148 * $unit, 148 * $unit)
    $orbitShadowRect = [System.Drawing.RectangleF]::new(54 * $unit, 58 * $unit, 148 * $unit, 148 * $unit)
    $orbitShadow = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(87, 3, 10, 17), [float] (22 * $unit))
    $orbitShadow.StartCap = $orbitShadow.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawArc($orbitShadow, $orbitShadowRect, 34, 280)

    $orbitBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        (New-PointF (79 * $unit) (61 * $unit)),
        (New-PointF (185 * $unit) (197 * $unit)),
        [System.Drawing.Color]::FromArgb(255, 247, 251, 252),
        [System.Drawing.Color]::FromArgb(255, 136, 217, 214)
    )
    $orbitBrush.GammaCorrection = $true
    $orbitBlend = [System.Drawing.Drawing2D.ColorBlend]::new(3)
    $orbitBlend.Colors = [System.Drawing.Color[]] @(
        [System.Drawing.Color]::FromArgb(255, 247, 251, 252),
        [System.Drawing.Color]::FromArgb(255, 217, 236, 238),
        [System.Drawing.Color]::FromArgb(255, 136, 217, 214)
    )
    $orbitBlend.Positions = [single[]] @(0.0, 0.55, 1.0)
    $orbitBrush.InterpolationColors = $orbitBlend
    $orbitPen = [System.Drawing.Pen]::new($orbitBrush, [float] (18 * $unit))
    $orbitPen.StartCap = $orbitPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawArc($orbitPen, $orbitRect, 34, 280)

    $orbitNode = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 185, 246, 235))
    $graphics.FillEllipse($orbitNode, (180.3 - 5.5) * $unit, (75.7 - 5.5) * $unit, 11 * $unit, 11 * $unit)

    $lensShadowPath = New-LensPath $unit 3
    $lensShadowPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(77, 2, 8, 14), [float] (17 * $unit))
    $lensShadowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawPath($lensShadowPen, $lensShadowPath)

    $lensPath = New-LensPath $unit
    $lensBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        (New-PointF (108 * $unit) (90 * $unit)),
        (New-PointF (149 * $unit) (167 * $unit)),
        [System.Drawing.Color]::White,
        [System.Drawing.Color]::FromArgb(255, 203, 229, 231)
    )
    $lensBrush.GammaCorrection = $true
    $lensPen = [System.Drawing.Pen]::new($lensBrush, [float] (13 * $unit))
    $lensPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawPath($lensPen, $lensPath)

    $pupilBack = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 7, 19, 30))
    $pupilBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(42, 255, 255, 255), [float] (2 * $unit))
    $graphics.FillEllipse($pupilBack, 115 * $unit, 115 * $unit, 26 * $unit, 26 * $unit)
    $graphics.DrawEllipse($pupilBorder, 115 * $unit, 115 * $unit, 26 * $unit, 26 * $unit)

    $lightPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $lightPath.AddEllipse(119.5 * $unit, 119.5 * $unit, 17 * $unit, 17 * $unit)
    $lightBrush = [System.Drawing.Drawing2D.PathGradientBrush]::new($lightPath)
    $lightBrush.CenterPoint = New-PointF (124 * $unit) (123 * $unit)
    $lightBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 242, 255, 253)
    $lightBrush.SurroundColors = [System.Drawing.Color[]] @([System.Drawing.Color]::FromArgb(255, 76, 189, 180))
    $graphics.FillPath($lightBrush, $lightPath)

    $highlight = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(209, 255, 255, 255))
    $graphics.FillEllipse($highlight, (124.7 - 2.2) * $unit, (124.6 - 2.2) * $unit, 4.4 * $unit, 4.4 * $unit)

    $output = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $outputGraphics = [System.Drawing.Graphics]::FromImage($output)
    $outputGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $outputGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $outputGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $outputGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $outputGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $outputGraphics.DrawImage($bitmap, [System.Drawing.Rectangle]::new(0, 0, $size, $size))
    $output.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $outputGraphics.Dispose()
    $output.Dispose()
    $highlight.Dispose()
    $lightBrush.Dispose()
    $lightPath.Dispose()
    $pupilBorder.Dispose()
    $pupilBack.Dispose()
    $lensPen.Dispose()
    $lensBrush.Dispose()
    $lensPath.Dispose()
    $lensShadowPen.Dispose()
    $lensShadowPath.Dispose()
    $orbitNode.Dispose()
    $orbitPen.Dispose()
    $orbitBrush.Dispose()
    $orbitShadow.Dispose()
    $cardBorder.Dispose()
    $bgBrush.Dispose()
    $cardPath.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach ($size in 16, 32, 48, 128, 256) {
    $fileName = if ($size -eq 256) { 'icon-preview.png' } else { 'icon-{0}.png' -f $size }
    $target = [System.IO.Path]::Combine($outDir, $fileName)
    Draw-OrbitalLensIcon -size $size -outputPath $target
    Write-Host ('Generated {0}' -f $target)
}
