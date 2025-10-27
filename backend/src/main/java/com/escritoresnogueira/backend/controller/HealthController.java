package main.java.com.escritoresnogueira.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @Value("${spring.application.name}")
    private String applicationName;

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> root(HttpServletRequest request) {
        String scheme = request.getScheme();
        String host = request.getServerName();
        int port = request.getServerPort();
        String ctx = request.getContextPath();

        String base = scheme + "://" + host + ":" + port + ctx;

        Map<String, Object> response = new HashMap<>();
        response.put("application", "Escritores Nogueira Backend API");
        response.put("version", "1.0.0");
        response.put("status", "🚀 Backend está online!");
        response.put("timestamp", LocalDateTime.now());
        response.put("health", base + "/actuator/health");

        Map<String, String> endpoints = new HashMap<>();
        endpoints.put("books", base + "/books");
        endpoints.put("featured", base + "/books/featured");
        endpoints.put("categories", base + "/categories");
        endpoints.put("blog", base + "/blog");

        response.put("endpoints", endpoints);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("application", applicationName);
        response.put("timestamp", LocalDateTime.now());
        response.put("message", "✅ API em funcionamento!");

        return ResponseEntity.ok(response);
    }
}