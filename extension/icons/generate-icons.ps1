Add-Type -AssemblyName System.Drawing

function New-PointF([float] $x, [float] $y) {
    return [System.Drawing.PointF]::new($x, $y)
}

function New-RoundedRectPath([float] $x, [float] $y, [float] $w, [float] $h, [float] $r) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function Draw-BrandIcon([int] $size, [string] $outputPath) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $pad = $size * 0.0625
    $cardSize = $size - ($pad * 2)
    $radius = $size * 0.21875

    $cardPath = New-RoundedRectPath $pad $pad $cardSize $cardSize $radius
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        (New-PointF ($size * 0.12) ($size * 0.08)),
        (New-PointF ($size * 0.88) ($size * 0.92)),
        [System.Drawing.Color]::FromArgb(255, 6, 21, 34),
        [System.Drawing.Color]::FromArgb(255, 11, 111, 203)
    )
    $graphics.FillPath($bgBrush, $cardPath)

    $graphics.SetClip($cardPath)

    $glowPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $glowPath.AddEllipse($size * -0.30, $size * -0.24, $size * 1.28, $size * 1.02)
    $glowBrush = [System.Drawing.Drawing2D.PathGradientBrush]::new($glowPath)
    $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(130, 120, 242, 255)
    $glowBrush.SurroundColors = [System.Drawing.Color[]] @([System.Drawing.Color]::FromArgb(0, 120, 242, 255))
    $graphics.FillPath($glowBrush, $glowPath)

    $highlightRect = [System.Drawing.RectangleF]::new($pad, $pad, $cardSize, $cardSize)
    $highlightBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        $highlightRect,
        [System.Drawing.Color]::FromArgb(34, 255, 255, 255),
        [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
        90.0
    )
    $graphics.FillPath($highlightBrush, $cardPath)
    $graphics.ResetClip()

    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(32, 255, 255, 255), [Math]::Max(1, $size * 0.012))
    $graphics.DrawPath($borderPen, $cardPath)

    [System.Drawing.PointF[]] $shadowPoints = @(
        (New-PointF ($size * 0.30) ($size * 0.73)),
        (New-PointF ($size * 0.30) ($size * 0.34)),
        (New-PointF ($size * 0.50) ($size * 0.55)),
        (New-PointF ($size * 0.70) ($size * 0.34)),
        (New-PointF ($size * 0.70) ($size * 0.73))
    )
    foreach ($point in $shadowPoints) {
        $point.X += $size * 0.012
        $point.Y += $size * 0.02
    }

    $shadowPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(70, 0, 0, 0), [float] ($size * 0.13))
    $shadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $shadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $shadowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawLines($shadowPen, $shadowPoints)

    [System.Drawing.PointF[]] $markPoints = @(
        (New-PointF ($size * 0.30) ($size * 0.73)),
        (New-PointF ($size * 0.30) ($size * 0.34)),
        (New-PointF ($size * 0.50) ($size * 0.55)),
        (New-PointF ($size * 0.70) ($size * 0.34)),
        (New-PointF ($size * 0.70) ($size * 0.73))
    )

    $markBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        (New-PointF ($size * 0.25) ($size * 0.25)),
        (New-PointF ($size * 0.76) ($size * 0.80)),
        [System.Drawing.Color]::FromArgb(255, 247, 252, 255),
        [System.Drawing.Color]::FromArgb(255, 98, 215, 255)
    )
    $markPen = [System.Drawing.Pen]::new($markBrush, [float] ($size * 0.13))
    $markPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $markPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $markPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawLines($markPen, $markPoints)

    $haloPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $haloPath.AddEllipse($size * 0.66, $size * 0.16, $size * 0.16, $size * 0.16)
    $haloBrush = [System.Drawing.Drawing2D.PathGradientBrush]::new($haloPath)
    $haloBrush.CenterColor = [System.Drawing.Color]::FromArgb(120, 162, 247, 255)
    $haloBrush.SurroundColors = [System.Drawing.Color[]] @([System.Drawing.Color]::FromArgb(0, 162, 247, 255))
    $graphics.FillPath($haloBrush, $haloPath)

    $accentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 162, 247, 255))
    $graphics.FillEllipse($accentBrush, $size * 0.695, $size * 0.195, $size * 0.09, $size * 0.09)

    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $accentBrush.Dispose()
    $haloBrush.Dispose()
    $haloPath.Dispose()
    $markPen.Dispose()
    $markBrush.Dispose()
    $shadowPen.Dispose()
    $borderPen.Dispose()
    $highlightBrush.Dispose()
    $glowBrush.Dispose()
    $glowPath.Dispose()
    $bgBrush.Dispose()
    $cardPath.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sizes = 16, 32, 48, 128, 256
foreach ($size in $sizes) {
    $name = if ($size -eq 256) { "icon-preview.png" } else { "icon-$size.png" }
    Draw-BrandIcon -size $size -outputPath ([System.IO.Path]::Combine($outDir, $name))
}
