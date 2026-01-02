# Load environment variables from .env file and run Spring Boot
# Usage: .\load-env.ps1 (run from backend folder)

$backendPath = $PSScriptRoot
$envFile = Join-Path $backendPath ".env"

if (Test-Path $envFile) {
    Write-Host "Loading environment variables from .env file..." -ForegroundColor Green
    
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        
        # Skip empty lines and comments
        if ($line -and -not $line.StartsWith("#")) {
            # Split on first = only
            $parts = $line -split "=", 2
            
            if ($parts.Count -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim()
                
                # Remove quotes if present
                $value = $value -replace '^["''"]|["''"]$', ''
                
                # Special handling for GOOGLE_APPLICATION_CREDENTIALS - convert relative path to absolute
                if ($key -eq "GOOGLE_APPLICATION_CREDENTIALS") {
                    if (-not [System.IO.Path]::IsPathRooted($value)) {
                        # Relative path - make it absolute from backend folder
                        $value = Join-Path $backendPath $value
                        $value = [System.IO.Path]::GetFullPath($value)
                    }
                    
                    # Verify file exists
                    if (-not (Test-Path $value)) {
                        Write-Host "  WARNING: Firebase credentials file not found at: $value" -ForegroundColor Yellow
                    }
                }
                
                # Set environment variable
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
                if ($key -eq "GOOGLE_APPLICATION_CREDENTIALS") {
                    Write-Host "  Set $key = $value" -ForegroundColor Cyan
                } else {
                    Write-Host "  Set $key" -ForegroundColor Cyan
                }
            }
        }
    }
    
    Write-Host "`nEnvironment variables loaded!" -ForegroundColor Green
    Write-Host "Starting Spring Boot application...`n" -ForegroundColor Yellow
    
    # Make sure we're in backend directory
    Set-Location -Path $backendPath
    
    & mvn spring-boot:run
    
} else {
    Write-Host "ERROR: .env file not found at: $envFile" -ForegroundColor Red
    Write-Host "Please create a .env file in the backend folder." -ForegroundColor Yellow
    exit 1
}

