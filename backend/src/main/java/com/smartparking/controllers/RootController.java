package com.smartparking.controllers;

import com.smartparking.util.HttpUtils;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class RootController implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpUtils.handlePreflight(exchange)) return;

        Map<String, Object> status = new HashMap<>();
        status.put("name", "Smart Bus Stand Two-Wheeler Parking System API");
        status.put("status", "ONLINE");
        status.put("version", "1.0.0");
        status.put("frontendUrl", "http://localhost:5173");
        status.put("message", "Backend is active. Open http://localhost:5173 in your browser to view the Operator Dashboard.");

        String[] endpoints = {
                "/api/dashboard/stats",
                "/api/dashboard/recent-activity",
                "/api/parking",
                "/api/parking/active",
                "/api/parking/search?query=TN30AB1234",
                "/api/hardware/latest-detection",
                "/api/hardware/detection (POST)",
                "/api/notifications",
                "/api/settings"
        };
        status.put("availableEndpoints", endpoints);

        HttpUtils.sendSuccess(exchange, status);
    }
}
