# Prueba: ¿un QR fijo de CoDi (pey) acepta varios pagos?
#
# Uso (desde la carpeta sin-morralla):
#   powershell -ExecutionPolicy Bypass -File .\herramientas\prueba-qr-pey.ps1 -Monto 0.01
#   powershell -ExecutionPolicy Bypass -File .\herramientas\prueba-qr-pey.ps1 -Monto 0      # sin monto: el cliente lo escribe
#
# La API key se toma de la variable PEY_API_KEY o se pide sin mostrarla. No se guarda en ningún lado.
# OJO: son pagos reales. Usa $0.01.

param(
  [decimal]$Monto = 0.01,
  [string]$Concepto = "Prueba Sin Morralla"
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$llave = $env:PEY_API_KEY
if (-not $llave) {
  $segura = Read-Host "Pega tu API key de pey (no se mostrara)" -AsSecureString
  $llave = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($segura))
}
$encabezados = @{ Authorization = "Bearer $llave" }

function Invocar-Pey($metodo, $ruta, $cuerpo) {
  try {
    if ($cuerpo) {
      return Invoke-RestMethod -Method $metodo -Uri "https://api.pey.mx$ruta" -Headers $encabezados -ContentType "application/json" -Body $cuerpo
    }
    return Invoke-RestMethod -Method $metodo -Uri "https://api.pey.mx$ruta" -Headers $encabezados
  } catch {
    Write-Host "pey respondio con error:" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message } else { Write-Host $_.Exception.Message }
    exit 1
  }
}

# 1. Crear el QR sin vencimiento (expiration 0)
$cuerpo = @{ amount = $Monto; concept = $Concepto; expiration = 0; generateImage = $true } | ConvertTo-Json
$qr = Invocar-Pey "Post" "/codi/qr" $cuerpo
Write-Host ""
Write-Host "QR creado. Id (IDC): $($qr.id)" -ForegroundColor Green
Write-Host "Monto: $(if ($Monto -eq 0) { 'libre (el cliente lo escribe)' } else { '$' + $Monto })"

# 2. Guardar y abrir la imagen
if ($qr.qrImage) {
  $base64 = $qr.qrImage -replace '^data:image/\w+;base64,', ''
  $archivo = Join-Path $PWD ("qr-prueba-" + $qr.id + ".png")
  [IO.File]::WriteAllBytes($archivo, [Convert]::FromBase64String($base64))
  Write-Host "Imagen guardada en $archivo"
  Start-Process $archivo
} else {
  Write-Host "pey no regreso imagen. Texto del QR (puedes convertirlo en QR con cualquier generador):"
  Write-Host $qr.qrString
}

# 3. Pagar dos veces
Write-Host ""
Write-Host "Ahora paga este QR DOS veces desde la app de tu banco (CoDi)." -ForegroundColor Yellow
Write-Host "Si puedes, usa dos cuentas distintas. Anota que nombre de beneficiario te muestra la app."
Read-Host "Cuando termines los dos pagos, presiona Enter"

# 4. Ver cuantos pagos registro pey para ese QR
$transacciones = Invocar-Pey "Get" ("/transaction/codi/qr/" + $qr.id) $null
Write-Host ""
Write-Host "Transacciones de este QR segun pey:" -ForegroundColor Green
$transacciones | ConvertTo-Json -Depth 8
Write-Host ""
Write-Host "Si aparecen DOS pagos, un QR fijo acepta varios pagos. Si solo aparece uno, revisa que paso con el segundo en tu app del banco."
