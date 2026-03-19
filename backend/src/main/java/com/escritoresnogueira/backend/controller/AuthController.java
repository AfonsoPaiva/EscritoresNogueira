package com.escritoresnogueira.backend.controller;

import com.google.firebase.auth.FirebaseAuth;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.escritoresnogueira.backend.dto.AuthResponse;
import com.escritoresnogueira.backend.dto.FirebaseAuthRequest;
import com.escritoresnogueira.backend.dto.FirebaseConfigDTO;
import com.escritoresnogueira.backend.dto.RegisterRequest;
import com.escritoresnogueira.backend.dto.SendNewsletterRequest;
import com.escritoresnogueira.backend.dto.SessionResponse;
import com.escritoresnogueira.backend.dto.SubscribeNewsletterRequest;
import com.escritoresnogueira.backend.dto.UnsubscribeNewsletterRequest;
import com.escritoresnogueira.backend.service.AuthService;
import com.escritoresnogueira.backend.service.NewsletterService;
import com.escritoresnogueira.backend.service.ReCaptchaService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final ReCaptchaService reCaptchaService;
    private final NewsletterService newsletterService;
    // Simple in-memory rate limiter: key -> counter + window start
    private final java.util.concurrent.ConcurrentHashMap<String, RateLimitInfo> rateLimits = new java.util.concurrent.ConcurrentHashMap<>();
    private static final long RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000L; // 1 hour
    private static final int RATE_LIMIT_MAX = 5; // max requests per window per key

    @Value("${firebase.web.api-key}")
    private String firebaseApiKey;

    @Value("${firebase.web.auth-domain}")
    private String firebaseAuthDomain;

    @Value("${firebase.project-id}")
    private String firebaseProjectId;

    @Value("${firebase.web.storage-bucket:}")
    private String firebaseStorageBucket;

    @Value("${firebase.web.messaging-sender-id:}")
    private String firebaseMessagingSenderId;

    @Value("${firebase.web.app-id:}")
    private String firebaseAppId;

    @Value("${recaptcha.site-key}")
    private String recaptchaSiteKey;

    @Value("${APP_ADMIN_FIREBASE_UID:}")
    private String adminFirebaseUid;

    @Value("${APP_ADMIN_JWT_SECRET:}")
    private String adminJwtSecret;

    @Value("${APP_ADMIN_JWT_EXP:14400}")
    private long adminJwtExp;

    /**
     * Get reCAPTCHA configuration for web
     */
    @GetMapping("/recaptcha-config")
    public ResponseEntity<Map<String, String>> getRecaptchaConfig() {
        log.debug("📱 Returning reCAPTCHA configuration");
        
        Map<String, String> config = Map.of(
            "siteKey", recaptchaSiteKey
        );
        
        return ResponseEntity.ok(config);
    }
    @GetMapping("/firebase-config")
    public ResponseEntity<FirebaseConfigDTO> getFirebaseConfig() {
        log.debug("📱 Returning Firebase web configuration");
        
        FirebaseConfigDTO config = FirebaseConfigDTO.builder()
            .apiKey(firebaseApiKey)
            .authDomain(firebaseAuthDomain)
            .projectId(firebaseProjectId)
            .storageBucket(firebaseStorageBucket)
            .messagingSenderId(firebaseMessagingSenderId)
            .appId(firebaseAppId)
            .build();
        
        return ResponseEntity.ok(config);
    }

    /**
     * Authenticate user with Firebase ID token
     * Works for both email/password and Google Sign-In
     * Returns a secure session token instead of sensitive data
     */
    @PostMapping("/firebase")
    public ResponseEntity<?> authenticateWithFirebase(
            @RequestBody FirebaseAuthRequest request,
            HttpServletRequest httpRequest) {
        try {
            log.info("🔐 Autenticando usuário com Firebase token");
            
            String ipAddress = getClientIp(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            
            SessionResponse response = authService.authenticateWithFirebaseAndCreateSession(
                request.getIdToken(), 
                ipAddress, 
                userAgent
            );
            
            log.info("✅ Sessão segura criada para usuário");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Erro na autenticação Firebase: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", true,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Authenticate admin with Firebase ID token and require UID match with configured admin UID
     */
    @PostMapping("/firebase-admin")
    public ResponseEntity<?> authenticateAdminWithFirebase(
            @RequestBody FirebaseAuthRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        try {
            if (request == null || request.getIdToken() == null || request.getIdToken().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", true,
                        "message", "idToken obrigatório"
                ));
            }
            if (adminFirebaseUid == null || adminFirebaseUid.isBlank()) {
                log.warn("❌ APP_ADMIN_FIREBASE_UID não configurado");
                return ResponseEntity.status(500).body(Map.of(
                        "error", true,
                        "message", "Admin UID não configurado no servidor"
                ));
            }

            String tokenUid = FirebaseAuth.getInstance().verifyIdToken(request.getIdToken()).getUid();
            if (!adminFirebaseUid.equals(tokenUid)) {
                log.warn("❌ Tentativa de login admin com UID não autorizado: {}", tokenUid);
                return ResponseEntity.status(403).body(Map.of(
                        "error", true,
                        "message", "Acesso não autorizado para este utilizador"
                ));
            }

            String ipAddress = getClientIp(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            SessionResponse response = authService.authenticateWithFirebaseAndCreateSession(
                    request.getIdToken(),
                    ipAddress,
                    userAgent
            );

                if (adminJwtSecret == null || adminJwtSecret.isBlank()) {
                log.warn("❌ APP_ADMIN_JWT_SECRET não configurado");
                return ResponseEntity.status(500).body(Map.of(
                    "error", true,
                    "message", "Admin JWT secret não configurado no servidor"
                ));
                }

                Key key = Keys.hmacShaKeyFor(adminJwtSecret.getBytes(StandardCharsets.UTF_8));
                Instant now = Instant.now();
                Date iat = Date.from(now);
                Date exp = Date.from(now.plusSeconds(adminJwtExp));
                String jws = Jwts.builder()
                    .setSubject("admin")
                    .setIssuedAt(iat)
                    .setExpiration(exp)
                    .claim("role", "ROLE_ADMIN")
                    .signWith(key, SignatureAlgorithm.HS256)
                    .compact();

                boolean isSecure = httpRequest.isSecure() || "https".equalsIgnoreCase(httpRequest.getHeader("X-Forwarded-Proto"));
                StringBuilder cookieHeader = new StringBuilder();
                cookieHeader.append("ADMIN_AUTH").append("=").append(jws)
                    .append("; HttpOnly; Path=/; Max-Age=").append((int) adminJwtExp)
                    .append("; SameSite=Strict");
                if (isSecure) cookieHeader.append("; Secure");
                httpResponse.addHeader("Set-Cookie", cookieHeader.toString());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Erro na autenticação admin Firebase: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "error", true,
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Helper to extract client IP from request
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Register a new user with email and password
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        try {
            log.info("📝 Registando novo usuário");

            // Verify reCAPTCHA (detailed: supports v3 score and v2/invisible tokens)
            String clientIp = getClientIp(httpRequest);
            ReCaptchaService.VerificationResult rc = reCaptchaService.verifyTokenDetailed(request.getRecaptchaToken(), clientIp);
            if (rc == null || rc.success == null || !rc.success) {
                log.warn("❌ reCAPTCHA verification failed for registration (result={})", rc);
                return ResponseEntity.badRequest().body(Map.of(
                    "error", true,
                    "message", "Verificação reCAPTCHA falhou. Tente novamente."
                ));
            }

            // If we received a v3 score and it's below threshold, require invisible challenge
            if (rc.score != null) {
                double threshold = 0.5; // adjust based on tuning
                if (rc.score < threshold && (request.getChallenge() == null || !request.getChallenge())) {
                    log.info("Low reCAPTCHA v3 score ({}). Asking client to run invisible challenge.", rc.score);
                    return ResponseEntity.status(400).body(Map.of("challengeRequired", true));
                }
            }

            // Require client to send Firebase ID token (do not accept passwords)
            if (request.getIdToken() == null || request.getIdToken().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", true, "message", "idToken obrigatório"));
            }

            AuthResponse response = authService.registerUserWithIdToken(request.getIdToken(), request.getName());
            log.info("✅ Usuário registado localmente");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Erro no registo: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", true,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Delete user account and data
     * Requires Firebase ID Token for verification
     */
    @DeleteMapping("/user")
    public ResponseEntity<?> deleteUser(@RequestBody FirebaseAuthRequest request) {
        try {
            log.info("🗑️ Solicitando exclusão de conta");
            
            // Verify token first to get UID
            AuthResponse auth = authService.authenticateWithFirebase(request.getIdToken());
            String uid = auth.getUser().getAuthProviderId();
            
            authService.deleteUser(uid);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Conta e dados eliminados com sucesso"
            ));
        } catch (Exception e) {
            log.error("❌ Erro ao eliminar conta: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", true,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Health check for auth endpoints
     */
    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "ok",
            "service", "auth"
        ));
    }
@PostMapping("/resend-verification")
public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> body) {
    try {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", true, "message", "Email obrigatório"));
        }
        String key = buildRateLimitKey(email);
        if (!isAllowedByRateLimit(key)) {
            log.warn("Rate limited resendVerification for key={}", key);
            // Don't reveal to client - return generic success
            return ResponseEntity.ok(Map.of("success", true, "message", "Se a conta existir, enviámos um email de verificação"));
        }

        boolean ok = authService.sendVerificationEmail(email);
        if (!ok) {
            log.warn("Failed to send verification email for {} (internal).", email);
        }
        // Always return a generic message to avoid user enumeration
        return ResponseEntity.ok(Map.of("success", true, "message", "Se a conta existir, enviámos um email de verificação"));
    } catch (Exception e) {
        log.error("❌ Erro ao reenviar verificação: {}", e.getMessage(), e);
        return ResponseEntity.ok(Map.of("success", true, "message", "Se a conta existir, enviámos um email de verificação"));
    }
}

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            if (email == null || email.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", true, "message", "Email obrigatório"));
            }
            String key = buildRateLimitKey(email);
            if (!isAllowedByRateLimit(key)) {
                log.warn("Rate limited forgotPassword for key={}", key);
                return ResponseEntity.ok(Map.of("success", true, "message", "Se a conta existir, enviámos um email para repor a password"));
            }

            // Only attempt to send reset email if the account exists locally.
            if (!authService.userExists(email)) {
                log.warn("Forgot-password requested for non-existent email {} - skipping send", email);
                return ResponseEntity.ok(Map.of("success", true, "message", "Se a conta existir, enviámos um email para repor a password"));
            }

            boolean ok = authService.sendPasswordResetEmail(email);
            if (!ok) {
                log.warn("Failed to send password reset email for {} (internal).", email);
            }
            // Always return a generic message to avoid user enumeration
            return ResponseEntity.ok(Map.of("success", true, "message", "Se a conta existir, enviámos um email para repor a password"));
        } catch (Exception e) {
            log.error("❌ Erro ao enviar reposição de password: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of("success", true, "message", "Se a conta existir, enviámos um email para repor a password"));
        }
    }

    private String buildRateLimitKey(String email) {
        // Key by email (lower-case) - could also include IP if desired
        return email.trim().toLowerCase();
    }

    private boolean isAllowedByRateLimit(String key) {
        long now = System.currentTimeMillis();
        rateLimits.compute(key, (k, info) -> {
            if (info == null || now - info.windowStartMs > RATE_LIMIT_WINDOW_MS) {
                return new RateLimitInfo(1, now);
            }
            info.count++;
            return info;
        });
        RateLimitInfo current = rateLimits.get(key);
        return current.count <= RATE_LIMIT_MAX;
    }

    private static class RateLimitInfo {
        volatile int count;
        final long windowStartMs;

        RateLimitInfo(int count, long windowStartMs) {
            this.count = count;
            this.windowStartMs = windowStartMs;
        }
    }

    @PostMapping("/subscribe-newsletter")
    public ResponseEntity<?> subscribeNewsletter(@RequestBody SubscribeNewsletterRequest request) {
        try {
            // Verify reCAPTCHA token (supports v3 with score and v2/invisible tokens)
            String clientIp = ""; // best-effort; can't access HttpServletRequest here directly
            try {
                // attempt to get IP from RequestContextHolder if available
                jakarta.servlet.http.HttpServletRequest httpReq = ((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.currentRequestAttributes()).getRequest();
                clientIp = getClientIp(httpReq);
            } catch (Exception e) {
                // ignore - IP remains empty
            }

            ReCaptchaService.VerificationResult rc = reCaptchaService.verifyTokenDetailed(request.getRecaptchaToken(), clientIp);
            if (rc == null || rc.success == null || !rc.success) {
                return ResponseEntity.badRequest().body(Map.of("error", true, "message", "Verificação reCAPTCHA falhou. Tente novamente."));
            }

            if (rc.score != null) {
                double threshold = 0.5;
                if (rc.score < threshold && (request.getChallenge() == null || !request.getChallenge())) {
                    return ResponseEntity.status(400).body(Map.of("challengeRequired", true));
                }
            }
            // If already subscribed, return a friendly notice so frontend can show an informative message
            if (newsletterService.isSubscribed(request.getEmail())) {
                log.info("Subscribe attempted but already subscribed: {}", request.getEmail());
                return ResponseEntity.ok(Map.of("message", "Já está inscrito na newsletter", "alreadySubscribed", true));
            }

            newsletterService.subscribe(request.getEmail(), request.getName());
            return ResponseEntity.ok(Map.of("message", "Inscrito na newsletter com sucesso", "alreadySubscribed", false));
        } catch (Exception e) {
            log.error("Erro ao inscrever na newsletter: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", true, "message", "Erro ao inscrever"));
        }
    }

    @PostMapping("/unsubscribe-newsletter")
    public ResponseEntity<?> unsubscribeNewsletter(@RequestBody UnsubscribeNewsletterRequest request) {
        try {
            boolean success = newsletterService.unsubscribe(request.getEmail());
            if (success) {
                return ResponseEntity.ok(Map.of("message", "Cancelada a inscrição na newsletter"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", true, "message", "Email não encontrado na newsletter"));
            }
        } catch (Exception e) {
            log.error("Erro ao cancelar inscrição: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", true, "message", "Erro ao cancelar"));
        }
    }

    @GetMapping("/unsubscribe-newsletter")
    public ResponseEntity<?> unsubscribeNewsletterGet(@RequestParam(required = false) String email,
                                                     @RequestParam(required = false) String token) {
        try {
            boolean success;
            if (token != null) {
                // Unsubscribe via token (from newsletter emails)
                success = newsletterService.unsubscribeByToken(token);
            } else if (email != null) {
                // Unsubscribe via email (legacy support)
                authService.unsubscribeNewsletter(email);
                success = true;
            } else {
                return ResponseEntity.badRequest().body("Parâmetro email ou token é obrigatório");
            }

            if (success) {
                return ResponseEntity.ok("Inscrição cancelada com sucesso. <a href='/'>Voltar ao site</a>");
            } else {
                return ResponseEntity.badRequest().body("Email não encontrado na newsletter");
            }
        } catch (Exception e) {
            log.error("Erro ao cancelar inscrição: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Erro ao cancelar inscrição");
        }
    }

    @PostMapping("/send-newsletter")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> sendNewsletter(@RequestBody SendNewsletterRequest request) {
        try {
            authService.sendNewsletterToAll(request.getSubject(), request.getContent());
            return ResponseEntity.ok(Map.of("message", "Newsletter enviada com sucesso"));
        } catch (Exception e) {
            log.error("Erro ao enviar newsletter: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", true, "message", "Erro ao enviar"));
        }
    }
}


