package com.smartparking.models;

public class HardwareDetection {
    private int id;
    private String vehicleNumber;
    private double confidence;
    private String imageUrl;
    private boolean processed;
    private String createdAt;

    public HardwareDetection() {}

    public HardwareDetection(int id, String vehicleNumber, double confidence, String imageUrl, boolean processed, String createdAt) {
        this.id = id;
        this.vehicleNumber = vehicleNumber;
        this.confidence = confidence;
        this.imageUrl = imageUrl;
        this.processed = processed;
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public boolean isProcessed() { return processed; }
    public void setProcessed(boolean processed) { this.processed = processed; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
