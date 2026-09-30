package com.smartparking.services;

import com.smartparking.database.Database;
import com.smartparking.models.ParkingRecord;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class ParkingService {
    public static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    public static final DateTimeFormatter DATE_ONLY_FORMATTER = DateTimeFormatter.BASIC_ISO_DATE; // YYYYMMDD
    public static final DateTimeFormatter FRIENDLY_DATETIME_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    public static String formatFriendlyDateTime(LocalDateTime dateTime) {
        if (dateTime == null) return "N/A";
        return dateTime.format(FRIENDLY_DATETIME_FORMATTER);
    }

    public static String formatFriendlyDateTime(String isoString) {
        if (isoString == null || isoString.trim().isEmpty()) return "N/A";
        try {
            LocalDateTime ldt = LocalDateTime.parse(isoString, ISO_FORMATTER);
            return ldt.format(FRIENDLY_DATETIME_FORMATTER);
        } catch (Exception e) {
            return isoString;
        }
    }

    public static String maskMobileNumber(String rawMobile) {
        if (rawMobile == null) return "";
        String clean = rawMobile.replaceAll("[^0-9]", "");
        if (clean.length() == 10) {
            return clean.substring(0, 5) + "*****";
        } else if (clean.length() > 5) {
            return clean.substring(0, clean.length() - 4) + "****";
        }
        return clean;
    }

    public static synchronized String allocateNextAvailableBay(Connection conn) throws SQLException {
        java.util.Set<String> occupied = new java.util.HashSet<>();
        try (PreparedStatement stmt = conn.prepareStatement("SELECT parking_slot FROM parking_records WHERE status = 'PARKED'");
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                String slot = rs.getString("parking_slot");
                if (slot != null && !slot.trim().isEmpty()) {
                    occupied.add(slot.trim().toUpperCase());
                }
            }
        }

        char[] zones = {'A', 'B', 'C', 'D'};
        for (char zone : zones) {
            for (int i = 1; i <= 20; i++) {
                String candidate = String.format("%c-%02d", zone, i);
                if (!occupied.contains(candidate)) {
                    return candidate;
                }
            }
        }
        return "Bay-" + (occupied.size() + 1);
    }

    public static String normalizeVehicleNumber(String vehicleNumber) {
        if (vehicleNumber == null) return "";
        return vehicleNumber.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
    }

    public static String formatDisplayVehicleNumber(String raw) {
        if (raw == null) return "";
        String norm = normalizeVehicleNumber(raw);
        if (norm.length() >= 9 && norm.matches("^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$")) {
            if (norm.length() == 10) {
                return norm.substring(0, 2) + " " + norm.substring(2, 4) + " " + norm.substring(4, 6) + " " + norm.substring(6);
            } else if (norm.length() == 9) {
                return norm.substring(0, 2) + " " + norm.substring(2, 4) + " " + norm.substring(4, 5) + " " + norm.substring(5);
            }
        }
        return raw.trim().toUpperCase();
    }

    public static synchronized String generateParkingId() throws SQLException {
        LocalDate today = LocalDate.now();
        String datePrefix = "PK" + today.format(DATE_ONLY_FORMATTER); // e.g. PK20260827

        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                     "SELECT token_id FROM parking_records WHERE token_id LIKE ? ORDER BY id DESC LIMIT 1")) {
            stmt.setString(1, datePrefix + "%");
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    String lastId = rs.getString("token_id");
                    try {
                        String seqStr = lastId.substring(datePrefix.length());
                        int nextSeq = Integer.parseInt(seqStr) + 1;
                        return String.format("%s%03d", datePrefix, nextSeq);
                    } catch (Exception ignored) {}
                }
            }
        }
        return datePrefix + "001";
    }

    public static class CalculationResult {
        public int durationDays;
        public double totalAmount;
        public long durationHours;
        public long durationMinutes;

        public CalculationResult(int durationDays, double totalAmount, long durationHours, long durationMinutes) {
            this.durationDays = durationDays;
            this.totalAmount = totalAmount;
            this.durationHours = durationHours;
            this.durationMinutes = durationMinutes;
        }
    }

    public static CalculationResult calculateParkingAmount(LocalDateTime entryTime, LocalDateTime exitTime, double dailyRate, int demoAddedDays) {
        if (exitTime == null) {
            exitTime = LocalDateTime.now();
        }
        Duration duration = Duration.between(entryTime, exitTime);
        long totalMinutes = Math.max(0, duration.toMinutes()) + (demoAddedDays * 24L * 60L);
        double totalHours = totalMinutes / 60.0;

        // Minimum 1 day, ceil rounding for completed 24-hour periods
        int days = Math.max(1, (int) Math.ceil(totalHours / 24.0));
        double amount = days * dailyRate;

        return new CalculationResult(days, amount, (long) totalHours, totalMinutes);
    }

    public static boolean isVehicleCurrentlyParked(String normalizedVehicleNumber) throws SQLException {
        String sql = """
            SELECT COUNT(*) FROM parking_records pr
            JOIN vehicles v ON pr.vehicle_id = v.id
            WHERE v.normalized_vehicle_number = ? AND pr.status = 'PARKED'
        """;
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, normalizedVehicleNumber);
            try (ResultSet rs = stmt.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        }
    }

    public static ParkingRecord mapResultSetToRecord(ResultSet rs) throws SQLException {
        ParkingRecord record = new ParkingRecord();
        record.setId(rs.getInt("id"));
        record.setTokenId(rs.getString("token_id"));
        record.setVehicleId(rs.getInt("vehicle_id"));
        record.setCustomerId(rs.getInt("customer_id"));
        record.setVehicleNumber(rs.getString("vehicle_number"));
        record.setNormalizedVehicleNumber(rs.getString("normalized_vehicle_number"));
        record.setVehicleType(rs.getString("vehicle_type"));
        record.setCustomerName(rs.getString("customer_name"));
        record.setMobileNumber(rs.getString("mobile_number"));
        record.setParkingSlot(rs.getString("parking_slot"));
        record.setEntryTime(rs.getString("entry_time"));
        record.setExitTime(rs.getString("exit_time"));
        record.setStatus(rs.getString("status"));
        record.setDailyRate(rs.getDouble("daily_rate"));
        record.setTotalDurationDays(rs.getInt("total_duration_days"));
        record.setTotalAmount(rs.getDouble("total_amount"));
        record.setLastBilledCycle(rs.getInt("last_billed_cycle"));
        record.setDemoAddedDays(rs.getInt("demo_added_days"));
        record.setCreatedAt(rs.getString("created_at"));
        record.setUpdatedAt(rs.getString("updated_at"));

        try {
            record.setPaymentStatus(rs.getString("payment_status"));
            record.setPaymentMethod(rs.getString("payment_method"));
            record.setTransactionId(rs.getString("transaction_id"));
        } catch (SQLException ignored) {}

        // If currently parked, calculate real-time continuous duration & amount
        if ("PARKED".equals(record.getStatus())) {
            try {
                LocalDateTime entry = LocalDateTime.parse(record.getEntryTime(), ISO_FORMATTER);
                CalculationResult calc = calculateParkingAmount(entry, LocalDateTime.now(), record.getDailyRate(), record.getDemoAddedDays());
                record.setTotalDurationDays(calc.durationDays);
                record.setTotalAmount(calc.totalAmount);
                record.setDurationHours(calc.durationHours);
                record.setOverOneDay(calc.durationHours > 24);
            } catch (Exception ignored) {}
        }

        // Generate QR code payload string
        record.setQrCodePayload(String.format("TOKEN:%s|VEH:%s|NAME:%s|MOBILE:%s|SLOT:%s|ENTRY:%s",
                record.getTokenId(), record.getVehicleNumber(), record.getCustomerName(), record.getMobileNumber(),
                record.getParkingSlot(), record.getEntryTime()));

        return record;
    }
}
