package com.smartparking.controllers;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.smartparking.database.Database;
import com.smartparking.services.ParkingService;
import com.smartparking.util.HttpUtils;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

public class SettingsController implements HttpHandler {
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
            if ("/api/settings".equals(path)) {
                if ("GET".equalsIgnoreCase(method)) {
                    handleGetSettings(exchange);
                } else if ("PUT".equalsIgnoreCase(method) || "POST".equalsIgnoreCase(method)) {
                    handleUpdateSettings(exchange);
                }
            } else {
                HttpUtils.sendError(exchange, 404, "Endpoint not found: " + path);
            }
        } catch (Exception e) {
            HttpUtils.sendError(exchange, 500, "Internal Server Error: " + e.getMessage());
        }
    }

    private void handleGetSettings(HttpExchange exchange) throws IOException {
        Map<String, String> map = new HashMap<>();
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT setting_key, setting_value FROM settings");
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                map.put(rs.getString("setting_key"), rs.getString("setting_value"));
            }

            JsonObject data = new JsonObject();
            data.addProperty("dailyRate", Double.parseDouble(map.getOrDefault("daily_rate", "20.0")));
            data.addProperty("fourWheelerDailyRate", Double.parseDouble(map.getOrDefault("four_wheeler_daily_rate", "50.0")));
            data.addProperty("parkingName", map.getOrDefault("parking_name", "Smart Bus Stand Parking System"));
            data.addProperty("demoModeEnabled", Boolean.parseBoolean(map.getOrDefault("demo_mode_enabled", "true")));
            data.addProperty("upiId", map.getOrDefault("upi_id", "smartparking@upi"));
            data.addProperty("merchantName", map.getOrDefault("merchant_name", "Smart Bus Stand Parking Hub"));
            data.addProperty("smsProvider", map.getOrDefault("sms_provider", "mock"));
            data.addProperty("smsApiKey", map.getOrDefault("sms_api_key", "demo_sms_key_12345"));

            JsonObject res = new JsonObject();
            res.addProperty("success", true);
            res.add("data", data);

            HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleUpdateSettings(HttpExchange exchange) throws IOException {
        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = gson.fromJson(body, JsonObject.class);

        if (json == null) {
            HttpUtils.sendError(exchange, 400, "Invalid JSON payload.");
            return;
        }

        String nowStr = LocalDateTime.now().format(ParkingService.ISO_FORMATTER);

        try (Connection conn = Database.getConnection()) {
            if (json.has("dailyRate")) {
                saveSetting(conn, "daily_rate", String.valueOf(json.get("dailyRate").getAsDouble()), nowStr);
            }
            if (json.has("fourWheelerDailyRate")) {
                saveSetting(conn, "four_wheeler_daily_rate", String.valueOf(json.get("fourWheelerDailyRate").getAsDouble()), nowStr);
            }
            if (json.has("parkingName")) {
                saveSetting(conn, "parking_name", json.get("parkingName").getAsString().trim(), nowStr);
            }
            if (json.has("demoModeEnabled")) {
                saveSetting(conn, "demo_mode_enabled", String.valueOf(json.get("demoModeEnabled").getAsBoolean()), nowStr);
            }
            if (json.has("upiId")) {
                saveSetting(conn, "upi_id", json.get("upiId").getAsString().trim(), nowStr);
            }
            if (json.has("merchantName")) {
                saveSetting(conn, "merchant_name", json.get("merchantName").getAsString().trim(), nowStr);
            }
            if (json.has("smsProvider")) {
                saveSetting(conn, "sms_provider", json.get("smsProvider").getAsString().trim(), nowStr);
            }
            if (json.has("smsApiKey")) {
                saveSetting(conn, "sms_api_key", json.get("smsApiKey").getAsString().trim(), nowStr);
            }

            JsonObject res = new JsonObject();
            res.addProperty("success", true);
            res.addProperty("message", "Settings updated successfully in database.");

            HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void saveSetting(Connection conn, String key, String value, String nowStr) throws SQLException {
        String sql = """
            INSERT INTO settings (setting_key, setting_value, updated_at)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = VALUES(updated_at)
        """;
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, key);
            stmt.setString(2, value);
            stmt.setString(3, nowStr);
            stmt.executeUpdate();
        } catch (SQLException e) {
            // SQLite fallback compatibility
            String sqliteUpsert = "INSERT OR REPLACE INTO settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)";
            try (PreparedStatement stmt = conn.prepareStatement(sqliteUpsert)) {
                stmt.setString(1, key);
                stmt.setString(2, value);
                stmt.setString(3, nowStr);
                stmt.executeUpdate();
            }
        }
    }
}
