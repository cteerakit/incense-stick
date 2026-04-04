Add-Type -AssemblyName System.Drawing
$public = (Resolve-Path (Join-Path $PSScriptRoot '..\public')).Path
foreach ($size in @(192, 512)) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(26, 20, 16))
  $path = Join-Path $public ("pwa-{0}x{0}.png" -f $size)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Host "Wrote $path"
}
