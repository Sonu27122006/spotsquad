package com.smartparking.models;

public class Payment {
    private int id;
    private int parkingRecordId;
    private double amount;
    private String paymentMethod; // 'CASH', 'UPI_QR', 'CARD'
    private String paymentStatus; // 'PENDING', 'PAID', 'FAILED'
    private String transactionId;
    private String paidAt;
    private String createdAt;

    public Payment() {}

    public Payment(int id, int parkingRecordId, double amount, String paymentMethod, String paymentStatus, String transactionId, String paidAt, String createdAt) {
        this.id = id;
        this.parkingRecordId = parkingRecordId;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.paymentStatus = paymentStatus;
        this.transactionId = transactionId;
        this.paidAt = paidAt;
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getParkingRecordId() { return parkingRecordId; }
    public void setParkingRecordId(int parkingRecordId) { this.parkingRecordId = parkingRecordId; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getPaidAt() { return paidAt; }
    public void setPaidAt(String paidAt) { this.paidAt = paidAt; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
