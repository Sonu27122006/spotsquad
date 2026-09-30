package com.smartparking.controllers;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.smartparking.database.Database;
import com.smartparking.models.ParkingRecord;
import com.smartparking.services.NotificationService;
import com.smartparking.services.ParkingService;
import com.smartparking.util.HttpUtils;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ParkingController implements HttpHandler {
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
            if ("/api/parking".equals(path)) {
                if ("POST".equalsIgnoreCase(method)) {
                    handleCreateParking(exchange);
                } else if ("GET".equalsIgnoreCase(method)) {
                    handleGetHistoryParking(exchange);
                }
            } else if ("/api/parking/active".equals(path) && "GET".equalsIgnoreCase(method)) {
                handleGetActiveParking(exchange);
            } else if ("/api/parking/history".equals(path) && "GET".equalsIgnoreCase(method)) {
                handleGetHistoryParking(exchange);
            } else if ("/api/parking/search".equals(path) && "GET".equalsIgnoreCase(method)) {
                handleSearchParking(exchange);
            } else if (path.startsWith("/api/parking/pass/") && "GET".equalsIgnoreCase(method)) {
                handleGetPublicPass(exchange, path);
            } else if (path.startsWith("/api/parking/") && path.endsWith("/exit") && "POST".equalsIgnoreCase(method)) {
                handleExitParking(exchange, path);
            } else if (path.startsWith("/api/parking/") && path.endsWith("/simulate-time") && "POST".equalsIgnoreCase(method)) {
                handleSimulateTime(exchange, path);
            } else if (path.startsWith("/api/parking/")) {
                handleGetParkingById(exchange, path);
            } else {
                HttpUtils.sendError(exchange, 404, "Endpoint not found: " + path);
            }
        } catch (Exception e) {
            e.printStackTrace();
            HttpUtils.sendError(exchange, 500, "Internal Server Error: " + e.getMessage());
        }
    }

    private void handleCreateParking(HttpExchange exchange) throws IOException {
        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = gson.fromJson(body, JsonObject.class);

        if (json == null || !json.has("vehicleNumber") || !json.has("customerName") || !json.has("mobileNumber")) {
            HttpUtils.sendError(exchange, 400, "vehicleNumber, customerName, and mobileNumber are required.");
            return;
        }

        String rawVehicleNumber = json.get("vehicleNumber").getAsString().trim();
        String normalizedNumber = ParkingService.normalizeVehicleNumber(rawVehicleNumber);
        String displayVehicleNumber = ParkingService.formatDisplayVehicleNumber(rawVehicleNumber);
        String customerName = json.get("customerName").getAsString().trim();
        String mobileNumber = json.get("mobileNumber").getAsString().replaceAll("[^0-9]", "");
        String vehicleType = json.has("vehicleType") ? json.get("vehicleType").getAsString().trim() : "Two-Wheeler";
        String parkingSlot = json.has("parkingSlot") ? json.get("parkingSlot").getAsString().trim() : "General Bay";

        if (normalizedNumber.length() < 4) {
            HttpUtils.sendError(exchange, 400, "Invalid vehicle number.");
            return;
        }
        if (customerName.length() < 2) {
            HttpUtils.sendError(exchange, 400, "Customer name must be at least 2 characters.");
            return;
        }
        if (mobileNumber.length() != 10) {
            HttpUtils.sendError(exchange, 400, "Mobile number must be a valid 10-digit number.");
            return;
        }

        try {
            // Check for active duplicate parking
            if (ParkingService.isVehicleCurrentlyParked(normalizedNumber)) {
                HttpUtils.sendError(exchange, 409, "Vehicle " + displayVehicleNumber + " is already parked in the facility.");
                return;
            }

            double dailyRate = json.has("customDailyRate") ? json.get("customDailyRate").getAsDouble() :
                    ("Four-Wheeler".equalsIgnoreCase(vehicleType) ? 50.0 : 20.0);

            try (Connection conn = Database.getConnection()) {
                conn.setAutoCommit(false);
                try {
                    // Auto-allocate or validate parking slot
                    if (parkingSlot.isEmpty() || "Auto-Assign".equalsIgnoreCase(parkingSlot) || "General Bay".equalsIgnoreCase(parkingSlot)) {
                        parkingSlot = ParkingService.allocateNextAvailableBay(conn);
                    } else {
                        try (PreparedStatement checkSlot = conn.prepareStatement(
                                "SELECT COUNT(*) FROM parking_records WHERE parking_slot = ? AND status = 'PARKED'")) {
                            checkSlot.setString(1, parkingSlot);
                            try (ResultSet rsSlot = checkSlot.executeQuery()) {
                                if (rsSlot.next() && rsSlot.getInt(1) > 0) {
                                    parkingSlot = ParkingService.allocateNextAvailableBay(conn);
                                }
                            }
                        }
                    }

                    // 1. Find or create customer
                    int customerId;
                    try (PreparedStatement findCust = conn.prepareStatement("SELECT id FROM customers WHERE mobile_number = ? LIMIT 1")) {
                        findCust.setString(1, mobileNumber);
                        try (ResultSet rs = findCust.executeQuery()) {
                            if (rs.next()) {
                                customerId = rs.getInt("id");
                                // Update name if changed
                                try (PreparedStatement updCust = conn.prepareStatement("UPDATE customers SET name = ?, updated_at = ? WHERE id = ?")) {
                                    updCust.setString(1, customerName);
                                    updCust.setString(2, LocalDateTime.now().format(ParkingService.ISO_FORMATTER));
                                    updCust.setInt(3, customerId);
                                    updCust.executeUpdate();
                                }
                            } else {
                                try (PreparedStatement insCust = conn.prepareStatement(
                                        "INSERT INTO customers (name, mobile_number, created_at, updated_at) VALUES (?, ?, ?, ?)",
                                        Statement.RETURN_GENERATED_KEYS)) {
                                    String nowStr = LocalDateTime.now().format(ParkingService.ISO_FORMATTER);
                                    insCust.setString(1, customerName);
                                    insCust.setString(2, mobileNumber);
                                    insCust.setString(3, nowStr);
                                    insCust.setString(4, nowStr);
                                    insCust.executeUpdate();
                                    try (ResultSet gen = insCust.getGeneratedKeys()) {
                                        if (gen.next()) {
                                            customerId = gen.getInt(1);
                                        } else {
                                            throw new SQLException("Failed to retrieve generated customer ID.");
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 2. Find or create vehicle
                    int vehicleId;
                    try (PreparedStatement findVeh = conn.prepareStatement("SELECT id FROM vehicles WHERE normalized_vehicle_number = ? LIMIT 1")) {
                        findVeh.setString(1, normalizedNumber);
                        try (ResultSet rs = findVeh.executeQuery()) {
                            if (rs.next()) {
                                vehicleId = rs.getInt("id");
                                try (PreparedStatement updVeh = conn.prepareStatement(
                                        "UPDATE vehicles SET customer_id = ?, vehicle_type = ?, vehicle_number = ?, updated_at = ? WHERE id = ?")) {
                                    updVeh.setInt(1, customerId);
                                    updVeh.setString(2, vehicleType);
                                    updVeh.setString(3, displayVehicleNumber);
                                    updVeh.setString(4, LocalDateTime.now().format(ParkingService.ISO_FORMATTER));
                                    updVeh.setInt(5, vehicleId);
                                    updVeh.executeUpdate();
                                }
                            } else {
                                try (PreparedStatement insVeh = conn.prepareStatement(
                                        "INSERT INTO vehicles (vehicle_number, normalized_vehicle_number, vehicle_type, customer_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                                        Statement.RETURN_GENERATED_KEYS)) {
                                    String nowStr = LocalDateTime.now().format(ParkingService.ISO_FORMATTER);
                                    insVeh.setString(1, displayVehicleNumber);
                                    insVeh.setString(2, normalizedNumber);
                                    insVeh.setString(3, vehicleType);
                                    insVeh.setInt(4, customerId);
                                    insVeh.setString(5, nowStr);
                                    insVeh.setString(6, nowStr);
                                    insVeh.executeUpdate();
                                    try (ResultSet gen = insVeh.getGeneratedKeys()) {
                                        if (gen.next()) {
                                            vehicleId = gen.getInt(1);
                                        } else {
                                            throw new SQLException("Failed to retrieve generated vehicle ID.");
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 3. Generate atomic Token ID & Insert parking record
                    String tokenId = ParkingService.generateParkingId();
                    String entryTime = LocalDateTime.now().format(ParkingService.ISO_FORMATTER);
                    int recordId;

                    try (PreparedStatement insRecord = conn.prepareStatement(
                            """
                            INSERT INTO parking_records 
                            (token_id, vehicle_id, customer_id, parking_slot, entry_time, status, daily_rate, total_duration_days, total_amount, last_billed_cycle, demo_added_days, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, 'PARKED', ?, 1, ?, 1, 0, ?, ?)
                            """, Statement.RETURN_GENERATED_KEYS)) {
                        insRecord.setString(1, tokenId);
                        insRecord.setInt(2, vehicleId);
                        insRecord.setInt(3, customerId);
                        insRecord.setString(4, parkingSlot);
                        insRecord.setString(5, entryTime);
                        insRecord.setDouble(6, dailyRate);
                        insRecord.setDouble(7, dailyRate);
                        insRecord.setString(8, entryTime);
                        insRecord.setString(9, entryTime);
                        insRecord.executeUpdate();
                        try (ResultSet gen = insRecord.getGeneratedKeys()) {
                            if (gen.next()) {
                                recordId = gen.getInt(1);
                            } else {
                                throw new SQLException("Failed to retrieve generated record ID.");
                            }
                        }
                    }

                    // 4. Insert initial payment record (PENDING)
                    try (PreparedStatement insPayment = conn.prepareStatement(
                            "INSERT INTO payments (parking_record_id, amount, payment_method, payment_status, created_at) VALUES (?, ?, 'CASH', 'PENDING', ?)")) {
                        insPayment.setInt(1, recordId);
                        insPayment.setDouble(2, dailyRate);
                        insPayment.setString(3, entryTime);
                        insPayment.executeUpdate();
                    }

                    conn.commit();

                    // 5. Send Entry SMS & In-app Notification
                    String passUrl = "http://localhost:5173/pass/" + tokenId;
                    String pName = "Smart Bus Stand Parking";
                    try (PreparedStatement getPName = conn.prepareStatement("SELECT setting_value FROM settings WHERE setting_key = 'parking_name'")) {
                        try (ResultSet rsP = getPName.executeQuery()) {
                            if (rsP.next() && rsP.getString(1) != null) pName = rsP.getString(1);
                        }
                    } catch (Exception ignored) {}

                    String smsContent = NotificationService.formatEntryNotification(
                            pName, customerName, displayVehicleNumber, parkingSlot, tokenId, entryTime, dailyRate, "PARKED", passUrl);
                    NotificationService.createNotification(customerId, recordId, "ENTRY_CONFIRMATION", "Parking Registration: " + displayVehicleNumber, smsContent);
                    NotificationService.dispatchSmsAsync(mobileNumber, smsContent, tokenId);

                    // Fetch created full record
                    ParkingRecord created = fetchParkingRecordById(conn, recordId);

                    JsonObject res = new JsonObject();
                    res.addProperty("success", true);
                    res.addProperty("message", "Parking session started successfully. Digital token generated.");
                    res.add("data", gson.toJsonTree(created));

                    HttpUtils.sendResponse(exchange, 201, gson.toJson(res));
                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                } finally {
                    conn.setAutoCommit(true);
                }
            }
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleGetActiveParking(HttpExchange exchange) throws IOException {
        String overdueParam = HttpUtils.getQueryParam(exchange, "overdue");
        boolean overdueOnly = "true".equalsIgnoreCase(overdueParam);

        String sql = """
            SELECT pr.id, pr.token_id, pr.vehicle_id, pr.customer_id, pr.parking_slot, pr.entry_time, pr.exit_time,
                   pr.status, pr.daily_rate, pr.total_duration_days, pr.total_amount, pr.last_billed_cycle, pr.demo_added_days,
                   pr.created_at, pr.updated_at, v.vehicle_number, v.normalized_vehicle_number, v.vehicle_type,
                   c.name AS customer_name, c.mobile_number, p.payment_status, p.payment_method, p.transaction_id
            FROM parking_records pr
            JOIN vehicles v ON pr.vehicle_id = v.id
            JOIN customers c ON pr.customer_id = c.id
            LEFT JOIN payments p ON p.parking_record_id = pr.id
            WHERE pr.status = 'PARKED'
            ORDER BY pr.id DESC
        """;

        List<ParkingRecord> list = new ArrayList<>();
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                ParkingRecord rec = ParkingService.mapResultSetToRecord(rs);
                if (!overdueOnly || rec.isOverOneDay()) {
                    list.add(rec);
                }
            }

            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.addProperty("count", list.size());
            response.add("data", gson.toJsonTree(list));
            HttpUtils.sendResponse(exchange, 200, gson.toJson(response));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleGetHistoryParking(HttpExchange exchange) throws IOException {
        String statusFilter = HttpUtils.getQueryParam(exchange, "status");
        String queryFilter = HttpUtils.getQueryParam(exchange, "query");

        StringBuilder sql = new StringBuilder("""
            SELECT pr.id, pr.token_id, pr.vehicle_id, pr.customer_id, pr.parking_slot, pr.entry_time, pr.exit_time,
                   pr.status, pr.daily_rate, pr.total_duration_days, pr.total_amount, pr.last_billed_cycle, pr.demo_added_days,
                   pr.created_at, pr.updated_at, v.vehicle_number, v.normalized_vehicle_number, v.vehicle_type,
                   c.name AS customer_name, c.mobile_number, p.payment_status, p.payment_method, p.transaction_id
            FROM parking_records pr
            JOIN vehicles v ON pr.vehicle_id = v.id
            JOIN customers c ON pr.customer_id = c.id
            LEFT JOIN payments p ON p.parking_record_id = pr.id
            WHERE 1=1
        """);

        List<Object> params = new ArrayList<>();

        if (statusFilter != null && !statusFilter.trim().isEmpty() && !"ALL".equalsIgnoreCase(statusFilter)) {
            sql.append(" AND pr.status = ?");
            params.add(statusFilter.trim().toUpperCase());
        }

        if (queryFilter != null && !queryFilter.trim().isEmpty()) {
            String wildcard = "%" + queryFilter.trim() + "%";
            sql.append(" AND (pr.token_id LIKE ? OR v.vehicle_number LIKE ? OR c.name LIKE ? OR c.mobile_number LIKE ?)");
            params.add(wildcard);
            params.add(wildcard);
            params.add(wildcard);
            params.add(wildcard);
        }

        sql.append(" ORDER BY pr.id DESC LIMIT 200");

        List<ParkingRecord> list = new ArrayList<>();
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {
                stmt.setObject(i + 1, params.get(i));
            }

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(ParkingService.mapResultSetToRecord(rs));
                }
            }

            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.addProperty("count", list.size());
            response.add("data", gson.toJsonTree(list));
            HttpUtils.sendResponse(exchange, 200, gson.toJson(response));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleExitParking(HttpExchange exchange, String path) throws IOException {
        String[] parts = path.split("/");
        String identifier = parts.length > 3 ? parts[3] : "";
        int id = -1;
        try {
            id = Integer.parseInt(identifier);
        } catch (NumberFormatException ignored) {}

        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = body != null && !body.isEmpty() ? gson.fromJson(body, JsonObject.class) : new JsonObject();
        String paymentMethod = (json != null && json.has("paymentMethod")) ? json.get("paymentMethod").getAsString() : "CASH";
        String transactionId = (json != null && json.has("transactionId")) ? json.get("transactionId").getAsString() : "TXN_" + System.currentTimeMillis();

        try (Connection conn = Database.getConnection()) {
            conn.setAutoCommit(false);
            try {
                ParkingRecord record = null;
                if (id > 0) {
                    record = fetchParkingRecordById(conn, id);
                } else if (!identifier.isEmpty()) {
                    record = fetchParkingRecordByToken(conn, identifier);
                    if (record != null) {
                        id = record.getId();
                    }
                }

                if (record == null) {
                    HttpUtils.sendError(exchange, 404, "Parking record not found.");
                    conn.rollback();
                    return;
                }

                if ("EXITED".equals(record.getStatus())) {
                    HttpUtils.sendError(exchange, 400, "Vehicle has already completed exit settlement.");
                    conn.rollback();
                    return;
                }

                LocalDateTime entryTime = LocalDateTime.parse(record.getEntryTime(), ParkingService.ISO_FORMATTER);
                LocalDateTime exitTime = LocalDateTime.now();
                ParkingService.CalculationResult calc = ParkingService.calculateParkingAmount(entryTime, exitTime, record.getDailyRate(), record.getDemoAddedDays());

                String exitTimeStr = exitTime.format(ParkingService.ISO_FORMATTER);

                // 1. Update parking record to EXITED
                try (PreparedStatement updateStmt = conn.prepareStatement(
                        """
                        UPDATE parking_records 
                        SET status = 'EXITED', exit_time = ?, total_duration_days = ?, total_amount = ?, updated_at = ?
                        WHERE id = ?
                        """)) {
                    updateStmt.setString(1, exitTimeStr);
                    updateStmt.setInt(2, calc.durationDays);
                    updateStmt.setDouble(3, calc.totalAmount);
                    updateStmt.setString(4, exitTimeStr);
                    updateStmt.setInt(5, id);
                    updateStmt.executeUpdate();
                }

                // 2. Settle payment record (PAID)
                try (PreparedStatement updatePay = conn.prepareStatement(
                        """
                        UPDATE payments 
                        SET amount = ?, payment_method = ?, payment_status = 'PAID', transaction_id = ?, paid_at = ?
                        WHERE parking_record_id = ?
                        """)) {
                    updatePay.setDouble(1, calc.totalAmount);
                    updatePay.setString(2, paymentMethod);
                    updatePay.setString(3, transactionId);
                    updatePay.setString(4, exitTimeStr);
                    updatePay.setInt(5, id);
                    int updated = updatePay.executeUpdate();
                    if (updated == 0) {
                        try (PreparedStatement insPay = conn.prepareStatement(
                                "INSERT INTO payments (parking_record_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at) VALUES (?, ?, ?, 'PAID', ?, ?, ?)")) {
                            insPay.setInt(1, id);
                            insPay.setDouble(2, calc.totalAmount);
                            insPay.setString(3, paymentMethod);
                            insPay.setString(4, transactionId);
                            insPay.setString(5, exitTimeStr);
                            insPay.setString(6, exitTimeStr);
                            insPay.executeUpdate();
                        }
                    }
                }

                conn.commit();

                // 3. Log notification
                String passUrl = "http://localhost:5173/pass/" + record.getTokenId();
                String exitMsg = NotificationService.formatExitNotification(
                        record.getCustomerName(), record.getVehicleNumber(), record.getParkingSlot(),
                        record.getTokenId(), record.getEntryTime(), exitTimeStr, calc.durationDays,
                        calc.totalAmount, paymentMethod, passUrl);
                NotificationService.createNotification(record.getCustomerId(), id, "EXIT_SETTLED", "Vehicle Exit: " + record.getVehicleNumber(), exitMsg);
                NotificationService.dispatchSmsAsync(record.getMobileNumber(), exitMsg, record.getTokenId());

                ParkingRecord updatedRecord = fetchParkingRecordById(conn, id);

                JsonObject res = new JsonObject();
                res.addProperty("success", true);
                res.addProperty("message", "Vehicle exit processed and payment settled successfully.");
                res.add("data", gson.toJsonTree(updatedRecord));

                HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleSimulateTime(HttpExchange exchange, String path) throws IOException {
        String[] parts = path.split("/");
        String identifier = parts.length > 3 ? parts[3] : "";
        int id = -1;
        try {
            id = Integer.parseInt(identifier);
        } catch (NumberFormatException ignored) {}

        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = body != null && !body.isEmpty() ? gson.fromJson(body, JsonObject.class) : new JsonObject();
        int addedDays = 1;
        if (json != null) {
            if (json.has("addedDays")) {
                addedDays = json.get("addedDays").getAsInt();
            } else if (json.has("days")) {
                addedDays = json.get("days").getAsInt();
            }
        }

        try (Connection conn = Database.getConnection()) {
            ParkingRecord record = null;
            if (id > 0) {
                record = fetchParkingRecordById(conn, id);
            } else if (!identifier.isEmpty()) {
                record = fetchParkingRecordByToken(conn, identifier);
                if (record != null) {
                    id = record.getId();
                }
            }

            if (record == null) {
                HttpUtils.sendError(exchange, 404, "Parking record not found.");
                return;
            }

            LocalDateTime entry = LocalDateTime.parse(record.getEntryTime(), ParkingService.ISO_FORMATTER);
            ParkingService.CalculationResult calc = ParkingService.calculateParkingAmount(entry, LocalDateTime.now(), record.getDailyRate(), addedDays);

            try (PreparedStatement update = conn.prepareStatement(
                    "UPDATE parking_records SET demo_added_days = ?, total_duration_days = ?, total_amount = ?, updated_at = ? WHERE id = ?")) {
                update.setInt(1, addedDays);
                update.setInt(2, calc.durationDays);
                update.setDouble(3, calc.totalAmount);
                update.setString(4, LocalDateTime.now().format(ParkingService.ISO_FORMATTER));
                update.setInt(5, id);
                update.executeUpdate();
            }

            ParkingRecord updated = fetchParkingRecordById(conn, id);
            JsonObject res = new JsonObject();
            res.addProperty("success", true);
            res.addProperty("message", "Simulated +" + addedDays + " days.");
            res.add("data", gson.toJsonTree(updated));

            HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleSearchParking(HttpExchange exchange) throws IOException {
        String queryParam = HttpUtils.getQueryParam(exchange, "query");
        if (queryParam == null || queryParam.trim().isEmpty()) {
            HttpUtils.sendError(exchange, 400, "Search query is required.");
            return;
        }

        String query = queryParam.trim();
        String normalizedQuery = ParkingService.normalizeVehicleNumber(query);

        String sql = """
            SELECT pr.id, pr.token_id, pr.vehicle_id, pr.customer_id, pr.parking_slot, pr.entry_time, pr.exit_time,
                   pr.status, pr.daily_rate, pr.total_duration_days, pr.total_amount, pr.last_billed_cycle, pr.demo_added_days,
                   pr.created_at, pr.updated_at, v.vehicle_number, v.normalized_vehicle_number, v.vehicle_type,
                   c.name AS customer_name, c.mobile_number, p.payment_status, p.payment_method, p.transaction_id
            FROM parking_records pr
            JOIN vehicles v ON pr.vehicle_id = v.id
            JOIN customers c ON pr.customer_id = c.id
            LEFT JOIN payments p ON p.parking_record_id = pr.id
            WHERE pr.token_id LIKE ? 
               OR v.vehicle_number LIKE ? 
               OR v.normalized_vehicle_number LIKE ? 
               OR c.name LIKE ? 
               OR c.mobile_number LIKE ?
            ORDER BY pr.id DESC
            LIMIT 50
        """;

        List<ParkingRecord> results = new ArrayList<>();
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            String wildcard = "%" + query + "%";
            String normWildcard = "%" + normalizedQuery + "%";
            stmt.setString(1, wildcard);
            stmt.setString(2, wildcard);
            stmt.setString(3, normWildcard);
            stmt.setString(4, wildcard);
            stmt.setString(5, wildcard);

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    results.add(ParkingService.mapResultSetToRecord(rs));
                }
            }

            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.addProperty("count", results.size());
            response.add("data", gson.toJsonTree(results));
            HttpUtils.sendResponse(exchange, 200, gson.toJson(response));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleGetParkingById(HttpExchange exchange, String path) throws IOException {
        String identifier = path.substring("/api/parking/".length());
        try (Connection conn = Database.getConnection()) {
            ParkingRecord record;
            if (identifier.matches("^\\d+$")) {
                record = fetchParkingRecordById(conn, Integer.parseInt(identifier));
            } else {
                record = fetchParkingRecordByToken(conn, identifier);
            }

            if (record != null) {
                JsonObject res = new JsonObject();
                res.addProperty("success", true);
                res.add("data", gson.toJsonTree(record));
                HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
            } else {
                HttpUtils.sendError(exchange, 404, "Parking record not found.");
            }
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private void handleGetPublicPass(HttpExchange exchange, String path) throws IOException {
        String identifier = path.substring("/api/parking/pass/".length()).trim();
        if (identifier.endsWith("/")) {
            identifier = identifier.substring(0, identifier.length() - 1);
        }

        if (identifier.isEmpty()) {
            HttpUtils.sendError(exchange, 400, "Parking ID or Token ID is required.");
            return;
        }

        try (Connection conn = Database.getConnection()) {
            ParkingRecord record = null;
            if (identifier.matches("^\\d+$")) {
                record = fetchParkingRecordById(conn, Integer.parseInt(identifier));
            }
            if (record == null) {
                record = fetchParkingRecordByToken(conn, identifier);
            }

            if (record == null) {
                JsonObject err = new JsonObject();
                err.addProperty("success", false);
                err.addProperty("message", "Digital parking pass not found for Token ID: " + identifier);
                HttpUtils.sendResponse(exchange, 404, gson.toJson(err));
                return;
            }

            // Real-time calculation if parked
            int durationDays = record.getTotalDurationDays() > 0 ? record.getTotalDurationDays() : 1;
            double currentAmount = record.getTotalAmount() > 0 ? record.getTotalAmount() : record.getDailyRate();
            double durationHours = record.getDurationHours();
            Double finalAmount = null;

            if ("PARKED".equals(record.getStatus())) {
                try {
                    LocalDateTime entry = LocalDateTime.parse(record.getEntryTime(), ParkingService.ISO_FORMATTER);
                    ParkingService.CalculationResult calc = ParkingService.calculateParkingAmount(
                            entry, LocalDateTime.now(), record.getDailyRate(), record.getDemoAddedDays());
                    durationDays = calc.durationDays;
                    currentAmount = calc.totalAmount;
                    durationHours = calc.durationHours;
                } catch (Exception ignored) {}
            } else {
                finalAmount = record.getTotalAmount();
                currentAmount = record.getTotalAmount();
            }

            JsonObject data = new JsonObject();
            data.addProperty("parkingId", record.getTokenId());
            data.addProperty("tokenId", record.getTokenId());
            data.addProperty("vehicleNumber", record.getVehicleNumber());
            data.addProperty("vehicleType", record.getVehicleType());
            data.addProperty("customerName", record.getCustomerName());
            data.addProperty("mobile", ParkingService.maskMobileNumber(record.getMobileNumber()));
            data.addProperty("mobileNumber", ParkingService.maskMobileNumber(record.getMobileNumber()));
            data.addProperty("parkingBay", record.getParkingSlot());
            data.addProperty("parkingSlot", record.getParkingSlot());
            data.addProperty("entryTime", record.getEntryTime());
            data.addProperty("friendlyEntryTime", ParkingService.formatFriendlyDateTime(record.getEntryTime()));
            data.addProperty("exitTime", record.getExitTime());
            data.addProperty("friendlyExitTime", ParkingService.formatFriendlyDateTime(record.getExitTime()));
            data.addProperty("dailyRate", record.getDailyRate());
            data.addProperty("durationDays", durationDays);
            data.addProperty("durationHours", durationHours);
            data.addProperty("isOverOneDay", durationHours > 24);
            data.addProperty("currentAmount", currentAmount);
            if (finalAmount != null) {
                data.addProperty("finalAmount", finalAmount);
            } else {
                data.add("finalAmount", null);
            }
            data.addProperty("paymentStatus", record.getPaymentStatus() != null ? record.getPaymentStatus() : ("EXITED".equals(record.getStatus()) ? "PAID" : "PENDING"));
            data.addProperty("paymentMethod", record.getPaymentMethod());
            data.addProperty("transactionId", record.getTransactionId());
            data.addProperty("vehicleStatus", record.getStatus());
            data.addProperty("status", record.getStatus());
            data.addProperty("demoAddedDays", record.getDemoAddedDays());
            data.addProperty("passUrl", "http://localhost:5173/pass/" + record.getTokenId());
            data.addProperty("qrCodePayload", "http://localhost:5173/pass/" + record.getTokenId());

            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.add("data", data);

            HttpUtils.sendResponse(exchange, 200, gson.toJson(response));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }

    private ParkingRecord fetchParkingRecordById(Connection conn, int id) throws SQLException {
        String sql = """
            SELECT pr.id, pr.token_id, pr.vehicle_id, pr.customer_id, pr.parking_slot, pr.entry_time, pr.exit_time,
                   pr.status, pr.daily_rate, pr.total_duration_days, pr.total_amount, pr.last_billed_cycle, pr.demo_added_days,
                   pr.created_at, pr.updated_at, v.vehicle_number, v.normalized_vehicle_number, v.vehicle_type,
                   c.name AS customer_name, c.mobile_number, p.payment_status, p.payment_method, p.transaction_id
            FROM parking_records pr
            JOIN vehicles v ON pr.vehicle_id = v.id
            JOIN customers c ON pr.customer_id = c.id
            LEFT JOIN payments p ON p.parking_record_id = pr.id
            WHERE pr.id = ?
        """;
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return ParkingService.mapResultSetToRecord(rs);
                }
            }
        }
        return null;
    }

    private ParkingRecord fetchParkingRecordByToken(Connection conn, String token) throws SQLException {
        String sql = """
            SELECT pr.id, pr.token_id, pr.vehicle_id, pr.customer_id, pr.parking_slot, pr.entry_time, pr.exit_time,
                   pr.status, pr.daily_rate, pr.total_duration_days, pr.total_amount, pr.last_billed_cycle, pr.demo_added_days,
                   pr.created_at, pr.updated_at, v.vehicle_number, v.normalized_vehicle_number, v.vehicle_type,
                   c.name AS customer_name, c.mobile_number, p.payment_status, p.payment_method, p.transaction_id
            FROM parking_records pr
            JOIN vehicles v ON pr.vehicle_id = v.id
            JOIN customers c ON pr.customer_id = c.id
            LEFT JOIN payments p ON p.parking_record_id = pr.id
            WHERE pr.token_id = ?
        """;
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, token);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return ParkingService.mapResultSetToRecord(rs);
                }
            }
        }
        return null;
    }
}
