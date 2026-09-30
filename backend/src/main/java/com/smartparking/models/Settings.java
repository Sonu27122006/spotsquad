package com.smartparking.models;

public class Settings {
    private int id;
    private double dailyRate;
    private String parkingName;
    private boolean demoModeEnabled;

    public Settings() {}

    public Settings(int id, double dailyRate, String parkingName, boolean demoModeEnabled) {
        this.id = id;
        this.dailyRate = dailyRate;
        this.parkingName = parkingName;
        this.demoModeEnabled = demoModeEnabled;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public double getDailyRate() { return dailyRate; }
    public void setDailyRate(double dailyRate) { this.dailyRate = dailyRate; }

    public String getParkingName() { return parkingName; }
    public void setParkingName(String parkingName) { this.parkingName = parkingName; }

    public boolean isDemoModeEnabled() { return demoModeEnabled; }
    public void setDemoModeEnabled(boolean demoModeEnabled) { this.demoModeEnabled = demoModeEnabled; }
}
