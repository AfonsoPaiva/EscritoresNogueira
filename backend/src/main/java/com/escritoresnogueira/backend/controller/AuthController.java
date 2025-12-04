package main.java.com.escritoresnogueira.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import main.java.com.escritoresnogueira.backend.dto.AuthResponse;
import main.java.com.escritoresnogueira.backend.dto.FirebaseAuthRequest;
import main.java.com.escritoresnogueira.backend.dto.FirebaseConfigDTO;
import main.java.com.escritoresnogueira.backend.dto.RegisterRequest;
import main.java.com.escritoresnogueira.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

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

    /**
     * Get Firebase configuration for web SDK
     * This is safe to expose - it's the same config you'd put in your frontend
     */
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
     */
    @PostMapping("/firebase")
    public ResponseEntity<?> authenticateWithFirebase(@RequestBody FirebaseAuthRequest request) {
        try {
            log.info("🔐 Autenticando usuário com Firebase token");
            AuthResponse response = authService.authenticateWithFirebase(request.getIdToken());
            log.info("✅ Usuário autenticado: {}", response.getEmail());
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
     * Register a new user with email and password
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest request) {
        try {
            log.info("📝 Registando novo usuário: {}", request.getEmail());
            AuthResponse response = authService.registerUser(request);
            log.info("✅ Usuário registado: {}", response.getEmail());
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
}
