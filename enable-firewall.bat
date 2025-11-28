@echo off
echo Creating Windows Firewall rule for Invoice Processing System...
netsh advfirewall firewall add rule name="Invoice Processing System - Port 3000" dir=in action=allow protocol=TCP localport=3000
echo.
echo Firewall rule created successfully!
echo Your team can now access: http://10.30.4.72:3000
echo.
pause
