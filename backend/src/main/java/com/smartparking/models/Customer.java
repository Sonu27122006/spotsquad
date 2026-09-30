package com.smartparking.models;

public class Customer {
    private int id;
    private String name;
    private String mobileNumber;
    private String createdAt;
    private String updatedAt;

    public Customer() {}

    public Customer(int id, String name, String mobileNumber, String createdAt, String updatedAt) {
        this.id = id;
        this.name = name;
        this.mobileNumber = mobileNumber;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
