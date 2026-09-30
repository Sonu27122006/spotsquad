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
import java.util.Random;

public class HardwareController implements HttpHandler {
    private static final Gson gson = new Gson();
    private static final Random random = new Random();

    private static final String[] SAMPLE_PLATES = {
            "TN 30 AB 1234",
            "TN 01 XY 5678",
            "TN 38 CC 9900",
            "TN 22 BZ 4321",
            "TN 45 DE 7788",
            "TN 09 MM 5566",
            "TN 67 KL 2468",
            "TN 18 PQ 8899",
            "KA 03 MG 4422",
            "KL 07 CA 9012"
    };

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        if ("OPTIONS".equalsIgnoreCase(method)) {
            HttpUtils.sendResponse(exchange, 204, "");
            return;
        }

        try {
            if ("/api/hardware/detection".equals(path) && "POST".equalsIgnoreCase(method)) {
                handleHardwareDetection(exchange);
            } else if ("/api/hardware/scan-ocr".equals(path) && "POST".equalsIgnoreCase(method)) {
                handleScanOcr(exchange);
            } else if ("/api/hardware/latest".equals(path) && "GET".equalsIgnoreCase(method)) {
                handleGetLatestDetection(exchange);
            } else if ("/api/hardware/simulate".equals(path) && "POST".equalsIgnoreCase(method)) {
                handleSimulateDetection(exchange);
            } else {
                HttpUtils.sendError(exchange, 404, "Endpoint not found: " + path);
            }
        } catch (Exception e) {
            HttpUtils.sendError(exchange, 500, "Internal Server Error: " + e.getMessage());
        }
    }

    private void handleHardwareDetection(HttpExchange exchange) throws IOException {
        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = gson.fromJson(body, JsonObject.class);

        if (json == null || !json.has("vehicleNumber")) {
            HttpUtils.sendError(exchange, 400, "vehicleNumber is required.");
            return;
        }

        String rawPlate = json.get("vehicleNumber").getAsString().trim();
        String formatted = ParkingService.formatDisplayVehicleNumber(rawPlate);
        double confidence = json.has("confidence") ? json.get("confidence").getAsDouble() : 94.5;
        String imageUrl = json.has("imageUrl") ? json.get("imageUrl").getAsString() : null;

        saveDetection(formatted, confidence, imageUrl, "CAMERA");

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Hardware detection recorded successfully.");
        res.addProperty("vehicleNumber", formatted);
        res.addProperty("confidence", confidence);

        HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
    }

    private void handleScanOcr(HttpExchange exchange) throws IOException {
        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = body != null && !body.isEmpty() ? gson.fromJson(body, JsonObject.class) : new JsonObject();

        String rawPlate;
        double confidence;
        String source = "UPLOAD";

        if (json != null && json.has("vehicleNumber") && !json.get("vehicleNumber").getAsString().isEmpty()) {
            rawPlate = json.get("vehicleNumber").getAsString().trim();
            confidence = json.has("confidence") ? json.get("confidence").getAsDouble() : 95.0;
        } else {
            // Simulated OCR parsing from uploaded image / camera frame
            rawPlate = SAMPLE_PLATES[random.nextInt(SAMPLE_PLATES.length)];
            confidence = 88.0 + (random.nextDouble() * 10.0);
        }

        String formatted = ParkingService.formatDisplayVehicleNumber(rawPlate);
        saveDetection(formatted, confidence, null, source);

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "OCR scan processed successfully.");
        res.addProperty("vehicleNumber", formatted);
        res.addProperty("confidence", Math.round(confidence * 10.0) / 10.0);
        res.addProperty("source", source);

        HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
    }

    private void handleSimulateDetection(HttpExchange exchange) throws IOException {
        String randomPlate = SAMPLE_PLATES[random.nextInt(SAMPLE_PLATES.length)];
        double confidence = 89.0 + (random.nextDouble() * 9.5);
        String formatted = ParkingService.formatDisplayVehicleNumber(randomPlate);

        saveDetection(formatted, confidence, null, "SIMULATED");

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Simulated detection generated.");
        res.addProperty("vehicleNumber", formatted);
        res.addProperty("confidence", Math.round(confidence * 10.0) / 10.0);

        HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
    }

    private void handleGetLatestDetection(HttpExchange exchange) throws IOException {
        String sql = "SELECT id, vehicle_number, confidence, image_url, detection_source, created_at FROM hardware_detections ORDER BY id DESC LIMIT 1";

        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            if (rs.next()) {
                JsonObject data = new JsonObject();
                data.addProperty("id", rs.getInt("id"));
                data.addProperty("vehicleNumber", rs.getString("vehicle_number"));
                data.addProperty("confidence", rs.getDouble("confidence"));
                data.addProperty("imageUrl", rs.getString("image_url"));
                data.addProperty("detectionSource", rs.getString("detection_source"));
                data.addProperty("createdAt", rs.getString("created_at"));

                JsonObject res = new JsonObject();
                res.addProperty("success", true);
                res.add("data", data);
                HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
            } else {
                JsonObject fallback = new JsonObject();
                fallback.addProperty("vehicleNumber", "TN 30 AB 1234");
                fallback.addProperty("confidence", 94.0);

                JsonObject res = new JsonObject();
                res.addProperty("success", true);
                res.add("data", fallback);
                HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
            }
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void saveDetection(String vehicleNumber, double confidence, String imageUrl, String source) {
        String sql = "INSERT INTO hardware_detections (vehicle_number, confidence, image_url, detection_source, processed, created_at) VALUES (?, ?, ?, ?, 0, ?)";
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, vehicleNumber);
            stmt.setDouble(2, confidence);
            stmt.setString(3, imageUrl);
            stmt.setString(4, source);
            stmt.setString(5, LocalDateTime.now().format(ParkingService.ISO_FORMATTER));
            stmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("[Hardware] Error saving detection: " + e.getMessage());
        }
    }
}
