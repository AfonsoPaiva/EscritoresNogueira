package com.escritoresnogueira.backend.controller;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/admin/api")
public class AdminAuthController {

    @Value("${APP_ADMIN_USER:admin}")
    private String adminUser;

    @Value("${APP_ADMIN_PASS:password}")
    private String adminPass;

    @Value("${APP_ADMIN_JWT_SECRET:}")
    private String jwtSecret;

    // lifetime in seconds
    @Value("${APP_ADMIN_JWT_EXP:14400}")
    private long jwtExp;

    private static final String COOKIE_NAME = "ADMIN_AUTH";

    record LoginRequest(String user, String pass) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
        String user = req.user();
        String pass = req.pass();

        if (!StringUtils.hasText(user) || !StringUtils.hasText(pass)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing credentials"));
        }

        // constant-time compare
        boolean userOk = MessageDigestUtils.constantTimeEquals(adminUser, user);
        boolean passOk = MessageDigestUtils.constantTimeEquals(adminPass, pass);

        if (!userOk || !passOk) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        if (jwtSecret == null || jwtSecret.isBlank()) {
            log.warn("APP_ADMIN_JWT_SECRET not configured; login disabled");
            return ResponseEntity.status(500).body(Map.of("error", "Server not configured for admin login"));
        }

        Key key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        Date iat = Date.from(now);
        Date exp = Date.from(now.plusSeconds(jwtExp));

        String jws = Jwts.builder()
                .setSubject("admin")
                .setIssuedAt(iat)
                .setExpiration(exp)
                .claim("role", "ROLE_ADMIN")
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();

        boolean isSecure = request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));

        // Build a Set-Cookie header that includes SameSite for stronger CSRF protection
        StringBuilder cookieHeader = new StringBuilder();
        cookieHeader.append(COOKIE_NAME).append("=").append(jws)
            .append("; HttpOnly; Path=/; Max-Age=").append((int) jwtExp)
            .append("; SameSite=Strict");
        if (isSecure) cookieHeader.append("; Secure");

        // Use header to ensure SameSite attribute is present across servlet containers
        response.addHeader("Set-Cookie", cookieHeader.toString());

        return ResponseEntity.ok(Map.of("status", "ok"));
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
