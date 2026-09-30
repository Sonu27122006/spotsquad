package com.smartparking.controllers;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.smartparking.database.Database;
import com.smartparking.models.Payment;
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
import java.util.ArrayList;
import java.util.List;

public class PaymentController implements HttpHandler {
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
            if ("/api/payments".equals(path)) {
                if ("POST".equalsIgnoreCase(method)) {
                    handleProcessPayment(exchange);
                } else if ("GET".equalsIgnoreCase(method)) {
                    handleGetPayments(exchange);
                }
            } else {
                HttpUtils.sendError(exchange, 404, "Endpoint not found: " + path);
            }
        } catch (Exception e) {
            HttpUtils.sendError(exchange, 500, "Internal Server Error: " + e.getMessage());
        }
    }

    private void handleProcessPayment(HttpExchange exchange) throws IOException {
        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = gson.fromJson(body, JsonObject.class);

        if (json == null || !json.has("parkingRecordId") || !json.has("amount")) {
            HttpUtils.sendError(exchange, 400, "parkingRecordId and amount are required.");
            return;
        }

        int parkingRecordId = json.get("parkingRecordId").getAsInt();
        double amount = json.get("amount").getAsDouble();
        String paymentMethod = json.has("paymentMethod") ? json.get("paymentMethod").getAsString() : "UPI_QR";
        String transactionId = json.has("transactionId") ? json.get("transactionId").getAsString() : "UPI_TXN_" + System.currentTimeMillis();
        String paymentStatus = json.has("paymentStatus") ? json.get("paymentStatus").getAsString() : "PAID";
        String nowStr = LocalDateTime.now().format(ParkingService.ISO_FORMATTER);

        try (Connection conn = Database.getConnection()) {
            String updateSql = """
                UPDATE payments 
                SET amount = ?, payment_method = ?, payment_status = ?, transaction_id = ?, paid_at = ?
                WHERE parking_record_id = ?
            """;
            try (PreparedStatement stmt = conn.prepareStatement(updateSql)) {
                stmt.setDouble(1, amount);
                stmt.setString(2, paymentMethod);
                stmt.setString(3, paymentStatus);
                stmt.setString(4, transactionId);
                stmt.setString(5, nowStr);
                stmt.setInt(6, parkingRecordId);
                int updated = stmt.executeUpdate();
                if (updated == 0) {
                    try (PreparedStatement insStmt = conn.prepareStatement(
                            "INSERT INTO payments (parking_record_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")) {
                        insStmt.setInt(1, parkingRecordId);
                        insStmt.setDouble(2, amount);
                        insStmt.setString(3, paymentMethod);
                        insStmt.setString(4, paymentStatus);
                        insStmt.setString(5, transactionId);
                        insStmt.setString(6, nowStr);
                        insStmt.setString(7, nowStr);
                        insStmt.executeUpdate();
                    }
                }
            }

            JsonObject res = new JsonObject();
            res.addProperty("success", true);
            res.addProperty("message", "Payment recorded successfully.");
            res.addProperty("paymentStatus", paymentStatus);
            res.addProperty("transactionId", transactionId);
            res.addProperty("amount", amount);

            HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleGetPayments(HttpExchange exchange) throws IOException {
        String sql = """
            SELECT p.id, p.parking_record_id, p.amount, p.payment_method, p.payment_status, p.transaction_id, p.paid_at, p.created_at,
                   pr.token_id, v.vehicle_number, c.name AS customer_name
            FROM payments p
            JOIN parking_records pr ON p.parking_record_id = pr.id
            JOIN vehicles v ON pr.vehicle_id = v.id
            JOIN customers c ON pr.customer_id = c.id
            ORDER BY p.id DESC
            LIMIT 50
        """;

        List<JsonObject> list = new ArrayList<>();
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                JsonObject item = new JsonObject();
                item.addProperty("id", rs.getInt("id"));
                item.addProperty("parkingRecordId", rs.getInt("parking_record_id"));
                item.addProperty("tokenId", rs.getString("token_id"));
                item.addProperty("vehicleNumber", rs.getString("vehicle_number"));
                item.addProperty("customerName", rs.getString("customer_name"));
                item.addProperty("amount", rs.getDouble("amount"));
                item.addProperty("paymentMethod", rs.getString("payment_method"));
                item.addProperty("paymentStatus", rs.getString("payment_status"));
                item.addProperty("transactionId", rs.getString("transaction_id"));
                item.addProperty("paidAt", rs.getString("paid_at"));
                item.addProperty("createdAt", rs.getString("created_at"));
                list.add(item);
            }

            JsonObject res = new JsonObject();
            res.addProperty("success", true);
            res.add("data", gson.toJsonTree(list));
            HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }
}
