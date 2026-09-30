package com.smartparking.models;

public class ParkingRecord {
    private int id;
    private String tokenId; // e.g. PK20260905001
    private String parkingId; // Alias for tokenId
    private int vehicleId;
    private int customerId;
    private String vehicleNumber;
    private String normalizedVehicleNumber;
    private String vehicleType;
    private String customerName;
    private String mobileNumber;
    private String parkingSlot; // e.g. 'Bay A-01'
    private String entryTime;
    private String exitTime;
    private String status; // 'PARKED', 'EXITED'
    private String vehicleStatus; // Alias for status
    private double dailyRate;
    private int totalDurationDays;
    private int parkingDurationDays; // Alias for totalDurationDays
    private double totalAmount;
    private double currentAmount; // Alias for totalAmount
    private double finalAmount; // Alias for totalAmount
    private double durationHours;
    private boolean isOverOneDay;
    private int lastBilledCycle;
    private int demoAddedDays;
    private String paymentStatus; // 'PENDING', 'PAID', 'FAILED'
    private String paymentMethod; // 'CASH', 'UPI_QR', 'CARD'
    private String transactionId;
    private String qrCodePayload;
    private String createdAt;
    private String updatedAt;

    public ParkingRecord() {}

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getTokenId() { return tokenId; }
    public void setTokenId(String tokenId) { 
        this.tokenId = tokenId; 
        this.parkingId = tokenId;
    }

    public String getParkingId() { return parkingId != null ? parkingId : tokenId; }
    public void setParkingId(String parkingId) { 
        this.parkingId = parkingId; 
        this.tokenId = parkingId;
    }

    public int getVehicleId() { return vehicleId; }
    public void setVehicleId(int vehicleId) { this.vehicleId = vehicleId; }

    public int getCustomerId() { return customerId; }
    public void setCustomerId(int customerId) { this.customerId = customerId; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public String getNormalizedVehicleNumber() { return normalizedVehicleNumber; }
    public void setNormalizedVehicleNumber(String normalizedVehicleNumber) { this.normalizedVehicleNumber = normalizedVehicleNumber; }

    public String getVehicleType() { return vehicleType != null ? vehicleType : "Two-Wheeler"; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }

    public String getParkingSlot() { return parkingSlot != null ? parkingSlot : "General Bay"; }
    public void setParkingSlot(String parkingSlot) { this.parkingSlot = parkingSlot; }

    public String getEntryTime() { return entryTime; }
    public void setEntryTime(String entryTime) { this.entryTime = entryTime; }

    public String getExitTime() { return exitTime; }
    public void setExitTime(String exitTime) { this.exitTime = exitTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { 
        this.status = status; 
        this.vehicleStatus = status;
    }

    public String getVehicleStatus() { return vehicleStatus != null ? vehicleStatus : status; }
    public void setVehicleStatus(String vehicleStatus) { 
        this.vehicleStatus = vehicleStatus; 
        this.status = vehicleStatus;
    }

    public double getDailyRate() { return dailyRate; }
    public void setDailyRate(double dailyRate) { this.dailyRate = dailyRate; }

    public int getTotalDurationDays() { return totalDurationDays; }
    public void setTotalDurationDays(int totalDurationDays) { 
        this.totalDurationDays = totalDurationDays; 
        this.parkingDurationDays = totalDurationDays;
    }

    public int getParkingDurationDays() { return parkingDurationDays > 0 ? parkingDurationDays : totalDurationDays; }
    public void setParkingDurationDays(int days) { 
        this.parkingDurationDays = days; 
        this.totalDurationDays = days;
    }

    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { 
        this.totalAmount = totalAmount; 
        this.currentAmount = totalAmount;
        this.finalAmount = totalAmount;
    }

    public double getCurrentAmount() { return currentAmount > 0 ? currentAmount : totalAmount; }
    public void setCurrentAmount(double currentAmount) { 
        this.currentAmount = currentAmount; 
        this.totalAmount = currentAmount;
    }

    public double getFinalAmount() { return finalAmount > 0 ? finalAmount : totalAmount; }
    public void setFinalAmount(double finalAmount) { 
        this.finalAmount = finalAmount; 
        this.totalAmount = finalAmount;
    }

    public int getLastBilledCycle() { return lastBilledCycle; }
    public void setLastBilledCycle(int lastBilledCycle) { this.lastBilledCycle = lastBilledCycle; }

    public int getDemoAddedDays() { return demoAddedDays; }
    public void setDemoAddedDays(int demoAddedDays) { this.demoAddedDays = demoAddedDays; }

    public String getPaymentStatus() { return paymentStatus != null ? paymentStatus : "PENDING"; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getPaymentMethod() { return paymentMethod != null ? paymentMethod : "CASH"; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getQrCodePayload() { return qrCodePayload; }
    public void setQrCodePayload(String qrCodePayload) { this.qrCodePayload = qrCodePayload; }

    public double getDurationHours() { return durationHours; }
    public void setDurationHours(double durationHours) { this.durationHours = durationHours; }

    public boolean isOverOneDay() { return isOverOneDay; }
    public void setOverOneDay(boolean overOneDay) { isOverOneDay = overOneDay; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
