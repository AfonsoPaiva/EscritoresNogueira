package com.escritoresnogueira.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.escritoresnogueira.backend.service.EmailService;
import com.escritoresnogueira.backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/debug")
@RequiredArgsConstructor
@Slf4j
public class DebugController {

    private final EmailService emailService;
    private final AuthService authService;

    /**
     * Quick diagnostic endpoint to test Mailgun send. Call with JSON {"to":"you@domain.com"}
     * Note: This endpoint is intended for development/testing only.
     */
    @PostMapping("/mailgun-test")
    public ResponseEntity<?> mailgunTest(@RequestBody Map<String,String> body) {
        String to = body.get("to");
        if (to == null || to.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "missing to"));
        String result = emailService.sendTestMailgun(to);
        log.info("Mailgun test result for {}: {}", to, result);
        return ResponseEntity.ok(Map.of("result", result));
    }

    @PostMapping("/firebase-reset-test")
    public ResponseEntity<?> firebaseResetTest(@RequestBody Map<String,String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "missing email"));
        try {
            String link = authService.generatePasswordResetLinkForDebug(email);
            // Return the link for debugging. Only use in development.
            return ResponseEntity.ok(Map.of("link", link));
        } catch (Exception e) {
            log.error("Firebase reset test failed for {}: {}", email, e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "failed", "message", e.getMessage()));
        }
    }
}


