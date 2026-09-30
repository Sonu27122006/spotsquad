package com.smartparking.services;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.smartparking.database.Database;
import com.smartparking.models.Notification;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;

public class NotificationService {

    public static void createNotification(Integer customerId, Integer parkingRecordId, String type, String title, String message) {
        String sql = """
            INSERT INTO notifications (customer_id, parking_record_id, notification_type, title, message, is_read, sent_at, status)
            VALUES (?, ?, ?, ?, ?, 0, ?, 'SENT')
        """;
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            if (customerId != null) {
                stmt.setInt(1, customerId);
            } else {
                stmt.setNull(1, java.sql.Types.INTEGER);
            }
            if (parkingRecordId != null) {
                stmt.setInt(2, parkingRecordId);
            } else {
                stmt.setNull(2, java.sql.Types.INTEGER);
            }
            stmt.setString(3, type);
            stmt.setString(4, title);
            stmt.setString(5, message);
            stmt.setString(6, LocalDateTime.now().format(ParkingService.ISO_FORMATTER));
            stmt.executeUpdate();
            System.out.printf("[Notification] %s: %s%n", title, message);
        } catch (SQLException e) {
            System.err.println("[Notification] Failed to create notification: " + e.getMessage());
        }
    }

    public static String toAsciiSafe(String text) {
        if (text == null) return "";
        // Replace Rupee symbol
        text = text.replace("₹", "Rs. ")
                   .replace("\u20B9", "Rs. ")
                   .replace("\uFFFD", "");
        StringBuilder sb = new StringBuilder();
        for (char c : text.toCharArray()) {
            if ((c >= 32 && c <= 126) || c == '\n' || c == '\r' || c == '\t') {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    public static String formatEntryNotification(String parkingName, String customerName, String vehicleNumber, String slot, String tokenId, String entryTime, double dailyRate, String status, String passUrl) {
        String friendlyTime = ParkingService.formatFriendlyDateTime(entryTime);
        String name = (customerName != null && !customerName.trim().isEmpty()) ? customerName.trim() : "Customer";
        String rateStr = (dailyRate % 1 == 0) ? String.format("%.0f", dailyRate) : String.format("%.2f", dailyRate);

        return toAsciiSafe(String.format(
            "SMART BUS STAND PARKING%n%n" +
            "Hello %s, your parking has been successfully registered.%n%n" +
            "Vehicle: %s%n" +
            "Parking Bay: %s%n" +
            "Token ID: %s%n" +
            "Entry Time: %s%n" +
            "Parking Rate: Rs. %s/day%n" +
            "Status: %s%n%n" +
            "Your Digital Parking Pass and Receipt is ready.%n%n" +
            "View your digital pass:%n" +
            "%s%n%n" +
            "No physical ticket is required. Your parking information is securely maintained digitally.%n%n" +
            "Thank you for choosing Smart Bus Stand Parking.%n" +
            "Have a safe journey.",
            name,
            vehicleNumber != null ? vehicleNumber.trim() : "",
            slot != null ? slot.trim() : "General Bay",
            tokenId != null ? tokenId.trim() : "",
            friendlyTime,
            rateStr,
            status != null ? status.trim() : "PARKED",
            passUrl != null ? passUrl.trim() : ""
        ));
    }

    public static String formatEntrySms(String parkingName, String customerName, String vehicleNumber, String tokenId, String slot) {
        String passUrl = "http://localhost:5173/pass/" + tokenId;
        return formatEntryNotification(parkingName, customerName, vehicleNumber, slot, tokenId, LocalDateTime.now().format(ParkingService.ISO_FORMATTER), 20.0, "PARKED", passUrl);
    }

    public static String format24HourReminderNotification(String customerName, String vehicleNumber, String slot, int days, double additionalRate, double totalAmount, String tokenId, String passUrl) {
        String name = (customerName != null && !customerName.trim().isEmpty()) ? customerName.trim() : "Customer";
        String amountStr = (totalAmount % 1 == 0) ? String.format("%.0f", totalAmount) : String.format("%.2f", totalAmount);

        return toAsciiSafe(String.format(
            "SMART BUS STAND PARKING - STAY DURATION UPDATE%n%n" +
            "Hello %s, your vehicle has reached a new 24-hour parking cycle.%n%n" +
            "Vehicle: %s%n" +
            "Parking Bay: %s%n" +
            "Token ID: %s%n" +
            "Duration: %d Days%n" +
            "Current Amount Due: Rs. %s%n" +
            "Status: PARKED%n%n" +
            "Your Digital Parking Pass is updated.%n%n" +
            "View your digital pass:%n" +
            "%s%n%n" +
            "No physical ticket is required. Your parking information is securely maintained digitally.%n%n" +
            "Thank you for choosing Smart Bus Stand Parking.%n" +
            "Have a safe journey.",
            name,
            vehicleNumber != null ? vehicleNumber.trim() : "",
            slot != null ? slot.trim() : "General Bay",
            tokenId != null ? tokenId.trim() : "",
            days,
            amountStr,
            passUrl != null ? passUrl.trim() : ""
        ));
    }

    public static String format24HourReminderSms(String customerName, String vehicleNumber, int days, double additionalRate, double totalAmount, String tokenId) {
        String passUrl = "http://localhost:5173/pass/" + tokenId;
        return format24HourReminderNotification(customerName, vehicleNumber, "Assigned Bay", days, additionalRate, totalAmount, tokenId, passUrl);
    }

    public static String formatExitNotification(String customerName, String vehicleNumber, String slot, String tokenId, String entryTime, String exitTime, int days, double finalAmount, String paymentMethod, String passUrl) {
        String name = (customerName != null && !customerName.trim().isEmpty()) ? customerName.trim() : "Customer";
        String friendlyEntry = ParkingService.formatFriendlyDateTime(entryTime);
        String friendlyExit = ParkingService.formatFriendlyDateTime(exitTime);
        String amountStr = (finalAmount % 1 == 0) ? String.format("%.0f", finalAmount) : String.format("%.2f", finalAmount);
        String method = (paymentMethod != null && !paymentMethod.trim().isEmpty()) ? paymentMethod.trim() : "CASH";

        return toAsciiSafe(String.format(
            "SMART BUS STAND PARKING - EXIT RECEIPT%n%n" +
            "Hello %s, your vehicle exit and payment have been completed.%n%n" +
            "Vehicle: %s%n" +
            "Parking Bay: %s%n" +
            "Token ID: %s%n" +
            "Entry Time: %s%n" +
            "Exit Time: %s%n" +
            "Total Duration: %d Days%n" +
            "Final Amount Paid: Rs. %s (%s)%n" +
            "Payment Status: PAID%n%n" +
            "View your digital exit receipt:%n" +
            "%s%n%n" +
            "Thank you for choosing Smart Bus Stand Parking.%n" +
            "Have a safe journey.",
            name,
            vehicleNumber != null ? vehicleNumber.trim() : "",
            slot != null ? slot.trim() : "General Bay",
            tokenId != null ? tokenId.trim() : "",
            friendlyEntry,
            friendlyExit,
            days,
            amountStr,
            method,
            passUrl != null ? passUrl.trim() : ""
        ));
    }

    public static class SmsDispatchResult {
        public boolean success;
        public String status;
        public String message;
        public String rawResponse;

        public SmsDispatchResult(boolean success, String status, String message, String rawResponse) {
            this.success = success;
            this.status = status;
            this.message = message;
            this.rawResponse = rawResponse;
        }
    }

    public static String getActiveSmsApiKey() {
        String apiKey = com.smartparking.util.Env.get("SMS_API_KEY", "");
        if (apiKey.isEmpty() || apiKey.startsWith("demo_") || apiKey.startsWith("mock_")) {
            try (Connection conn = Database.getConnection();
                 PreparedStatement stmt = conn.prepareStatement("SELECT setting_value FROM settings WHERE setting_key = 'sms_api_key'")) {
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        String val = rs.getString(1);
                        if (val != null && val.trim().length() > 5) {
                            apiKey = val.trim();
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        return apiKey;
    }

    public static String getActiveSmsProvider() {
        String provider = com.smartparking.util.Env.get("SMS_PROVIDER", "fast2sms");
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT setting_value FROM settings WHERE setting_key = 'sms_provider'")) {
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    String val = rs.getString(1);
                    if (val != null && !val.trim().isEmpty()) {
                        provider = val.trim();
                    }
                }
            }
        } catch (Exception ignored) {}
        return provider;
    }

    public static JsonObject checkFast2SmsWallet() {
        JsonObject result = new JsonObject();
        String apiKey = getActiveSmsApiKey();
        if (apiKey.isEmpty() || apiKey.startsWith("demo_") || apiKey.startsWith("mock_")) {
            result.addProperty("success", false);
            result.addProperty("status", "NOT_CONFIGURED");
            result.addProperty("message", "Fast2SMS API key not configured.");
            return result;
        }

        try {
            URL url = new URL("https://www.fast2sms.com/dev/wallet");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("authorization", apiKey);
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            int code = conn.getResponseCode();
            InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
            String responseStr = "";
            if (is != null) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                    responseStr = sb.toString();
                }
            }

            if (code >= 200 && code < 300) {
                JsonObject json = JsonParser.parseString(responseStr).getAsJsonObject();
                String walletVal = json.has("wallet") ? json.get("wallet").getAsString() : "0.00";
                int smsCount = json.has("sms_count") ? json.get("sms_count").getAsInt() : 0;
                result.addProperty("success", true);
                result.addProperty("wallet", walletVal);
                result.addProperty("smsCount", smsCount);
                result.addProperty("status", "CONNECTED");
                result.addProperty("message", String.format("Fast2SMS active. Balance: Rs. %s (%d credits)", walletVal, smsCount));
            } else {
                result.addProperty("success", false);
                result.addProperty("statusCode", code);
                result.addProperty("status", "GATEWAY_ERROR");
                result.addProperty("message", "Fast2SMS gateway returned code " + code + ": " + responseStr);
            }
        } catch (Exception e) {
            result.addProperty("success", false);
            result.addProperty("status", "NETWORK_ERROR");
            result.addProperty("message", "Network error checking Fast2SMS wallet: " + e.getMessage());
        }
        return result;
    }

    public static SmsDispatchResult dispatchSms(String mobileNumber, String message, String tokenId) {
        message = toAsciiSafe(message);
        if (mobileNumber == null || mobileNumber.trim().isEmpty()) {
            return new SmsDispatchResult(false, "INVALID_NUMBER", "Mobile number is empty.", "");
        }
        String cleanMobile = mobileNumber.replaceAll("[^0-9]", "");
        if (cleanMobile.length() > 10 && cleanMobile.startsWith("91")) {
            cleanMobile = cleanMobile.substring(2);
        }
        if (cleanMobile.length() < 10) {
            return new SmsDispatchResult(false, "INVALID_NUMBER", "Mobile number must contain at least 10 digits.", "");
        }

        String provider = getActiveSmsProvider();
        String apiKey = getActiveSmsApiKey();

        if ("fast2sms".equalsIgnoreCase(provider) && !apiKey.isEmpty() && !apiKey.startsWith("demo_") && !apiKey.startsWith("mock_")) {
            try {
                JsonObject payload = new JsonObject();
                payload.addProperty("route", "q");
                payload.addProperty("message", message);
                payload.addProperty("language", "english");
                payload.addProperty("numbers", cleanMobile);

                byte[] postBytes = payload.toString().getBytes(StandardCharsets.UTF_8);

                URL url = new URL("https://www.fast2sms.com/dev/bulkV2");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("authorization", apiKey);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Content-Length", String.valueOf(postBytes.length));
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.setDoOutput(true);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(postBytes);
                }

                int code = conn.getResponseCode();
                InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
                String responseStr = "";
                if (is != null) {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) sb.append(line);
                        responseStr = sb.toString();
                    }
                }

                System.out.printf("[Fast2SMS] Dispatch HTTP %d: %s%n", code, responseStr);

                boolean isSuccess = (code >= 200 && code < 300);
                String status = isSuccess ? "DELIVERED" : "GATEWAY_ERROR";
                String msgText = isSuccess ? "SMS successfully delivered via Fast2SMS." : ("Gateway error code " + code);

                try {
                    JsonObject respJson = JsonParser.parseString(responseStr).getAsJsonObject();
                    if (respJson.has("message")) {
                        if (respJson.get("message").isJsonArray()) {
                            msgText = respJson.get("message").getAsJsonArray().get(0).getAsString();
                        } else {
                            msgText = respJson.get("message").getAsString();
                        }
                    }
                    if (respJson.has("status_code")) {
                        int sc = respJson.get("status_code").getAsInt();
                        if (sc == 999) {
                            status = "RECHARGE_REQUIRED";
                            msgText = "Fast2SMS Policy: A one-time recharge of Rs. 100 or more is required on fast2sms.com before API SMS can be dispatched.";
                        } else {
                            status = "GATEWAY_CODE_" + sc;
                        }
                    }
                } catch (Exception ignored) {}

                createNotification(null, null, "SMS_DISPATCH", "SMS to " + cleanMobile + " (" + status + ")",
                        message + "\n\n[Gateway Status]: " + msgText);

                return new SmsDispatchResult(isSuccess, status, msgText, responseStr);
            } catch (Exception e) {
                System.err.println("[Fast2SMS] Dispatch exception: " + e.getMessage());
                createNotification(null, null, "SMS_DISPATCH", "SMS to " + cleanMobile + " (FAILED)",
                        message + "\n\n[Network Exception]: " + e.getMessage());
                return new SmsDispatchResult(false, "NETWORK_ERROR", e.getMessage(), "");
            }
        } else {
            createNotification(null, null, "SMS_DISPATCH", "SMS to " + cleanMobile + " (SIMULATED)", message);
            return new SmsDispatchResult(true, "SIMULATED", "SMS simulated in console & notifications log.", "");
        }
    }

    public static void dispatchSmsAsync(String mobileNumber, String message, String tokenId) {
        new Thread(() -> {
            try {
                dispatchSms(mobileNumber, message, tokenId);
            } catch (Exception e) {
                System.err.println("[NotificationService] Async SMS dispatch error: " + e.getMessage());
            }
        }).start();
    }
}
