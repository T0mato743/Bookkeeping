$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

# 安装 IIS（静态网站）
Install-WindowsFeature -Name Web-Server, Web-Static-Content | Out-Null
Import-Module WebAdministration

# 停掉默认站点，避免抢占 80 端口
Get-Website | Where-Object { $_.State -eq 'Started' } | Stop-Website

# 建站点目录
New-Item -Path 'C:\www\workbuddy' -ItemType Directory -Force | Out-Null

# 重建站点
if (Get-Website -Name 'workbuddy' -ErrorAction SilentlyContinue) { Remove-Website -Name 'workbuddy' }
if (Test-Path 'IIS:\AppPools\workbuddy') { Remove-WebAppPool -Name 'workbuddy' }
New-WebAppPool -Name 'workbuddy' | Out-Null
New-Website -Name 'workbuddy' -Port 80 -PhysicalPath 'C:\www\workbuddy' -ApplicationPool 'workbuddy' | Out-Null
Start-Website 'workbuddy'

# 防火墙放行 80
netsh advfirewall firewall delete rule name='HTTP-80' | Out-Null
netsh advfirewall firewall add rule name='HTTP-80' dir=in action=allow protocol=TCP localport=80 | Out-Null

Write-Output 'IIS_SETUP_OK'
