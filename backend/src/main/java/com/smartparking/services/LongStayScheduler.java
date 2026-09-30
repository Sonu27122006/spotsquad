package com.smartparking.services;

import com.smartparking.database.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class LongStayScheduler {
    private static final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "LongStay-Cron-Worker");
        t.setDaemon(true);
        return t;
    });

    public static void start() {
        System.out.println("[Scheduler] Starting LongStay 24-Hour Reminder Cron Service (Interval: 1 minute)...");
        scheduler.scheduleAtFixedRate(LongStayScheduler::checkLongStayVehicles, 10, 60, TimeUnit.SECONDS);
    }

    public static void checkLongStayVehicles() {
        String sql = """
            SELECT pr.id, pr.token_id, pr.customer_id, pr.parking_slot, pr.entry_time, pr.daily_rate, pr.last_billed_cycle, pr.demo_added_days,
                   v.vehicle_number, c.name AS customer_name, c.mobile_number
            FROM parking_records pr
            JOIN vehicles v ON pr.vehicle_id = v.id
            JOIN customers c ON pr.customer_id = c.id
            WHERE pr.status = 'PARKED'
        """;

        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            LocalDateTime now = LocalDateTime.now();

            while (rs.next()) {
                int recordId = rs.getInt("id");
                String tokenId = rs.getString("token_id");
                int customerId = rs.getInt("customer_id");
                String slot = rs.getString("parking_slot");
                String entryTimeStr = rs.getString("entry_time");
                double dailyRate = rs.getDouble("daily_rate");
                int lastBilledCycle = rs.getInt("last_billed_cycle");
                int demoAddedDays = rs.getInt("demo_added_days");
                String vehicleNumber = rs.getString("vehicle_number");
                String customerName = rs.getString("customer_name");

                try {
                    LocalDateTime entryTime = LocalDateTime.parse(entryTimeStr, ParkingService.ISO_FORMATTER);
                    ParkingService.CalculationResult calc = ParkingService.calculateParkingAmount(entryTime, now, dailyRate, demoAddedDays);

                    // Check if new 24-hour cycle has completed
                    int newCycle = calc.durationDays;
                    if (newCycle > lastBilledCycle) {
                        double newTotal = calc.totalAmount;

                        // 1. Update parking record in database
                        try (PreparedStatement updateStmt = conn.prepareStatement(
                                "UPDATE parking_records SET last_billed_cycle = ?, total_duration_days = ?, total_amount = ?, updated_at = ? WHERE id = ?")) {
                            updateStmt.setInt(1, newCycle);
                            updateStmt.setInt(2, newCycle);
                            updateStmt.setDouble(3, newTotal);
                            updateStmt.setString(4, now.format(ParkingService.ISO_FORMATTER));
                            updateStmt.setInt(5, recordId);
                            updateStmt.executeUpdate();
                        }

                        // 2. Dispatch reminder notification & log to DB
                        String passUrl = "http://localhost:5173/pass/" + tokenId;
                        String msg = NotificationService.format24HourReminderNotification(customerName, vehicleNumber, slot, newCycle, dailyRate, newTotal, tokenId, passUrl);
                        NotificationService.createNotification(customerId, recordId, "LONG_STAY_REMINDER",
                                "24h Parking Period Alert: " + vehicleNumber, msg);

                        System.out.printf("[Scheduler] Vehicle %s exceeded %d-day limit. Updated charge to Rs. %.0f and sent reminder.%n",
                                vehicleNumber, newCycle - 1, newTotal);
                    }
                } catch (Exception ex) {
                    System.err.printf("[Scheduler] Error processing record %s: %s%n", tokenId, ex.getMessage());
                }
            }
        } catch (SQLException e) {
            System.err.println("[Scheduler] Database error in cron check: " + e.getMessage());
        }
    }
}
