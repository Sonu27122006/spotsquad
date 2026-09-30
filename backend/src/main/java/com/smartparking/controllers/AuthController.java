package com.smartparking.controllers;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.smartparking.database.Database;
import com.smartparking.util.HttpUtils;
import com.smartparking.util.PasswordUtils;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.UUID;

public class AuthController implements HttpHandler {
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
            if ("/api/auth/login".equals(path) && "POST".equalsIgnoreCase(method)) {
                handleAdminLogin(exchange);
            } else if ("/api/auth/register".equals(path) && "POST".equalsIgnoreCase(method)) {
                handleRegister(exchange);
            } else if ("/api/auth/forgot-password".equals(path) && "POST".equalsIgnoreCase(method)) {
                handleForgotPassword(exchange);
            } else if ("/api/auth/reset-password".equals(path) && "POST".equalsIgnoreCase(method)) {
                handleResetPassword(exchange);
            } else {
                HttpUtils.sendError(exchange, 404, "Endpoint not found: " + path);
            }
        } catch (Exception e) {
            HttpUtils.sendError(exchange, 500, "Internal Server Error: " + e.getMessage());
        }
    }

    private void handleAdminLogin(HttpExchange exchange) throws IOException {
        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = gson.fromJson(body, JsonObject.class);

        if (json == null || (!json.has("username") && !json.has("email")) || !json.has("password")) {
            HttpUtils.sendError(exchange, 400, "Username/Email and Password are required.");
            return;
        }

        String usernameOrEmail = json.has("username") ? json.get("username").getAsString().trim() : json.get("email").getAsString().trim();
        String plainPassword = json.get("password").getAsString();

        String sql = "SELECT id, username, email, password_hash, salt, name FROM admins WHERE username = ? OR email = ? LIMIT 1";

        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, usernameOrEmail);
            stmt.setString(2, usernameOrEmail);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    String storedHash = rs.getString("password_hash");
                    String salt = rs.getString("salt");

                    if (PasswordUtils.verifyPassword(plainPassword, storedHash, salt)) {
                        JsonObject user = new JsonObject();
                        user.addProperty("id", rs.getInt("id"));
                        user.addProperty("username", rs.getString("username"));
                        user.addProperty("email", rs.getString("email"));
                        user.addProperty("name", rs.getString("name"));
                        user.addProperty("role", "ADMIN");
                        user.addProperty("token", "jwt_admin_" + UUID.randomUUID());

                        JsonObject res = new JsonObject();
                        res.addProperty("success", true);
                        res.addProperty("message", "Admin authentication successful.");
                        res.add("data", user);

                        HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
                        return;
                    }
                }
            }
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
            return;
        }

        HttpUtils.sendError(exchange, 401, "Invalid administrator credentials.");
    }

    private void handleForgotPassword(HttpExchange exchange) throws IOException {
        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = gson.fromJson(body, JsonObject.class);

        if (json == null || (!json.has("email") && !json.has("username"))) {
            HttpUtils.sendError(exchange, 400, "Email or Username is required.");
            return;
        }

        String identifier = json.has("email") ? json.get("email").getAsString().trim() : json.get("username").getAsString().trim();
        String sql = "SELECT id, email, name FROM admins WHERE email = ? OR username = ? LIMIT 1";

        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, identifier);
            stmt.setString(2, identifier);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    int adminId = rs.getInt("id");
                    String resetToken = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                    String expiresAt = LocalDateTime.now().plusHours(1).toString();

                    try (PreparedStatement insertToken = conn.prepareStatement(
                            "INSERT INTO forgot_password_tokens (admin_id, token, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)")) {
                        insertToken.setInt(1, adminId);
                        insertToken.setString(2, resetToken);
                        insertToken.setString(3, expiresAt);
                        insertToken.setString(4, LocalDateTime.now().toString());
                        insertToken.executeUpdate();
                    }

                    JsonObject res = new JsonObject();
                    res.addProperty("success", true);
                    res.addProperty("message", "Password reset token generated successfully.");
                    res.addProperty("resetToken", resetToken); // Returned for instant demo testing
                    res.addProperty("instructions", "Enter the 8-character verification token along with your new password.");

                    HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
                    return;
                }
            }
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
            return;
        }

        HttpUtils.sendError(exchange, 404, "No administrator account found with that email/username.");
    }

    private void handleResetPassword(HttpExchange exchange) throws IOException {
        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = gson.fromJson(body, JsonObject.class);

        if (json == null || !json.has("token") || !json.has("newPassword")) {
            HttpUtils.sendError(exchange, 400, "Reset token and new password are required.");
            return;
        }

        String token = json.get("token").getAsString().trim();
        String newPassword = json.get("newPassword").getAsString();

        if (newPassword.length() < 6) {
            HttpUtils.sendError(exchange, 400, "New password must be at least 6 characters long.");
            return;
        }

        String verifySql = "SELECT id, admin_id, expires_at, used FROM forgot_password_tokens WHERE token = ? AND used = 0 LIMIT 1";

        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(verifySql)) {
            stmt.setString(1, token);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    int tokenId = rs.getInt("id");
                    int adminId = rs.getInt("admin_id");

                    // Generate new salt and hash
                    String salt = PasswordUtils.generateSalt();
                    String newHash = PasswordUtils.hashPassword(newPassword, salt);

                    // Update admin password
                    try (PreparedStatement updateAdmin = conn.prepareStatement(
                            "UPDATE admins SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?")) {
                        updateAdmin.setString(1, newHash);
                        updateAdmin.setString(2, salt);
                        updateAdmin.setString(3, LocalDateTime.now().toString());
                        updateAdmin.setInt(4, adminId);
                        updateAdmin.executeUpdate();
                    }

                    // Mark token as used
                    try (PreparedStatement markUsed = conn.prepareStatement(
                            "UPDATE forgot_password_tokens SET used = 1 WHERE id = ?")) {
                        markUsed.setInt(1, tokenId);
                        markUsed.executeUpdate();
                    }

                    JsonObject res = new JsonObject();
                    res.addProperty("success", true);
                    res.addProperty("message", "Password updated successfully. You can now login with your new password.");

                    HttpUtils.sendResponse(exchange, 200, gson.toJson(res));
                    return;
                }
            }
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
            return;
        }

        HttpUtils.sendError(exchange, 400, "Invalid or expired reset token.");
    }

    private void handleRegister(HttpExchange exchange) throws IOException {
        String body = HttpUtils.getRequestBody(exchange);
        JsonObject json = gson.fromJson(body, JsonObject.class);

        if (json == null || !json.has("name") || !json.has("username") || !json.has("email") || !json.has("password")) {
            HttpUtils.sendError(exchange, 400, "Full Name, Username, Email, and Password are required.");
            return;
        }

        String name = json.get("name").getAsString().trim();
        String username = json.get("username").getAsString().trim().toLowerCase();
        String email = json.get("email").getAsString().trim().toLowerCase();
        String password = json.get("password").getAsString();
        String standName = json.has("standName") ? json.get("standName").getAsString().trim() : "";

        if (name.length() < 2) {
            HttpUtils.sendError(exchange, 400, "Full Name must be at least 2 characters long.");
            return;
        }
        if (username.length() < 3) {
            HttpUtils.sendError(exchange, 400, "Username must be at least 3 characters long.");
            return;
        }
        if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            HttpUtils.sendError(exchange, 400, "Please provide a valid email address.");
            return;
        }
        if (password.length() < 6) {
            HttpUtils.sendError(exchange, 400, "Password must be at least 6 characters long.");
            return;
        }

        try (Connection conn = Database.getConnection()) {
            // Check if username or email already exists
            try (PreparedStatement check = conn.prepareStatement(
                    "SELECT username, email FROM admins WHERE username = ? OR email = ? LIMIT 1")) {
                check.setString(1, username);
                check.setString(2, email);
                try (ResultSet rs = check.executeQuery()) {
                    if (rs.next()) {
                        String existingUsername = rs.getString("username");
                        if (username.equalsIgnoreCase(existingUsername)) {
                            HttpUtils.sendError(exchange, 409, "Username '" + username + "' is already taken. Please choose another.");
                        } else {
                            HttpUtils.sendError(exchange, 409, "An account with email '" + email + "' already exists.");
                        }
                        return;
                    }
                }
            }

            // Generate salt & hash password
            String salt = PasswordUtils.generateSalt();
            String passwordHash = PasswordUtils.hashPassword(password, salt);
            String now = LocalDateTime.now().toString();

            int newAdminId = 0;
            try (PreparedStatement insert = conn.prepareStatement(
                    "INSERT INTO admins (username, email, password_hash, salt, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS)) {
                insert.setString(1, username);
                insert.setString(2, email);
                insert.setString(3, passwordHash);
                insert.setString(4, salt);
                insert.setString(5, name);
                insert.setString(6, now);
                insert.setString(7, now);
                insert.executeUpdate();

                try (ResultSet generatedKeys = insert.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        newAdminId = generatedKeys.getInt(1);
                    }
                }
            }

            // If stand name was provided, update parking_name in settings
            if (!standName.isEmpty()) {
                try (PreparedStatement updateSetting = conn.prepareStatement(
                        "UPDATE settings SET setting_value = ?, updated_at = ? WHERE setting_key = 'parking_name'")) {
                    updateSetting.setString(1, standName);
                    updateSetting.setString(2, now);
                    updateSetting.executeUpdate();
                } catch (Exception ignored) {}
            }

            // Build user response object
            JsonObject user = new JsonObject();
            user.addProperty("id", newAdminId);
            user.addProperty("username", username);
            user.addProperty("email", email);
            user.addProperty("name", name);
            user.addProperty("role", "ADMIN");
            user.addProperty("standName", standName);
            user.addProperty("token", "jwt_admin_" + UUID.randomUUID());

            JsonObject res = new JsonObject();
            res.addProperty("success", true);
            res.addProperty("message", "Stand Owner account registered successfully.");
            res.add("data", user);

            HttpUtils.sendResponse(exchange, 201, gson.toJson(res));

        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }
}
