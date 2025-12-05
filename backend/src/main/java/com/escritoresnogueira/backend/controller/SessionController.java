package main.java.com.escritoresnogueira.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import main.java.com.escritoresnogueira.backend.dto.SessionDataResponse;
import main.java.com.escritoresnogueira.backend.service.UserSessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/session")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SessionController {

    private final UserSessionService sessionService;
    
    private static final String SESSION_HEADER = "X-Session-Token";

    /**
     * Get current session data (display name, photo URL)
     * This endpoint only returns non-sensitive profile data
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentSession(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken) {
        
        if (sessionToken == null || sessionToken.isBlank()) {
            return ResponseEntity.ok(SessionDataResponse.builder()
                    .valid(false)
                    .build());
        }
        
        return sessionService.getSessionData(sessionToken)
                .map(data -> ResponseEntity.ok(SessionDataResponse.builder()
                        .displayName(data.displayName())
                        .email(data.email())
                        .photoUrl(data.photoUrl())
                        .expiresAt(data.expiresAt())
                        .valid(true)
                        .build()))
                .orElseGet(() -> ResponseEntity.ok(SessionDataResponse.builder()
                        .valid(false)
                        .build()));
    }

    /**
     * Validate if a session token is still valid
     */
    @GetMapping("/validate")
    public ResponseEntity<?> validateSession(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken) {
        
        if (sessionToken == null || sessionToken.isBlank()) {
            return ResponseEntity.ok(Map.of("valid", false));
        }
        
        boolean isValid = sessionService.validateSession(sessionToken).isPresent();
        return ResponseEntity.ok(Map.of("valid", isValid));
    }

    /**
     * Logout - invalidate current session
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken) {
        
        if (sessionToken != null && !sessionToken.isBlank()) {
            sessionService.invalidateSession(sessionToken);
            log.info("🔒 Session invalidated via logout");
        }
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Sessão terminada com sucesso"
        ));
    }

    /**
     * Logout from all devices
     */
    @PostMapping("/logout-all")
    public ResponseEntity<?> logoutAll(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken,
            @RequestBody(required = false) Map<String, String> body) {
        
        // First try to get firebaseUid from body
        String firebaseUid = body != null ? body.get("firebaseUid") : null;
        
        // If not in body, get from current session
        if ((firebaseUid == null || firebaseUid.isBlank()) && sessionToken != null) {
            firebaseUid = sessionService.validateSession(sessionToken)
                    .map(session -> session.getFirebaseUid())
                    .orElse(null);
        }
        
        if (firebaseUid != null && !firebaseUid.isBlank()) {
            sessionService.invalidateAllUserSessions(firebaseUid);
            log.info("🔒 All sessions invalidated for user");
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Todas as sessões foram terminadas"
            ));
        }
        
        return ResponseEntity.badRequest().body(Map.of(
                "error", true,
                "message", "Sessão não encontrada"
        ));
    }

    /**
     * Extend session expiration (keep me logged in)
     */
    @PostMapping("/extend")
    public ResponseEntity<?> extendSession(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken,
            @RequestParam(defaultValue = "168") int hours) { // Default 7 days
        
        if (sessionToken == null || sessionToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", true,
                    "message", "Token de sessão não fornecido"
            ));
        }
        
        // Limit extension to max 30 days
        int maxHours = Math.min(hours, 720);
        sessionService.extendSession(sessionToken, maxHours);
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Sessão estendida com sucesso",
                "hoursExtended", maxHours
        ));
    }

    /**
     * Helper to extract client IP from request
     */
    public static String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
