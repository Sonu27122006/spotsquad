package com.smartparking.models;

public class Notification {
    private int id;
    private Integer parkingRecordId;
    private String title;
    private String message;
    private boolean isRead;
    private String createdAt;

    public Notification() {}

    public Notification(int id, Integer parkingRecordId, String title, String message, boolean isRead, String createdAt) {
        this.id = id;
        this.parkingRecordId = parkingRecordId;
        this.title = title;
        this.message = message;
        this.isRead = isRead;
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public Integer getParkingRecordId() { return parkingRecordId; }
    public void setParkingRecordId(Integer parkingRecordId) { this.parkingRecordId = parkingRecordId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
