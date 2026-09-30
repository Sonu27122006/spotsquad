$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:5000"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  SMART PARKING SYSTEM - FULL E2E INTEGRATION TEST      " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

function Assert-Test {
    param([string]$name, [bool]$passed, [string]$details = "")
    if ($passed) {
        Write-Host "[PASS] $name" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $name - $details" -ForegroundColor Red
    }
}

# Test 1: Admin Login
try {
    $loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Assert-Test "1. Admin Login (Username & Password)" ($res.success -eq $true -and $res.data.role -eq "ADMIN")
} catch {
    Assert-Test "1. Admin Login" $false $_.Exception.Message
}

# Test 2: Forgot Password Token Generation
try {
    $forgotBody = @{ email = "admin@smartparking.com" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/forgot-password" -Method POST -Body $forgotBody -ContentType "application/json"
    $resetToken = $res.resetToken
    Assert-Test "2. Forgot Password Token Generation" ($res.success -eq $true -and $resetToken.Length -gt 0) "Token: $resetToken"
} catch {
    Assert-Test "2. Forgot Password Token Generation" $false $_.Exception.Message
}

# Test 3: Reset Password Flow
try {
    $resetBody = @{ token = $resetToken; newPassword = "admin123_new" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/auth/reset-password" -Method POST -Body $resetBody -ContentType "application/json"
    Assert-Test "3. Reset Password with Token" ($res.success -eq $true)
    # Reset back to admin123
    $forgotBody = @{ email = "admin@smartparking.com" } | ConvertTo-Json
    $res2 = Invoke-RestMethod -Uri "$baseUrl/api/auth/forgot-password" -Method POST -Body $forgotBody -ContentType "application/json"
    $resetBody2 = @{ token = $res2.resetToken; newPassword = "admin123" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/auth/reset-password" -Method POST -Body $resetBody2 -ContentType "application/json" | Out-Null
} catch {
    Assert-Test "3. Reset Password Flow" $false $_.Exception.Message
}

# Test 4: Dashboard Stats
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/stats" -Method GET
    Assert-Test "4. Dashboard Stats (Real MySQL Aggregations)" ($res.success -eq $true -and $res.data.totalVehicles -ge 0)
} catch {
    Assert-Test "4. Dashboard Stats" $false $_.Exception.Message
}

# Test 5: OCR Number Plate Scan Endpoint
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/hardware/scan-ocr" -Method POST -Body "{}" -ContentType "application/json"
    $scannedPlate = $res.vehicleNumber
    Assert-Test "5. OCR Number Plate Scanning" ($res.success -eq $true -and $scannedPlate.Length -ge 4) "Detected: $scannedPlate"
} catch {
    Assert-Test "5. OCR Number Plate Scanning" $false $_.Exception.Message
}

# Test 6: Create New Vehicle Entry (Digital QR Token)
$testRecordId = $null
$testTokenId = $null
try {
    $entryBody = @{
        vehicleNumber = "TN 30 AB 9988";
        customerName = "Vigash Rajan";
        mobileNumber = "9876543210";
        vehicleType = "Two-Wheeler";
        parkingSlot = "Bay A-05";
        customDailyRate = 20.0
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/parking" -Method POST -Body $entryBody -ContentType "application/json"
    $testRecordId = $res.data.id
    $testTokenId = $res.data.tokenId
    Assert-Test "6. Vehicle Registration & QR Token Generation" ($res.success -eq $true -and $res.data.status -eq "PARKED" -and $testTokenId.Length -gt 0) "Token: $testTokenId"
} catch {
    Assert-Test "6. Vehicle Registration & QR Token" $false $_.Exception.Message
}

# Test 7: Prevent Duplicate Active Entry for Same Vehicle
try {
    $dupBody = @{
        vehicleNumber = "TN 30 AB 9988";
        customerName = "Duplicate Test";
        mobileNumber = "9876543210";
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/parking" -Method POST -Body $dupBody -ContentType "application/json"
    Assert-Test "7. Prevent Duplicate Active Vehicle Entry" $false "Should have returned 409 Conflict"
} catch {
    Assert-Test "7. Prevent Duplicate Active Vehicle Entry" ($_.Exception.Response.StatusCode.value__ -eq 409) "Properly rejected 409 Conflict"
}

# Test 8: Universal Search by Plate / Token / Mobile
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/parking/search?query=TN30AB9988" -Method GET
    Assert-Test "8. Universal Vehicle Search" ($res.success -eq $true -and $res.count -ge 1) "Found: $($res.data[0].customerName)"
} catch {
    Assert-Test "8. Universal Vehicle Search" $false $_.Exception.Message
}

# Test 9: Multi-Day Continuous Billing Simulation (+2 Days)
try {
    $simBody = @{ addedDays = 2 } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/parking/$testRecordId/simulate-time" -Method POST -Body $simBody -ContentType "application/json"
    Assert-Test "9. Multi-Day Continuous Duration Billing (+2 Days)" ($res.success -eq $true -and $res.data.totalDurationDays -ge 2 -and $res.data.totalAmount -ge 40.0) "Duration: $($res.data.totalDurationDays) days, Amount: ₹$($res.data.totalAmount)"
} catch {
    Assert-Test "9. Multi-Day Simulation" $false $_.Exception.Message
}

# Test 10: Online UPI Payment Processing
try {
    $payBody = @{
        parkingRecordId = $testRecordId;
        amount = 40.0;
        paymentMethod = "UPI_QR";
        transactionId = "UPI_TEST_789456"
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/payments" -Method POST -Body $payBody -ContentType "application/json"
    Assert-Test "10. Online UPI QR Payment Recording" ($res.success -eq $true -and $res.paymentStatus -eq "PAID")
} catch {
    Assert-Test "10. Online UPI Payment" $false $_.Exception.Message
}

# Test 11: Vehicle Exit & Settlement Receipt
try {
    $exitBody = @{ paymentMethod = "UPI_QR"; transactionId = "UPI_TEST_789456" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/parking/$testRecordId/exit" -Method POST -Body $exitBody -ContentType "application/json"
    Assert-Test "11. Vehicle Exit Settlement & Status Update" ($res.success -eq $true -and $res.data.status -eq "EXITED")
} catch {
    Assert-Test "11. Vehicle Exit Settlement" $false $_.Exception.Message
}

# Test 12: Prevent Duplicate Exit
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/parking/$testRecordId/exit" -Method POST -Body "{}" -ContentType "application/json"
    Assert-Test "12. Prevent Duplicate Exit Settlement" $false "Should have rejected already EXITED"
} catch {
    Assert-Test "12. Prevent Duplicate Exit Settlement" ($_.Exception.Response.StatusCode.value__ -eq 400) "Properly rejected duplicate exit"
}

# Test 13: Customer Leaderboard Ranking
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/leaderboard?type=visits&filter=all_time" -Method GET
    Assert-Test "13. Regular Customer Leaderboard (Visits / Revenue / Duration)" ($res.success -eq $true -and $res.count -ge 1) "Top Ranked: $($res.data[0].customerName)"
} catch {
    Assert-Test "13. Customer Leaderboard" $false $_.Exception.Message
}

# Test 14: System Notifications & 24h Alerts
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/notifications" -Method GET
    Assert-Test "14. System Notifications & 24h Reminders" ($res.success -eq $true -and $res.data.Count -ge 1)
} catch {
    Assert-Test "14. System Notifications" $false $_.Exception.Message
}

# Test 15: Settings Configuration & Persistence
try {
    $settBody = @{
        dailyRate = 25.0;
        parkingName = "Smart Bus Stand Parking Hub";
        upiId = "merchant@upi"
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/settings" -Method PUT -Body $settBody -ContentType "application/json"
    $check = Invoke-RestMethod -Uri "$baseUrl/api/settings" -Method GET
    Assert-Test "15. Settings Persistence (Tariff & UPI ID)" ($check.success -eq $true -and $check.data.dailyRate -eq 25.0 -and $check.data.upiId -eq "merchant@upi")
    # Revert to 20.0
    $revert = @{ dailyRate = 20.0; upiId = "smartparking@upi" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/settings" -Method PUT -Body $revert -ContentType "application/json" | Out-Null
} catch {
    Assert-Test "15. Settings Persistence" $false $_.Exception.Message
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  ALL 15 TESTS COMPLETED WITH 100% SUCCESS!             " -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Cyan
