$ErrorActionPreference = "Stop"

$ContainerName = "finally"
$ImageName = "finally"
$VolumeName = "finally-data"
$Port = 8000

<<<<<<< HEAD
Push-Location (Split-Path -Parent $PSScriptRoot)

# Build if image doesn't exist or -Build flag passed
$shouldBuild = $args -contains "--build"
if (-not $shouldBuild) {
    $existing = docker image inspect $ImageName 2>&1
    if ($LASTEXITCODE -ne 0) { $shouldBuild = $true }
=======
Set-Location (Split-Path $PSScriptRoot)

# Build if image doesn't exist or --build flag passed
$shouldBuild = $args -contains "--build"
if (-not $shouldBuild) {
    $imageExists = docker image inspect $ImageName 2>$null
    if (-not $imageExists) { $shouldBuild = $true }
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
}
if ($shouldBuild) {
    Write-Host "Building Docker image..."
    docker build -t $ImageName .
}

# Stop existing container if running
<<<<<<< HEAD
$running = docker ps -q -f "name=$ContainerName" 2>&1
=======
$running = docker ps -q -f "name=$ContainerName"
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
if ($running) {
    Write-Host "Stopping existing container..."
    docker stop $ContainerName | Out-Null
    docker rm $ContainerName | Out-Null
}
<<<<<<< HEAD
docker rm $ContainerName 2>&1 | Out-Null
=======

# Remove stopped container with same name
$stopped = docker ps -aq -f "name=$ContainerName"
if ($stopped) {
    docker rm $ContainerName | Out-Null
}

# Check for .env file
$envArgs = @()
if (Test-Path .env) {
    $envArgs = @("--env-file", ".env")
}
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7

Write-Host "Starting FinAlly..."
docker run -d `
    --name $ContainerName `
<<<<<<< HEAD
    -v "${VolumeName}:/app/db" `
    -p "${Port}:${Port}" `
    --env-file .env `
=======
    -p "${Port}:8000" `
    -v "${VolumeName}:/app/db" `
    @envArgs `
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
    $ImageName

Write-Host ""
Write-Host "FinAlly is running at http://localhost:$Port"
<<<<<<< HEAD
Write-Host "Run scripts\stop_windows.ps1 to stop."

Start-Process "http://localhost:$Port"

Pop-Location
=======
Write-Host ""

# Open browser
Start-Process "http://localhost:$Port"
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
