$ErrorActionPreference = 'Stop'
Import-Module WebAdministration

if (-not (Test-Path 'C:\www\workbuddy')) {
    New-Item -Path 'C:\www\workbuddy' -ItemType Directory -Force | Out-Null
}
if (-not (Test-Path 'IIS:\AppPools\workbuddy')) {
    New-WebAppPool -Name 'workbuddy' | Out-Null
}
if (Get-Website -Name 'workbuddy' -ErrorAction SilentlyContinue) {
    Remove-Website -Name 'workbuddy'
}
New-Website -Name 'workbuddy' -Port 80 -PhysicalPath 'C:\www\workbuddy' -ApplicationPool 'workbuddy' | Out-Null
Start-Website 'workbuddy'

netsh advfirewall firewall delete rule name='HTTP-80' > $null
netsh advfirewall firewall add rule name='HTTP-80' dir=in action=allow protocol=TCP localport=80 | Out-Null

Write-Output ("SITE_STATE: " + (Get-Website -Name 'workbuddy').State)
Write-Output ("DIR_READY: " + (Test-Path 'C:\www\workbuddy'))
