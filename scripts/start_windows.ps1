$ErrorActionPreference = "Stop"

$ContainerName = "finally"
$ImageName = "finally"
$VolumeName = "finally-data"
$Port = 8000

Push-Location (Split-Path -Parent $PSScriptRoot)

# Build if image doesn't exist or -Build flag passed
$shouldBuild = $args -contains "--build"
if (-not $shouldBuild) {
    $existing = docker image inspect $ImageName 2>&1
    if ($LASTEXITCODE -ne 0) { $shouldBuild = $true }
}
if ($shouldBuild) {
    Write-Host "Building Docker image..."
    docker build -t $ImageName .
}

# Stop existing container if running
$running = docker ps -q -f "name=$ContainerName" 2>&1
if ($running) {
    Write-Host "Stopping existing container..."
    docker stop $ContainerName | Out-Null
    docker rm $ContainerName | Out-Null
}
docker rm $ContainerName 2>&1 | Out-Null

Write-Host "Starting FinAlly..."
docker run -d `
    --name $ContainerName `
    -v "${VolumeName}:/app/db" `
    -p "${Port}:${Port}" `
    --env-file .env `
    $ImageName

Write-Host ""
Write-Host "FinAlly is running at http://localhost:$Port"
Write-Host "Run scripts\stop_windows.ps1 to stop."

Start-Process "http://localhost:$Port"

Pop-Location
