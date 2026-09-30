package com.smartparking.database;

public class DataResetTool {
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("  Smart Parking Management System - Database Reset Tool   ");
        System.out.println("==========================================================");
        
        try {
            // 1. Initialize DB structure if needed
            Database.initialize();
            
            // 2. Perform safe reset of parking transaction data
            Database.resetParkingData();
            
            System.out.println("==========================================================");
            System.out.println("  DATABASE CLEARED SUCCESSFULLY (Ready for fresh start)   ");
            System.out.println("==========================================================");
            System.exit(0);
        } catch (Exception e) {
            System.err.println("[Database Reset Error] " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
