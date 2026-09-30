package com.smartparking.models;

public class LeaderboardEntry {
    private int customerId;
    private String customerName;
    private String mobileNumber;
    private int totalVisits;
    private double totalHours;
    private double totalAmountSpent;
    private int rank;

    public LeaderboardEntry() {}

    public LeaderboardEntry(int customerId, String customerName, String mobileNumber, int totalVisits, double totalHours, double totalAmountSpent, int rank) {
        this.customerId = customerId;
        this.customerName = customerName;
        this.mobileNumber = mobileNumber;
        this.totalVisits = totalVisits;
        this.totalHours = totalHours;
        this.totalAmountSpent = totalAmountSpent;
        this.rank = rank;
    }

    public int getCustomerId() { return customerId; }
    public void setCustomerId(int customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }

    public int getTotalVisits() { return totalVisits; }
    public void setTotalVisits(int totalVisits) { this.totalVisits = totalVisits; }

    public double getTotalHours() { return totalHours; }
    public void setTotalHours(double totalHours) { this.totalHours = totalHours; }

    public double getTotalAmountSpent() { return totalAmountSpent; }
    public void setTotalAmountSpent(double totalAmountSpent) { this.totalAmountSpent = totalAmountSpent; }

    public int getRank() { return rank; }
    public void setRank(int rank) { this.rank = rank; }
}
