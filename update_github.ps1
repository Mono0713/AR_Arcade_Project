Write-Host "Starting GitHub Update..."
git add .
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Auto-update: $timestamp"
git push
Write-Host "Update Complete!"
Read-Host -Prompt "Press Enter to exit"
