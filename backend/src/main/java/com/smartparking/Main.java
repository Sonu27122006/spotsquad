package com.smartparking;

import com.smartparking.controllers.AuthController;
import com.smartparking.controllers.DashboardController;
import com.smartparking.controllers.HardwareController;
import com.smartparking.controllers.LeaderboardController;
import com.smartparking.controllers.NotificationController;
import com.smartparking.controllers.ParkingController;
import com.smartparking.controllers.PaymentController;
import com.smartparking.controllers.RootController;
import com.smartparking.controllers.SettingsController;
import com.smartparking.database.Database;
import com.smartparking.services.LongStayScheduler;
import com.smartparking.util.Env;
import com.sun.net.httpserver.HttpServer;

import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class Main {
    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("  Smart Parking Management System (Production Backend)    ");
        System.out.println("==========================================================");

        int port = Env.getInt("PORT", 5000);

        try {
            // 1. Initialize Database & Tables (MySQL Workbench ready)
            Database.initialize();

            // 2. Start Background Cron for 24-Hour Stay Reminders
            LongStayScheduler.start();

            // 3. Create HTTP Server
            HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
            server.setExecutor(Executors.newFixedThreadPool(16));

            // 4. Register HTTP Handlers & REST Endpoints
            server.createContext("/", new RootController());
            server.createContext("/api", new RootController());
            server.createContext("/api/auth", new AuthController());
            server.createContext("/api/dashboard", new DashboardController());
            server.createContext("/api/parking", new ParkingController());
            server.createContext("/api/payments", new PaymentController());
            server.createContext("/api/leaderboard", new LeaderboardController());
            server.createContext("/api/hardware", new HardwareController());
            server.createContext("/api/settings", new SettingsController());
            server.createContext("/api/notifications", new NotificationController());

            server.start();

            System.out.printf("[Server] REST API successfully running on http://localhost:%d%n", port);
            System.out.println("[Server] MySQL Database connected & ready for MySQL Workbench.");
            System.out.println("==========================================================");

        } catch (Exception e) {
            System.err.println("[Server] Fatal error starting HTTP server: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
