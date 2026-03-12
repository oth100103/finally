$ErrorActionPreference = "Stop"

$ContainerName = "finally"

<<<<<<< HEAD
$running = docker ps -q -f "name=$ContainerName" 2>&1
=======
$running = docker ps -q -f "name=$ContainerName"
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
if ($running) {
    Write-Host "Stopping FinAlly..."
    docker stop $ContainerName | Out-Null
    docker rm $ContainerName | Out-Null
<<<<<<< HEAD
    Write-Host "Stopped. Data volume preserved."
} else {
    Write-Host "FinAlly is not running."
    docker rm $ContainerName 2>&1 | Out-Null
=======
    Write-Host "FinAlly stopped."
} else {
    $stopped = docker ps -aq -f "name=$ContainerName"
    if ($stopped) {
        Write-Host "Removing stopped container..."
        docker rm $ContainerName | Out-Null
        Write-Host "Done."
    } else {
        Write-Host "FinAlly is not running."
    }
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
}
