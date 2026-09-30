package com.smartparking.controllers;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.smartparking.database.Database;
import com.smartparking.models.ParkingRecord;
import com.smartparking.services.ParkingService;
import com.smartparking.util.HttpUtils;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class DashboardController implements HttpHandler {
    private static final Gson gson = new Gson();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        if ("OPTIONS".equalsIgnoreCase(method)) {
            HttpUtils.sendResponse(exchange, 204, "");
            return;
        }

        try {
            if ("/api/dashboard/stats".equals(path) && "GET".equalsIgnoreCase(method)) {
                handleGetStats(exchange);
            } else if ("/api/dashboard/recent-activity".equals(path) && "GET".equalsIgnoreCase(method)) {
                handleGetRecentActivity(exchange);
            } else {
                HttpUtils.sendError(exchange, 404, "Endpoint not found: " + path);
            }
        } catch (Exception e) {
            HttpUtils.sendError(exchange, 500, "Internal Server Error: " + e.getMessage());
        }
    }

    private void handleGetStats(HttpExchange exchange) throws IOException {
        JsonObject stats = new JsonObject();
        String todayStart = LocalDate.now().toString() + "T00:00:00";
        String todayPrefix = LocalDate.now().toString();

        try (Connection conn = Database.getConnection()) {
            // 1. Total Registered Vehicles
            try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) FROM vehicles");
                 ResultSet rs = stmt.executeQuery()) {
                stats.addProperty("totalVehicles", rs.next() ? rs.getInt(1) : 0);
            }

            // 2. Currently Parked Active Vehicles (Carry forward across all days)
            try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) FROM parking_records WHERE status = 'PARKED'");
                 ResultSet rs = stmt.executeQuery()) {
                stats.addProperty("currentlyParked", rs.next() ? rs.getInt(1) : 0);
            }

            // 3. Exited Vehicles Total
            try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) FROM parking_records WHERE status = 'EXITED'");
                 ResultSet rs = stmt.executeQuery()) {
                stats.addProperty("exitedVehicles", rs.next() ? rs.getInt(1) : 0);
            }

            // 4. Today's Entries (Entered today)
            try (PreparedStatement stmt = conn.prepareStatement(
                    "SELECT COUNT(*) FROM parking_records WHERE entry_time >= ? OR entry_time LIKE ?")) {
                stmt.setString(1, todayStart);
                stmt.setString(2, todayPrefix + "%");
                try (ResultSet rs = stmt.executeQuery()) {
                    stats.addProperty("todayEntries", rs.next() ? rs.getInt(1) : 0);
                }
            }

            // 5. Today's Exits (Exited today)
            try (PreparedStatement stmt = conn.prepareStatement(
                    "SELECT COUNT(*) FROM parking_records WHERE status = 'EXITED' AND (exit_time >= ? OR exit_time LIKE ?)")) {
                stmt.setString(1, todayStart);
                stmt.setString(2, todayPrefix + "%");
                try (ResultSet rs = stmt.executeQuery()) {
                    stats.addProperty("todayExits", rs.next() ? rs.getInt(1) : 0);
                }
            }

            // 6. Today's Revenue (Calculated from payments successfully paid today)
            try (PreparedStatement stmt = conn.prepareStatement(
                    "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'PAID' AND (paid_at >= ? OR paid_at LIKE ?)")) {
                stmt.setString(1, todayStart);
                stmt.setString(2, todayPrefix + "%");
                try (ResultSet rs = stmt.executeQuery()) {
                    stats.addProperty("todayRevenue", rs.next() ? rs.getDouble(1) : 0.0);
                }
            }

            // 7. Total Revenue
            try (PreparedStatement stmt = conn.prepareStatement(
                    "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'PAID'")) {
                try (ResultSet rs = stmt.executeQuery()) {
                    stats.addProperty("totalRevenue", rs.next() ? rs.getDouble(1) : 0.0);
                }
            }

            // 8. Pending Payments (Total uncollected amount from active parked vehicles)
            try (PreparedStatement stmt = conn.prepareStatement(
                    "SELECT COALESCE(SUM(total_amount), 0) FROM parking_records WHERE status = 'PARKED'")) {
                try (ResultSet rs = stmt.executeQuery()) {
                    stats.addProperty("pendingPayments", rs.next() ? rs.getDouble(1) : 0.0);
                }
            }

            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.add("data", stats);
            HttpUtils.sendResponse(exchange, 200, gson.toJson(response));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleGetRecentActivity(HttpExchange exchange) throws IOException {
        String sql = """
            SELECT pr.id, pr.token_id, pr.vehicle_id, pr.customer_id, pr.parking_slot, pr.entry_time, pr.exit_time,
                   pr.status, pr.daily_rate, pr.total_duration_days, pr.total_amount, pr.last_billed_cycle, pr.demo_added_days,
                   pr.created_at, pr.updated_at, v.vehicle_number, v.normalized_vehicle_number, v.vehicle_type,
                   c.name AS customer_name, c.mobile_number, p.payment_status, p.payment_method, p.transaction_id
            FROM parking_records pr
            JOIN vehicles v ON pr.vehicle_id = v.id
            JOIN customers c ON pr.customer_id = c.id
            LEFT JOIN payments p ON p.parking_record_id = pr.id
            ORDER BY pr.id DESC
            LIMIT 25
        """;

        List<ParkingRecord> list = new ArrayList<>();
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(ParkingService.mapResultSetToRecord(rs));
            }

            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.add("data", gson.toJsonTree(list));
            HttpUtils.sendResponse(exchange, 200, gson.toJson(response));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }
}
