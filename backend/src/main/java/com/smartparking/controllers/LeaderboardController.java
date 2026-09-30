package com.smartparking.controllers;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.smartparking.database.Database;
import com.smartparking.models.LeaderboardEntry;
import com.smartparking.util.HttpUtils;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class LeaderboardController implements HttpHandler {
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
            if ("/api/leaderboard".equals(path) && "GET".equalsIgnoreCase(method)) {
                handleGetLeaderboard(exchange);
            } else {
                HttpUtils.sendError(exchange, 404, "Endpoint not found: " + path);
            }
        } catch (Exception e) {
            HttpUtils.sendError(exchange, 500, "Internal Server Error: " + e.getMessage());
        }
    }

    private void handleGetLeaderboard(HttpExchange exchange) throws IOException {
        String typeParam = HttpUtils.getQueryParam(exchange, "type");
        String filterParam = HttpUtils.getQueryParam(exchange, "filter");

        String type = (typeParam != null && !typeParam.isEmpty()) ? typeParam.toLowerCase() : "visits";
        String filter = (filterParam != null && !filterParam.isEmpty()) ? filterParam.toLowerCase() : "all_time";

        String dateFilterClause = "";
        LocalDate now = LocalDate.now();
        String filterDate = "";

        if ("today".equals(filter)) {
            dateFilterClause = "AND (pr.entry_time >= ? OR pr.entry_time LIKE ?)";
            filterDate = now.toString();
        } else if ("this_week".equals(filter)) {
            LocalDate weekAgo = now.minusDays(7);
            dateFilterClause = "AND pr.entry_time >= ?";
            filterDate = weekAgo.toString() + "T00:00:00";
        } else if ("this_month".equals(filter)) {
            LocalDate monthAgo = now.minusDays(30);
            dateFilterClause = "AND pr.entry_time >= ?";
            filterDate = monthAgo.toString() + "T00:00:00";
        }

        String orderByClause;
        if ("revenue".equals(type)) {
            orderByClause = "ORDER BY total_amount_spent DESC, total_visits DESC";
        } else if ("duration".equals(type)) {
            orderByClause = "ORDER BY total_hours DESC, total_visits DESC";
        } else {
            orderByClause = "ORDER BY total_visits DESC, total_amount_spent DESC";
        }

        String sql = String.format("""
            SELECT c.id AS customer_id, c.name AS customer_name, c.mobile_number,
                   COUNT(pr.id) AS total_visits,
                   COALESCE(SUM(pr.total_duration_days * 24), 0) AS total_hours,
                   COALESCE(SUM(pr.total_amount), 0) AS total_amount_spent
            FROM customers c
            JOIN parking_records pr ON pr.customer_id = c.id
            WHERE 1=1 %s
            GROUP BY c.id, c.name, c.mobile_number
            %s
            LIMIT 20
        """, dateFilterClause, orderByClause);

        List<LeaderboardEntry> list = new ArrayList<>();
        try (Connection conn = Database.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            if ("today".equals(filter)) {
                stmt.setString(1, filterDate + "T00:00:00");
                stmt.setString(2, filterDate + "%");
            } else if ("this_week".equals(filter) || "this_month".equals(filter)) {
                stmt.setString(1, filterDate);
            }

            try (ResultSet rs = stmt.executeQuery()) {
                int rank = 1;
                while (rs.next()) {
                    LeaderboardEntry entry = new LeaderboardEntry();
                    entry.setCustomerId(rs.getInt("customer_id"));
                    entry.setCustomerName(rs.getString("customer_name"));
                    entry.setMobileNumber(rs.getString("mobile_number"));
                    entry.setTotalVisits(rs.getInt("total_visits"));
                    entry.setTotalHours(rs.getDouble("total_hours"));
                    entry.setTotalAmountSpent(rs.getDouble("total_amount_spent"));
                    entry.setRank(rank++);
                    list.add(entry);
                }
            }

            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.addProperty("type", type);
            response.addProperty("filter", filter);
            response.addProperty("count", list.size());
            response.add("data", gson.toJsonTree(list));

            HttpUtils.sendResponse(exchange, 200, gson.toJson(response));
        } catch (SQLException e) {
            HttpUtils.sendError(exchange, 500, "Database error: " + e.getMessage());
        }
    }
}
