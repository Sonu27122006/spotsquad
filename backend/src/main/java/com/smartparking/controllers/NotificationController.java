package com.smartparking.controllers;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.smartparking.database.Database;
import com.smartparking.models.Notification;
import com.smartparking.services.NotificationService;
import com.smartparking.services.ParkingService;
import com.smartparking.util.Env;
import com.smartparking.util.HttpUtils;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class NotificationController implements HttpHandler {
    private static final Gson gson = new Gson();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpUtils.handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            if ("/api/notifications".equals(path) && "GET".equalsIgnoreCase(method)) {
                handleGetAllNotifications(exchange);
            } else if ("/api/notifications/fast2sms-wallet".equals(path) && "GET".equalsIgnoreCase(method)) {
                handleGetFast2SmsWallet(exchange);
            } else if ("/api/notifications/send-sms".equals(path) && "POST".equalsIgnoreCase(method)) {
                handleSendSms(exchange);
            } else if (path.startsWith("/api/notifications/") && path.endsWith("/read") && ("PUT".equalsIgnoreCase(method) || "POST".equalsIgnoreCase(method))) {
                handleMarkAsRead(exchange, path);
            } else if ("/api/notifications/read-all".equals(path) && ("PUT".equalsIgnoreCase(method) || "POST".equalsIgnoreCase(method))) {
                handleMarkAllAsRead(exchange);
            } else {
                HttpUtils.sendError(exchange, 404, "Endpoint not found: " + path);
            }
        } catch (Exception e) {
            e.printStackTrace();
            HttpUtils.sendError(exchange, 500, "Internal Server Error: " + e.getMessage());
        }
    }

    private void handleGetFast2SmsWallet(HttpExchange exchange) throws IOException {
        JsonObject walletInfo = NotificationService.checkFast2SmsWallet();
        HttpUtils.sendResponse(exchange, 200, gson.toJson(walletInfo));
    }

    private void handleSendSms(HttpExchange exchange) throws IOException {
        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = gson.fromJson(body, JsonObject.class);

        if (json == null || !json.has("mobileNumber") || !json.has("message")) {
            HttpUtils.sendError(exchange, 400, "mobileNumber and message are required.");
            return;
        }

        String rawMobile = json.get("mobileNumber").getAsString().replaceAll("[^0-9]", "");
        String message = json.get("message").getAsString();
        String tokenId = json.has("tokenId") ? json.get("tokenId").getAsString() : "";

        NotificationService.SmsDispatchResult result = NotificationService.dispatchSms(rawMobile, message, tokenId);

        JsonObject res = new JsonObject();
        res.addProperty("success", result.success);
        res.addProperty("status", result.status);
        res.addProperty("message", result.message);
        res.addProperty("recipient", rawMobile);
        res.addProperty("rawResponse", result.rawResponse);

        HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
    }

    private void handleGetAllNotifications(HttpExchange exchange) throws IOException {
        List<Notification> list = new ArrayList<>();
        String sql = "SELECT id, parking_record_id, title, message, is_read, sent_at FROM notifications ORDER BY id DESC LIMIT 50";

        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                int recordId = rs.getInt("parking_record_id");
                Integer recId = rs.wasNull() ? null : recordId;
                list.add(new Notification(
                        rs.getInt("id"),
                        recId,
                        rs.getString("title"),
                        rs.getString("message"),
                        rs.getInt("is_read") == 1,
                        rs.getString("sent_at")
                ));
            }
            HttpUtils.sendSuccess(exchange, list);
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleMarkAsRead(HttpExchange exchange, String path) throws IOException {
        String[] parts = path.split("/");
        if (parts.length < 4) {
            HttpUtils.sendError(exchange, 400, "Invalid notification ID path");
            return;
        }

        try {
            int notifId = Integer.parseInt(parts[3]);
            try (Connection conn = Database.getConnection();
                 PreparedStatement stmt = conn.prepareStatement("UPDATE notifications SET is_read = 1 WHERE id = ?")) {
                stmt.setInt(1, notifId);
                int updated = stmt.executeUpdate();
                if (updated > 0) {
                    HttpUtils.sendSuccessMessage(exchange, "Notification marked as read", null);
                } else {
                    HttpUtils.sendError(exchange, 404, "Notification not found");
                }
            }
        } catch (NumberFormatException e) {
            HttpUtils.sendError(exchange, 400, "Invalid notification ID format");
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleMarkAllAsRead(HttpExchange exchange) throws IOException {
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement("UPDATE notifications SET is_read = 1 WHERE is_read = 0")) {
            int updated = stmt.executeUpdate();
            HttpUtils.sendSuccessMessage(exchange, "All notifications marked as read (" + updated + " updated)", null);
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }
}
