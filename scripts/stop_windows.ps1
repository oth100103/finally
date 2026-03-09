$ErrorActionPreference = "Stop"

$ContainerName = "finally"

$running = docker ps -q -f "name=$ContainerName" 2>&1
if ($running) {
    Write-Host "Stopping FinAlly..."
    docker stop $ContainerName | Out-Null
    docker rm $ContainerName | Out-Null
    Write-Host "Stopped. Data volume preserved."
} else {
    Write-Host "FinAlly is not running."
    docker rm $ContainerName 2>&1 | Out-Null
}
