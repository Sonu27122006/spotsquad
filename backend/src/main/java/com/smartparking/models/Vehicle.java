package com.smartparking.models;

public class Vehicle {
    private int id;
    private String vehicleNumber;
    private String normalizedVehicleNumber;
    private String vehicleType;
    private int customerId;
    private String createdAt;
    private String updatedAt;

    public Vehicle() {}

    public Vehicle(int id, String vehicleNumber, String normalizedVehicleNumber, String vehicleType, int customerId, String createdAt, String updatedAt) {
        this.id = id;
        this.vehicleNumber = vehicleNumber;
        this.normalizedVehicleNumber = normalizedVehicleNumber;
        this.vehicleType = vehicleType;
        this.customerId = customerId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public String getNormalizedVehicleNumber() { return normalizedVehicleNumber; }
    public void setNormalizedVehicleNumber(String normalizedVehicleNumber) { this.normalizedVehicleNumber = normalizedVehicleNumber; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public int getCustomerId() { return customerId; }
    public void setCustomerId(int customerId) { this.customerId = customerId; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
