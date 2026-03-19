package com.escritoresnogueira.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/admin/api")
public class AdminAuthController {

    private static final String COOKIE_NAME = "ADMIN_AUTH";

    record LoginRequest(String user, String pass) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
        return ResponseEntity.status(410).body(Map.of(
            "error", "password_login_disabled",
            "message", "Admin login with user/password is disabled. Use Google login only."
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest req, HttpServletResponse resp) {
        boolean isSecure = req.isSecure() || "https".equalsIgnoreCase(req.getHeader("X-Forwarded-Proto"));
        StringBuilder cookieHeader = new StringBuilder();
        cookieHeader.append(COOKIE_NAME).append("=;")
            .append(" HttpOnly; Path=/; Max-Age=0; SameSite=Strict");
        if (isSecure) cookieHeader.append("; Secure");
        resp.addHeader("Set-Cookie", cookieHeader.toString());
        return ResponseEntity.ok(Map.of("status", "logged_out"));
    }
}
