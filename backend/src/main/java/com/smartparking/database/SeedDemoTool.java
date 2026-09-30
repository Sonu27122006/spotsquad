package com.smartparking.database;

import java.sql.Connection;

public class SeedDemoTool {
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("  Smart Parking Management System - Demo Seeder Tool      ");
        System.out.println("==========================================================");

        try {
            Database.initialize();
            try (Connection conn = Database.getConnection()) {
                Database.seedDemoParkingRecords(conn);
            }
            System.out.println("==========================================================");
            System.out.println("  DEMO DATA SEEDED SUCCESSFULLY                           ");
            System.out.println("==========================================================");
            System.exit(0);
        } catch (Exception e) {
            System.err.println("[Seeder Error] " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
