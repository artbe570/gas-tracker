$ErrorActionPreference = "Stop"

function Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

try {
  Step "Проверка Git"
  git --version | Out-Null

  Step "Добавление изменений"
  git add .

  $commitMessage = Read-Host "Введите сообщение коммита (или Enter для авто)"
  if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  }

  Step "Создание коммита"
  & git commit -m $commitMessage
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Новых изменений для коммита нет (или коммит не создан)." -ForegroundColor Yellow
  }

  Step "Отправка в GitHub"
  & git push
  if ($LASTEXITCODE -ne 0) {
    throw "Push завершился с ошибкой."
  }

  Write-Host ""
  Write-Host "Готово. Обновление сайта обычно занимает 1-2 минуты." -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host "Ошибка: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Read-Host "Нажмите Enter для выхода"
