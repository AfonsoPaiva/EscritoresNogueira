package com.escritoresnogueira.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.escritoresnogueira.backend.model.User;
import com.escritoresnogueira.backend.repository.UserRepository;
import com.escritoresnogueira.backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/admin/users")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;
    private final AuthService authService;

    /**
     * Get all users
     */
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        log.info("📋 Admin: Getting all users");
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    /**
     * Get user by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        log.info("📋 Admin: Getting user by ID: {}", id);
        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok((Object) user))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get user by email
     */
    @GetMapping("/email/{email}")
    public ResponseEntity<?> getUserByEmail(@PathVariable String email) {
        log.info("📋 Admin: Getting user by email: {}", email);
        return userRepository.findByEmail(email)
                .map(user -> ResponseEntity.ok((Object) user))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete user by ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUserById(@PathVariable Long id) {
        log.info("🗑️ Admin: Deleting user by ID: {}", id);
        
        return userRepository.findById(id)
                .map(user -> {
                    try {
                        authService.deleteUser(user.getAuthProviderId());
                        return ResponseEntity.ok(Map.of(
                            "success", true,
                            "message", "Utilizador eliminado com sucesso"
                        ));
                    } catch (Exception e) {
                        log.error("❌ Error deleting user: {}", e.getMessage());
                        return ResponseEntity.internalServerError().body(Map.of(
                            "error", true,
                            "message", "Erro ao eliminar utilizador: " + e.getMessage()
                        ));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Promote user to admin
     */
    @PostMapping("/{id}/promote")
    public ResponseEntity<?> promoteToAdmin(@PathVariable Long id) {
        log.info("👑 Admin: Promoting user to admin: {}", id);
        
        return userRepository.findById(id)
                .map(user -> {
                    try {
                        authService.promoteToAdmin(user.getAuthProviderId());
                        return ResponseEntity.ok(Map.of(
                            "success", true,
                            "message", "Utilizador promovido a administrador"
                        ));
                    } catch (Exception e) {
                        log.error("❌ Error promoting user: {}", e.getMessage());
                        return ResponseEntity.internalServerError().body(Map.of(
                            "error", true,
                            "message", "Erro ao promover utilizador: " + e.getMessage()
                        ));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get user count
     */
    @GetMapping("/count")
    public ResponseEntity<?> getUserCount() {
        long count = userRepository.count();
        return ResponseEntity.ok(Map.of("count", count));
    }
}


