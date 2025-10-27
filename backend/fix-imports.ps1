$projectPath = "C:\Users\Afonso Paiva\Desktop\Work\Projetos\Escritores Nogueira\backend\src\main\java"

$javaFiles = Get-ChildItem -Path $projectPath -Filter "*.java" -Recurse

Write-Host "🔧 Corrigindo imports em $($javaFiles.Count) arquivos..." -ForegroundColor Yellow

foreach ($file in $javaFiles) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    # Substituir imports incorretos
    if ($content -match "import com\.escritoresnogueira\.backend") {
        Write-Host "  📝 Corrigindo: $($file.Name)" -ForegroundColor Cyan
        
        $newContent = $content -replace "import com\.escritoresnogueira\.backend", "import main.java.com.escritoresnogueira.backend"
        
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        $modified = $true
        Write-Host "  ✅ Corrigido: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`n✅ Imports corrigidos!" -ForegroundColor Green