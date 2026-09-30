package com.smartparking.database;

import com.smartparking.util.Env;
import com.smartparking.util.PasswordUtils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class Database {
    private static String mysqlUrl;
    private static String mysqlUser;
    private static String mysqlPass;
    private static boolean testedMysql = false;
    private static boolean mysqlAvailable = false;

    static {
        loadConfiguration();
    }

    private static void loadConfiguration() {
        String host = Env.get("DB_HOST", "localhost");
        int port = Env.getInt("DB_PORT", 3306);
        String dbName = Env.get("DB_NAME", "parking_management_system");
        mysqlUser = Env.get("DB_USER", "root");
        mysqlPass = Env.get("DB_PASSWORD", "root");

        mysqlUrl = String.format("jdbc:mysql://%s:%d/%s?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&createDatabaseIfNotExist=true&characterEncoding=UTF-8",
                host, port, dbName);

        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException ignored) {}

        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException ignored) {}
    }

    private static Connection tryConnectMysql(String user, String pass) {
        try {
            return DriverManager.getConnection(mysqlUrl, user, pass);
        } catch (SQLException e) {
            try {
                String serverUrl = String.format("jdbc:mysql://%s:%d/?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC",
                        Env.get("DB_HOST", "localhost"), Env.getInt("DB_PORT", 3306));
                try (Connection serverConn = DriverManager.getConnection(serverUrl, user, pass);
                     Statement stmt = serverConn.createStatement()) {
                    stmt.execute("CREATE DATABASE IF NOT EXISTS " + Env.get("DB_NAME", "parking_management_system") + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                }
                return DriverManager.getConnection(mysqlUrl, user, pass);
            } catch (SQLException ignored) {
                return null;
            }
        }
    }

    public static Connection getConnection() throws SQLException {
        if (!testedMysql) {
            Connection c = tryConnectMysql(mysqlUser, mysqlPass);
            if (c != null) {
                mysqlAvailable = true;
                testedMysql = true;
                return c;
            }
            c = tryConnectMysql(mysqlUser, "");
            if (c != null) {
                mysqlPass = "";
                mysqlAvailable = true;
                testedMysql = true;
                return c;
            }
            testedMysql = true;
            mysqlAvailable = false;
            System.out.println("[Database] Note: MySQL not reachable with default root password. Using local database.");
        }

        if (mysqlAvailable) {
            Connection c = tryConnectMysql(mysqlUser, mysqlPass);
            if (c != null) return c;
        }

        return DriverManager.getConnection("jdbc:sqlite:smart_parking.db");
    }

    public static void initialize() {
        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            boolean isMysql = conn.getMetaData().getDatabaseProductName().toLowerCase().contains("mysql");
            System.out.println("[Database] Initializing tables on: " + conn.getMetaData().getDatabaseProductName());

            if (!isMysql) {
                // Check if legacy schema exists in SQLite
                boolean needsReset = false;
                try (ResultSet rs = stmt.executeQuery("PRAGMA table_info(parking_records)")) {
                    boolean foundTokenId = false;
                    while (rs.next()) {
                        if ("token_id".equalsIgnoreCase(rs.getString("name"))) {
                            foundTokenId = true;
                            break;
                        }
                    }
                    if (!foundTokenId) needsReset = true;
                } catch (SQLException ignored) {}

                try (ResultSet rs = stmt.executeQuery("PRAGMA table_info(settings)")) {
                    boolean foundSettingKey = false;
                    while (rs.next()) {
                        if ("setting_key".equalsIgnoreCase(rs.getString("name"))) {
                            foundSettingKey = true;
                            break;
                        }
                    }
                    if (!foundSettingKey) needsReset = true;
                } catch (SQLException ignored) {}

                if (needsReset) {
                    System.out.println("[Database] Upgrading legacy database schema to normalized production relational schema...");
                    stmt.execute("DROP TABLE IF EXISTS parking_records");
                    stmt.execute("DROP TABLE IF EXISTS settings");
                    stmt.execute("DROP TABLE IF EXISTS payments");
                    stmt.execute("DROP TABLE IF EXISTS vehicles");
                    stmt.execute("DROP TABLE IF EXISTS customers");
                    stmt.execute("DROP TABLE IF EXISTS admins");
                    stmt.execute("DROP TABLE IF EXISTS notifications");
                    stmt.execute("DROP TABLE IF EXISTS hardware_detections");
                    stmt.execute("DROP TABLE IF EXISTS forgot_password_tokens");
                }
            }

            if (isMysql) {
                // MySQL Schema
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS admins (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(50) NOT NULL UNIQUE,
                        email VARCHAR(100) NOT NULL UNIQUE,
                        password_hash VARCHAR(255) NOT NULL,
                        salt VARCHAR(64) NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        created_at VARCHAR(50) NOT NULL,
                        updated_at VARCHAR(50) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS forgot_password_tokens (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        admin_id INT NOT NULL,
                        token VARCHAR(100) NOT NULL UNIQUE,
                        expires_at VARCHAR(50) NOT NULL,
                        used INT NOT NULL DEFAULT 0,
                        created_at VARCHAR(50) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS customers (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        mobile_number VARCHAR(20) NOT NULL,
                        created_at VARCHAR(50) NOT NULL,
                        updated_at VARCHAR(50) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS vehicles (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_number VARCHAR(30) NOT NULL,
                        normalized_vehicle_number VARCHAR(30) NOT NULL,
                        vehicle_type VARCHAR(30) NOT NULL DEFAULT 'Two-Wheeler',
                        customer_id INT NOT NULL,
                        created_at VARCHAR(50) NOT NULL,
                        updated_at VARCHAR(50) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS parking_records (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        token_id VARCHAR(50) NOT NULL UNIQUE,
                        vehicle_id INT NOT NULL,
                        customer_id INT NOT NULL,
                        parking_slot VARCHAR(50) NOT NULL DEFAULT 'General Bay',
                        entry_time VARCHAR(50) NOT NULL,
                        exit_time VARCHAR(50) NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'PARKED',
                        daily_rate DOUBLE NOT NULL DEFAULT 20.0,
                        total_duration_days INT NOT NULL DEFAULT 1,
                        total_amount DOUBLE NOT NULL DEFAULT 20.0,
                        last_billed_cycle INT NOT NULL DEFAULT 1,
                        demo_added_days INT NOT NULL DEFAULT 0,
                        created_at VARCHAR(50) NOT NULL,
                        updated_at VARCHAR(50) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS payments (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        parking_record_id INT NOT NULL,
                        amount DOUBLE NOT NULL,
                        payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
                        payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                        transaction_id VARCHAR(100) NULL,
                        paid_at VARCHAR(50) NULL,
                        created_at VARCHAR(50) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS notifications (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        customer_id INT NULL,
                        parking_record_id INT NULL,
                        notification_type VARCHAR(50) NOT NULL DEFAULT 'INFO',
                        title VARCHAR(150) NOT NULL,
                        message TEXT NOT NULL,
                        is_read INT NOT NULL DEFAULT 0,
                        sent_at VARCHAR(50) NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'SENT'
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        setting_key VARCHAR(100) NOT NULL UNIQUE,
                        setting_value TEXT NOT NULL,
                        updated_at VARCHAR(50) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS hardware_detections (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        vehicle_number VARCHAR(30) NOT NULL,
                        confidence DOUBLE NOT NULL,
                        image_url VARCHAR(255) NULL,
                        detection_source VARCHAR(50) NOT NULL DEFAULT 'CAMERA',
                        processed INT NOT NULL DEFAULT 0,
                        created_at VARCHAR(50) NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """);
            } else {
                // SQLite Schema
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS admins (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        salt TEXT NOT NULL,
                        name TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    );
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS forgot_password_tokens (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        admin_id INTEGER NOT NULL,
                        token TEXT UNIQUE NOT NULL,
                        expires_at TEXT NOT NULL,
                        used INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL
                    );
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS customers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        mobile_number TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    );
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS vehicles (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        vehicle_number TEXT NOT NULL,
                        normalized_vehicle_number TEXT NOT NULL,
                        vehicle_type TEXT NOT NULL DEFAULT 'Two-Wheeler',
                        customer_id INTEGER NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    );
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS parking_records (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        token_id TEXT UNIQUE NOT NULL,
                        vehicle_id INTEGER NOT NULL,
                        customer_id INTEGER NOT NULL,
                        parking_slot TEXT NOT NULL DEFAULT 'General Bay',
                        entry_time TEXT NOT NULL,
                        exit_time TEXT,
                        status TEXT NOT NULL DEFAULT 'PARKED',
                        daily_rate REAL NOT NULL DEFAULT 20.0,
                        total_duration_days INTEGER NOT NULL DEFAULT 1,
                        total_amount REAL NOT NULL DEFAULT 20.0,
                        last_billed_cycle INTEGER NOT NULL DEFAULT 1,
                        demo_added_days INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    );
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS payments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        parking_record_id INTEGER NOT NULL,
                        amount REAL NOT NULL,
                        payment_method TEXT NOT NULL DEFAULT 'CASH',
                        payment_status TEXT NOT NULL DEFAULT 'PENDING',
                        transaction_id TEXT,
                        paid_at TEXT,
                        created_at TEXT NOT NULL
                    );
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS notifications (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        customer_id INTEGER,
                        parking_record_id INTEGER,
                        notification_type TEXT NOT NULL DEFAULT 'INFO',
                        title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        is_read INTEGER NOT NULL DEFAULT 0,
                        sent_at TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'SENT'
                    );
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        setting_key TEXT UNIQUE NOT NULL,
                        setting_value TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    );
                """);

                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS hardware_detections (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        vehicle_number TEXT NOT NULL,
                        confidence REAL NOT NULL,
                        image_url TEXT,
                        detection_source TEXT NOT NULL DEFAULT 'CAMERA',
                        processed INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL
                    );
                """);
            }

            // Seed Admin and Settings if empty (preserving existing)
            seedInitialSetup(conn);

            System.out.println("[Database] All tables initialized successfully!");
        } catch (SQLException e) {
            System.err.println("[Database] Error initializing database: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static void seedInitialSetup(Connection conn) throws SQLException {
        String now = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        // 1. Seed Admin user if not exists
        try (PreparedStatement checkAdmin = conn.prepareStatement("SELECT COUNT(*) FROM admins");
             ResultSet rs = checkAdmin.executeQuery()) {
            if (rs.next() && rs.getInt(1) == 0) {
                String salt = PasswordUtils.generateSalt();
                String passHash = PasswordUtils.hashPassword("admin123", salt);

                try (PreparedStatement insertAdmin = conn.prepareStatement(
                        "INSERT INTO admins (username, email, password_hash, salt, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")) {
                    insertAdmin.setString(1, "admin");
                    insertAdmin.setString(2, "admin@smartparking.com");
                    insertAdmin.setString(3, passHash);
                    insertAdmin.setString(4, salt);
                    insertAdmin.setString(5, "System Administrator");
                    insertAdmin.setString(6, now);
                    insertAdmin.setString(7, now);
                    insertAdmin.executeUpdate();
                }
                System.out.println("[Database] Default Admin created (Username: 'admin', Password: 'admin123')");
            }
        }

        // 2. Seed Default Settings
        String[][] defaultSettings = {
                {"daily_rate", "20.0"},
                {"four_wheeler_daily_rate", "50.0"},
                {"parking_name", "Smart Bus Stand Parking System"},
                {"demo_mode_enabled", "true"},
                {"upi_id", "smartparking@upi"},
                {"merchant_name", "Smart Bus Stand Parking Hub"},
                {"sms_provider", com.smartparking.util.Env.get("SMS_PROVIDER", "fast2sms")},
                {"sms_api_key", com.smartparking.util.Env.get("SMS_API_KEY", "qRt17tfiHIXY1n1crNIk8TO4CcP2ZBPQ74V2rSTvLgYLEHNFfGBthCFZb8yE")},
                {"cron_interval_minutes", "5"}
        };

        for (String[] setting : defaultSettings) {
            try (PreparedStatement check = conn.prepareStatement("SELECT setting_value FROM settings WHERE setting_key = ?")) {
                check.setString(1, setting[0]);
                try (ResultSet rs = check.executeQuery()) {
                    if (!rs.next()) {
                        try (PreparedStatement insert = conn.prepareStatement(
                                "INSERT INTO settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)")) {
                            insert.setString(1, setting[0]);
                            insert.setString(2, setting[1]);
                            insert.setString(3, now);
                            insert.executeUpdate();
                        }
                    } else if ("sms_api_key".equals(setting[0])) {
                        String currentKey = rs.getString(1);
                        if (currentKey == null || currentKey.startsWith("demo_") || currentKey.startsWith("mock_")) {
                            try (PreparedStatement update = conn.prepareStatement(
                                    "UPDATE settings SET setting_value = ?, updated_at = ? WHERE setting_key = 'sms_api_key'")) {
                                update.setString(1, setting[1]);
                                update.setString(2, now);
                                update.executeUpdate();
                            }
                        }
                    } else if ("sms_provider".equals(setting[0])) {
                        String currentProvider = rs.getString(1);
                        if ("mock".equalsIgnoreCase(currentProvider)) {
                            try (PreparedStatement update = conn.prepareStatement(
                                    "UPDATE settings SET setting_value = ?, updated_at = ? WHERE setting_key = 'sms_provider'")) {
                                update.setString(1, setting[1]);
                                update.setString(2, now);
                                update.executeUpdate();
                            }
                        }
                    }
                }
            }
        }
    }

    public static void resetParkingData() {
        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            boolean isMysql = conn.getMetaData().getDatabaseProductName().toLowerCase().contains("mysql");
            System.out.println("[Database Reset] Starting safe parking data wipe on: " + conn.getMetaData().getDatabaseProductName());

            // 1. Delete dependent payments and notifications
            stmt.executeUpdate("DELETE FROM payments");
            stmt.executeUpdate("DELETE FROM notifications WHERE parking_record_id IS NOT NULL OR notification_type IN ('ENTRY_CONFIRMATION', 'EXIT_SETTLEMENT', '24H_REMINDER')");
            stmt.executeUpdate("DELETE FROM hardware_detections");
            stmt.executeUpdate("DELETE FROM parking_records");
            stmt.executeUpdate("DELETE FROM vehicles");

            // 2. Reset AUTO_INCREMENT / sequence counters
            if (isMysql) {
                try { stmt.execute("ALTER TABLE payments AUTO_INCREMENT = 1"); } catch (Exception ignored) {}
                try { stmt.execute("ALTER TABLE parking_records AUTO_INCREMENT = 1"); } catch (Exception ignored) {}
                try { stmt.execute("ALTER TABLE vehicles AUTO_INCREMENT = 1"); } catch (Exception ignored) {}
                try { stmt.execute("ALTER TABLE hardware_detections AUTO_INCREMENT = 1"); } catch (Exception ignored) {}
            } else {
                try {
                    stmt.executeUpdate("DELETE FROM sqlite_sequence WHERE name IN ('payments', 'parking_records', 'vehicles', 'hardware_detections')");
                } catch (Exception ignored) {}
            }

            System.out.println("[Database Reset] Safe wipe completed successfully.");
            System.out.println("[Database Reset] Preserved: Admins, Tokens, and Settings.");
            System.out.println("[Database Reset] Total Vehicles: 0 | Currently Parked: 0 | Revenue: Rs. 0");
        } catch (SQLException e) {
            System.err.println("[Database Reset] Error clearing parking data: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public static void seedDemoParkingRecords(Connection conn) {
        try {
            LocalDateTime now = LocalDateTime.now();
            String todayDateStr = now.format(DateTimeFormatter.BASIC_ISO_DATE);

            // 1. Check Active Parked Vehicles
            int activeCount = 0;
            try (PreparedStatement check = conn.prepareStatement("SELECT COUNT(*) FROM parking_records WHERE status = 'PARKED'");
                 ResultSet rs = check.executeQuery()) {
                if (rs.next()) activeCount = rs.getInt(1);
            }

            if (activeCount < 5) {
                System.out.println("[Database] Seeding active parked vehicles (Found: " + activeCount + ")...");
                Object[][] activeVehicles = {
                        {"PK" + todayDateStr + "001", "TN 38 AB 1234", "TN38AB1234", "Ramesh Kumar", "9876543210", "Bay A-01", "Two-Wheeler", now.minusDays(2).minusHours(3), 20.0, 3, 60.0},
                        {"PK" + todayDateStr + "002", "TN 37 CD 5678", "TN37CD5678", "Priya Sundaram", "9845123456", "Bay A-02", "Two-Wheeler", now.minusDays(1).minusHours(5), 20.0, 2, 40.0},
                        {"PK" + todayDateStr + "003", "TN 39 EF 9012", "TN39EF9012", "Karthik Raja", "9789012345", "Bay A-03", "Two-Wheeler", now.minusHours(4), 20.0, 1, 20.0},
                        {"PK" + todayDateStr + "004", "TN 40 GH 3456", "TN40GH3456", "Anitha Devi", "9632587410", "Bay B-01", "Two-Wheeler", now.minusHours(2), 20.0, 1, 20.0},
                        {"PK" + todayDateStr + "005", "TN 41 JK 7890", "TN41JK7890", "Suresh Babu", "9512364780", "Bay B-02", "Two-Wheeler", now.minusMinutes(45), 20.0, 1, 20.0}
                };

                for (Object[] row : activeVehicles) {
                    String tokenId = (String) row[0];
                    if (isTokenExists(conn, tokenId)) continue;

                    String dispNum = (String) row[1];
                    String normNum = (String) row[2];
                    String custName = (String) row[3];
                    String mobile = (String) row[4];
                    String slot = (String) row[5];
                    String vType = (String) row[6];
                    LocalDateTime entryTime = (LocalDateTime) row[7];
                    double rate = (Double) row[8];
                    int durationDays = (Integer) row[9];
                    double amount = (Double) row[10];

                    String entryStr = entryTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    int custId = getOrCreateCustomer(conn, custName, mobile, entryStr);
                    int vehId = getOrCreateVehicle(conn, dispNum, normNum, vType, custId, entryStr);

                    int recId = insertParkingRecord(conn, tokenId, vehId, custId, slot, entryStr, null, "PARKED", rate, durationDays, amount, entryStr);
                    insertPayment(conn, recId, amount, "CASH", "PENDING", null, null, entryStr);
                }
            }

            // 2. Check Historical Exited Vehicles
            int historyCount = 0;
            try (PreparedStatement check = conn.prepareStatement("SELECT COUNT(*) FROM parking_records WHERE status = 'EXITED'");
                 ResultSet rs = check.executeQuery()) {
                if (rs.next()) historyCount = rs.getInt(1);
            }

            if (historyCount < 5) {
                System.out.println("[Database] Seeding historical exited vehicles (Found: " + historyCount + ")...");
                Object[][] historyVehicles = {
                        {"PK" + todayDateStr + "006", "TN 38 XY 2468", "TN38XY2468", "Mohan Raj", "9876501234", "Bay A-04", "Two-Wheeler", now.minusDays(3), now.minusHours(1), "EXITED", 20.0, 3, 60.0, "UPI_QR", "PAID", "TXN_UPI_98234"},
                        {"PK" + todayDateStr + "007", "TN 37 PQ 1357", "TN37PQ1357", "Deepa Lakshmi", "9845012345", "Bay A-05", "Two-Wheeler", now.minusDays(1), now.minusHours(3), "EXITED", 20.0, 1, 20.0, "CASH", "PAID", "TXN_CSH_77412"},
                        {"PK" + todayDateStr + "008", "TN 39 MN 8024", "TN39MN8024", "Vigneshwaran", "9789123456", "Bay B-03", "Two-Wheeler", now.minusDays(4), now.minusDays(1), "EXITED", 20.0, 3, 60.0, "UPI_QR", "PAID", "TXN_UPI_54190"},
                        {"PK" + todayDateStr + "009", "TN 40 RS 5791", "TN40RS5791", "Kavitha Murugan", "9632145870", "Bay B-04", "Two-Wheeler", now.minusDays(2), now.minusDays(1), "EXITED", 20.0, 1, 20.0, "CASH", "PAID", "TXN_CSH_66321"},
                        {"PK" + todayDateStr + "010", "TN 41 UV 6802", "TN41UV6802", "Praveen Kumar", "9512034567", "Bay B-05", "Two-Wheeler", now.minusDays(5), now.minusDays(2), "EXITED", 20.0, 3, 60.0, "CARD", "PAID", "TXN_CRD_11980"}
                };

                for (Object[] row : historyVehicles) {
                    String tokenId = (String) row[0];
                    if (isTokenExists(conn, tokenId)) continue;

                    String dispNum = (String) row[1];
                    String normNum = (String) row[2];
                    String custName = (String) row[3];
                    String mobile = (String) row[4];
                    String slot = (String) row[5];
                    String vType = (String) row[6];
                    LocalDateTime entryTime = (LocalDateTime) row[7];
                    LocalDateTime exitTime = (LocalDateTime) row[8];
                    String status = (String) row[9];
                    double rate = (Double) row[10];
                    int durationDays = (Integer) row[11];
                    double amount = (Double) row[12];
                    String payMethod = (String) row[13];
                    String payStatus = (String) row[14];
                    String txnId = (String) row[15];

                    String entryStr = entryTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    String exitStr = exitTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                    int custId = getOrCreateCustomer(conn, custName, mobile, entryStr);
                    int vehId = getOrCreateVehicle(conn, dispNum, normNum, vType, custId, entryStr);

                    int recId = insertParkingRecord(conn, tokenId, vehId, custId, slot, entryStr, exitStr, status, rate, durationDays, amount, exitStr);
                    insertPayment(conn, recId, amount, payMethod, payStatus, txnId, exitStr, exitStr);
                }
            }

            System.out.println("[Database] Demo records verification & seeding completed.");
        } catch (SQLException e) {
            System.err.println("[Database] Error seeding demo data: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static boolean isTokenExists(Connection conn, String tokenId) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement("SELECT 1 FROM parking_records WHERE token_id = ? LIMIT 1")) {
            stmt.setString(1, tokenId);
            try (ResultSet rs = stmt.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static int getOrCreateCustomer(Connection conn, String name, String mobile, String timestamp) throws SQLException {
        try (PreparedStatement find = conn.prepareStatement("SELECT id FROM customers WHERE mobile_number = ? LIMIT 1")) {
            find.setString(1, mobile);
            try (ResultSet rs = find.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("id");
                }
            }
        }

        try (PreparedStatement insert = conn.prepareStatement(
                "INSERT INTO customers (name, mobile_number, created_at, updated_at) VALUES (?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS)) {
            insert.setString(1, name);
            insert.setString(2, mobile);
            insert.setString(3, timestamp);
            insert.setString(4, timestamp);
            insert.executeUpdate();
            try (ResultSet keys = insert.getGeneratedKeys()) {
                if (keys.next()) return keys.getInt(1);
            }
        }
        throw new SQLException("Failed to create customer: " + name);
    }

    private static int getOrCreateVehicle(Connection conn, String displayNum, String normNum, String type, int customerId, String timestamp) throws SQLException {
        try (PreparedStatement find = conn.prepareStatement("SELECT id FROM vehicles WHERE normalized_vehicle_number = ? LIMIT 1")) {
            find.setString(1, normNum);
            try (ResultSet rs = find.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("id");
                }
            }
        }

        try (PreparedStatement insert = conn.prepareStatement(
                "INSERT INTO vehicles (vehicle_number, normalized_vehicle_number, vehicle_type, customer_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS)) {
            insert.setString(1, displayNum);
            insert.setString(2, normNum);
            insert.setString(3, type);
            insert.setInt(4, customerId);
            insert.setString(5, timestamp);
            insert.setString(6, timestamp);
            insert.executeUpdate();
            try (ResultSet keys = insert.getGeneratedKeys()) {
                if (keys.next()) return keys.getInt(1);
            }
        }
        throw new SQLException("Failed to create vehicle: " + displayNum);
    }

    private static int insertParkingRecord(Connection conn, String tokenId, int vehicleId, int customerId, String slot,
                                          String entryTime, String exitTime, String status, double dailyRate, int durationDays,
                                          double totalAmount, String timestamp) throws SQLException {
        String sql = """
            INSERT INTO parking_records 
            (token_id, vehicle_id, customer_id, parking_slot, entry_time, exit_time, status, daily_rate, total_duration_days, total_amount, last_billed_cycle, demo_added_days, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
        """;
        try (PreparedStatement insert = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            insert.setString(1, tokenId);
            insert.setInt(2, vehicleId);
            insert.setInt(3, customerId);
            insert.setString(4, slot);
            insert.setString(5, entryTime);
            insert.setString(6, exitTime);
            insert.setString(7, status);
            insert.setDouble(8, dailyRate);
            insert.setInt(9, durationDays);
            insert.setDouble(10, totalAmount);
            insert.setString(11, timestamp);
            insert.setString(12, timestamp);
            insert.executeUpdate();
            try (ResultSet keys = insert.getGeneratedKeys()) {
                if (keys.next()) return keys.getInt(1);
            }
        }
        throw new SQLException("Failed to create parking record: " + tokenId);
    }

    private static void insertPayment(Connection conn, int recordId, double amount, String method, String status,
                                     String txnId, String paidAt, String timestamp) throws SQLException {
        String sql = """
            INSERT INTO payments (parking_record_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """;
        try (PreparedStatement insert = conn.prepareStatement(sql)) {
            insert.setInt(1, recordId);
            insert.setDouble(2, amount);
            insert.setString(3, method);
            insert.setString(4, status);
            insert.setString(5, txnId);
            insert.setString(6, paidAt);
            insert.setString(7, timestamp);
            insert.executeUpdate();
        }
    }
}
