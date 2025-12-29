package com.escritoresnogueira.backend.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.escritoresnogueira.backend.dto.AuthResponse;
import com.escritoresnogueira.backend.dto.NewsletterClientDTO;
import com.escritoresnogueira.backend.dto.RegisterRequest;
import com.escritoresnogueira.backend.dto.SessionResponse;
import com.escritoresnogueira.backend.model.AuthProvider;
import com.escritoresnogueira.backend.model.NewsletterClient;
import com.escritoresnogueira.backend.model.User;
import com.escritoresnogueira.backend.model.UserSession;
import com.escritoresnogueira.backend.repository.NewsletterClientRepository;
import com.escritoresnogueira.backend.repository.UserRepository;
import com.escritoresnogueira.backend.repository.NewsletterMessageRepository;
import com.escritoresnogueira.backend.repository.OrderRepository;
import org.springframework.stereotype.Service;
import com.escritoresnogueira.backend.service.EmailService;

import com.google.firebase.auth.UserRecord;
import com.google.firebase.auth.UserRecord.UpdateRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final NewsletterClientRepository newsletterClientRepository;
    private final NewsletterMessageRepository newsletterMessageRepository;
    private final OrderRepository orderRepository;
    private final UserSessionService sessionService;
    private final EmailService emailService;
    private final NewsletterService newsletterService;
    // In-memory cooldown map for emails not present in DB
    private final ConcurrentHashMap<String, LocalDateTime> resetCooldownMap = new ConcurrentHashMap<>();

    @Value("${auth.reset.cooldown-minutes:1}")
    private long resetCooldownMinutes;
    
    /**
     * Authenticate with Firebase and create a secure server-side session
     */
    public SessionResponse authenticateWithFirebaseAndCreateSession(
            String firebaseIdToken, String ipAddress, String userAgent) {
        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance()
                .verifyIdToken(firebaseIdToken);
            
            String firebaseUid = decodedToken.getUid();
            String email = decodedToken.getEmail();
            String name = decodedToken.getName();
            String photoUrl = decodedToken.getPicture();
            
            AuthProvider provider = detectProvider(decodedToken);

            User user = userRepository.findByAuthProviderId(firebaseUid)
                .orElseGet(() -> {
                    return userRepository.findByEmail(email)
                        .map(existingUser -> {
                            log.info("🔗 Vinculando conta existente ao Firebase: {}", email);
                            existingUser.setAuthProviderId(firebaseUid);
                            existingUser.setAuthProvider(provider);
                            return userRepository.save(existingUser);
                        })
                        .orElseGet(() -> createNewUser(firebaseUid, email, name, photoUrl, provider));
                });
            // Require Firebase email_verified claim
            boolean tokenEmailVerified = Boolean.TRUE.equals(decodedToken.getClaims().get("email_verified"));
            if (tokenEmailVerified) {
            user.setEnabled(true);
            userRepository.save(user);
            log.info("✅ Local user enabled after Firebase verification: {}", user.getEmail());
            } else {
                log.warn("Tentativa de início de sessão com email não verificado no Firebase: {}", email);
                throw new RuntimeException("Email não verificado no provedor. Verifique o seu email antes de iniciar sessão.");
            }
            // (no local verification flag required; rely on Firebase claim)
            
            user.setName(name != null ? name : user.getName());
            user.setPhotoUrl(photoUrl != null ? photoUrl : user.getPhotoUrl());
            
            // Update firstName if not set (for existing users)
            if (name != null && !name.isBlank()) {
                if (user.getFirstName() == null || user.getFirstName().isBlank()) {
                    user.setFirstName(name.trim());
                }
            }
            
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
            
            // Create secure server-side session
            UserSession session = sessionService.createSession(
                user, 
                firebaseUid, 
                user.getName(), 
                user.getPhotoUrl(),
                ipAddress,
                userAgent
            );
            
            log.info("✅ Usuário autenticado com sessão segura: {} ({})", email, provider);

            return SessionResponse.builder()
                .sessionToken(session.getSessionToken())
                .displayName(session.getDisplayName())
                .photoUrl(session.getPhotoUrl())
                .expiresAt(session.getExpiresAt())
                .build();
            
        } catch (FirebaseAuthException e) {
            log.error("❌ Token Firebase inválido: {}", e.getMessage());
            throw new RuntimeException("Token Firebase inválido: " + e.getMessage());
        } catch (Exception e) {
            log.error("❌ Erro na autenticação: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao autenticar usuário: " + e.getMessage());
        }
    }
    
    public AuthResponse authenticateWithFirebase(String firebaseIdToken) {
        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance()
                .verifyIdToken(firebaseIdToken);
            
            String firebaseUid = decodedToken.getUid();
            String email = decodedToken.getEmail();
            String name = decodedToken.getName();
            String photoUrl = decodedToken.getPicture();
            
            AuthProvider provider = detectProvider(decodedToken);

            User user = userRepository.findByAuthProviderId(firebaseUid)
                .orElseGet(() -> {
                    // Se não encontrar pelo ID do Firebase, tenta pelo email
                    return userRepository.findByEmail(email)
                        .map(existingUser -> {
                            // Atualiza o usuário existente com o ID do Firebase
                            log.info("🔗 Vinculando conta existente ao Firebase: {}", email);
                            existingUser.setAuthProviderId(firebaseUid);
                            existingUser.setAuthProvider(provider);
                            return userRepository.save(existingUser);
                        })
                        .orElseGet(() -> createNewUser(firebaseUid, email, name, photoUrl, provider));
                });

            // Require Firebase email_verified claim
            boolean tokenEmailVerified2 = Boolean.TRUE.equals(decodedToken.getClaims().get("email_verified"));
            if (!tokenEmailVerified2) {
                log.warn("Tentativa de autenticação com email não verificado no Firebase: {}", email);
                throw new RuntimeException("Email não verificado no provedor. Verifique o seu email antes de iniciar sessão.");
            }
            // (no local verification flag required; rely on Firebase claim)
            
            user.setName(name != null ? name : user.getName());
            user.setPhotoUrl(photoUrl != null ? photoUrl : user.getPhotoUrl());
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
            
            log.info(" Usuário autenticado: {} ({})", email, provider);

            return AuthResponse.builder()
                .email(user.getEmail())
                .name(user.getName())
                .user(user)
                .build();
            
        } catch (FirebaseAuthException e) {
            log.error(" Token Firebase inválido: {}", e.getMessage());
            throw new RuntimeException("Token inválido ou expirado");
        } catch (Exception e) {
            log.error(" Erro na autenticação: {}", e.getMessage());
            throw new RuntimeException("Erro ao autenticar usuário");
        }
    }
    
    @Deprecated
    public AuthResponse registerUser(RegisterRequest request) {
        throw new UnsupportedOperationException("Password-based registration is deprecated. Use client-side Firebase registration and send the ID token to /auth/register.");
    }

    /**
     * Register a local user record using a Firebase ID token issued by the client.
     * Does NOT accept plaintext passwords. The client must create the Firebase account
     * via the Firebase client SDK and send the ID token here.
     */
    public AuthResponse registerUserWithIdToken(String idToken, String overrideName) {
        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);

            String firebaseUid = decodedToken.getUid();
            String email = decodedToken.getEmail();
            String name = decodedToken.getName();
            String photoUrl = decodedToken.getPicture();

            boolean tokenEmailVerified = Boolean.TRUE.equals(decodedToken.getClaims().get("email_verified"));

            AuthProvider provider = detectProvider(decodedToken);

            User user = userRepository.findByAuthProviderId(firebaseUid)
                .orElseGet(() -> {
                    return userRepository.findByEmail(email)
                        .map(existingUser -> {
                            existingUser.setAuthProviderId(firebaseUid);
                            existingUser.setAuthProvider(provider);
                            return userRepository.save(existingUser);
                        })
                        .orElseGet(() -> {
                            // Create a minimal local user record
                            User u = User.builder()
                                .authProviderId(firebaseUid)
                                .email(email)
                                .name(overrideName != null && !overrideName.isBlank() ? overrideName : (name != null ? name : email.split("@")[0]))
                                .authProvider(provider)
                                .enabled(tokenEmailVerified)
                                .roles(Set.of("ROLE_USER"))
                                .lastLogin(LocalDateTime.now())
                                .build();
                            return userRepository.save(u);
                        });
                });

            // If token indicates verified email, enable local account
            if (tokenEmailVerified && !user.isEnabled()) {
                user.setEnabled(true);
                userRepository.save(user);
            }

            // If email not verified according to Firebase, generate and send verification link via Mailgun
            if (!tokenEmailVerified) {
                try {
                    boolean sent = sendVerificationEmail(email);
                    if (!sent) {
                        log.warn("Verification link could not be sent server-side for {}", email);
                    }
                } catch (Exception e) {
                    log.warn("Exception while sending verification email for {}: {}", email, e.getMessage());
                }
            }

            return AuthResponse.builder()
                .email(user.getEmail())
                .name(user.getName())
                .user(user)
                .build();

        } catch (FirebaseAuthException e) {
            log.error("❌ Token Firebase inválido durante registo: {}", e.getMessage());
            throw new RuntimeException("Token inválido ou expirado");
        } catch (Exception e) {
            log.error("❌ Erro ao registar usuário via idToken: {}", e.getMessage());
            throw new RuntimeException("Erro ao registar usuário");
        }
    }

    /**
     * Generate and attempt to send a verification email. Returns true when the send was attempted
     * (successfully queued or delivered). Returns false when generation or send failed.
     * The method never throws to avoid leaking information to callers.
     */
    public boolean sendVerificationEmail(String email) {
        try {
            com.google.firebase.auth.ActionCodeSettings settings = com.google.firebase.auth.ActionCodeSettings.builder()
                    .setUrl(System.getenv().getOrDefault("FRONTEND_VERIFY_URL", "http://localhost:5500/conta.html"))
                    .setHandleCodeInApp(true)
                    .build();
            String link = FirebaseAuth.getInstance().generateEmailVerificationLink(email, settings);
            emailService.sendVerificationLink(email, link);
            log.info("✅ Verification link generated and sent (server-side) for {}", email);
            return true;
        } catch (Exception e) {
            log.warn("Could not generate/send verification link server-side for {}: {}", email, e.getMessage());
            // Don't propagate - return false so callers can return a generic response
            return false;
        }
    }

    /**
     * Generate and attempt to send a password reset email. Returns true on attempt success,
     * false on failure. Does not throw.
     */
    public boolean sendPasswordResetEmail(String email) {
        String key = email == null ? "" : email.trim().toLowerCase();
        LocalDateTime now = LocalDateTime.now();
        try {
            // Check for a persisted user record first
            Optional<User> optUser = userRepository.findByEmail(key);
            if (optUser.isPresent()) {
                User user = optUser.get();
                LocalDateTime last = user.getLastPasswordResetRequestedAt();
                if (last != null && last.plusMinutes(resetCooldownMinutes).isAfter(now)) {
                    log.warn("Password reset request for {} throttled by DB cooldown; last at {}", key, last);
                    return false;
                }

                // Generate link and send
                String link = FirebaseAuth.getInstance().generatePasswordResetLink(email);
                emailService.sendPasswordResetLink(email, link);
                user.setLastPasswordResetRequestedAt(now);
                userRepository.save(user);
                log.info("✅ Password reset link generated and sent (server-side) for {}", email);
                return true;
            } else {
                // No local user: apply an in-memory cooldown to reduce abuse
                LocalDateTime last = resetCooldownMap.get(key);
                if (last != null && last.plusMinutes(resetCooldownMinutes).isAfter(now)) {
                    log.warn("Password reset request for {} throttled by in-memory cooldown; last at {}", key, last);
                    return false;
                }

                String link = FirebaseAuth.getInstance().generatePasswordResetLink(email);
                emailService.sendPasswordResetLink(email, link);
                resetCooldownMap.put(key, now);
                log.info("✅ Password reset link generated and sent (server-side, ephemeral) for {}", email);
                return true;
            }
        } catch (Exception e) {
            log.warn("Could not generate/send password reset link server-side for {}: {}", email, e.getMessage());
            return false;
        }
    }

    /**
     * Dev helper: generate a Firebase password reset link and return it.
     * WARNING: This should only be used in development environments.
     */
    public String generatePasswordResetLinkForDebug(String email) {
        try {
            String link = FirebaseAuth.getInstance().generatePasswordResetLink(email);
            log.info("Generated password reset link (debug) for {}", email);
            return link;
        } catch (Exception e) {
            log.error("Failed to generate password reset link (debug) for {}: {}", email, e.getMessage());
            throw new RuntimeException("Failed to generate password reset link: " + e.getMessage());
        }
    }


    // Manual verification via code/resend removed - use Firebase verification flow instead
    
    private User createNewUser(String firebaseUid, String email, String name, 
                               String photoUrl, AuthProvider provider) {
        log.info("🆕 Criando novo usuário: {}", email);
        
        // Set first name as the full name
        String firstName = name != null && !name.isBlank() ? name.trim() : null;
        
        User newUser = User.builder()
            .authProviderId(firebaseUid)
            .email(email)
            .name(name != null ? name : email.split("@")[0])
            .firstName(firstName)
            .photoUrl(photoUrl)
            .authProvider(provider)
            .enabled(true)
            .roles(Set.of("ROLE_USER"))
            .build();
        
        return userRepository.save(newUser);
    }
    
    private AuthProvider detectProvider(FirebaseToken token) {
        if (token.getIssuer().contains("google")) {
            return AuthProvider.GOOGLE;
        } else if (token.getIssuer().contains("facebook")) {
            return AuthProvider.FACEBOOK;
        } else {
            return AuthProvider.FIREBASE; 
        }
    }
    
    public void promoteToAdmin(String firebaseUid) {
        User user = userRepository.findByAuthProviderId(firebaseUid)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        
        user.getRoles().add("ROLE_ADMIN");
        userRepository.save(user);
        
        log.info(" Usuário {} promovido a ADMIN", user.getEmail());
    }

    public void deleteUser(String firebaseUid) {
        User user = userRepository.findByAuthProviderId(firebaseUid)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        
        log.info("🗑️ Eliminando usuário e dados associados: {} ({})", user.getEmail(), firebaseUid);
        
        // 1. Delete all user sessions first (to avoid foreign key constraint violation)
        sessionService.deleteAllUserSessions(user.getId(), firebaseUid);
        log.info("✅ Sessões do usuário eliminadas");

        // 2. Disassociate orders referencing this user to avoid FK constraint
        try {
            List<com.escritoresnogueira.backend.model.Order> orders = orderRepository.findAllByUserId(user.getId());
            if (orders != null && !orders.isEmpty()) {
                for (com.escritoresnogueira.backend.model.Order o : orders) {
                    o.setUser(null);
                }
                orderRepository.saveAll(orders);
                log.info("✅ Orders disassociated from user (user_id set to null): {} orders", orders.size());
            }
        } catch (Exception e) {
            log.warn("⚠️ Could not disassociate orders before user deletion: {}", e.getMessage());
        }

        // 3. Delete from PostgreSQL
        userRepository.delete(user);
        log.info("✅ Usuário eliminado com sucesso do banco de dados");

        // 3. Delete from Firebase Auth
        try {
            FirebaseAuth.getInstance().deleteUser(firebaseUid);
            log.info("✅ Usuário eliminado com sucesso do Firebase Auth");
        } catch (FirebaseAuthException e) {
            log.error("⚠️ Erro ao eliminar usuário do Firebase Auth: {}", e.getMessage());
        }
    }

    /**
     * Check whether a user with the given email exists in the local database.
     */
    public boolean userExists(String email) {
        if (email == null) return false;
        return userRepository.findByEmail(email.trim().toLowerCase()).isPresent();
    }

    public void subscribeNewsletter(String email, String name) {
        newsletterService.subscribe(email, name);
    }

    public void unsubscribeNewsletter(String email) {
        newsletterService.unsubscribe(email);
    }

    public void sendNewsletterToAll(String subject, String content) {
        // Persist a record of this newsletter send
        com.escritoresnogueira.backend.model.NewsletterMessage message = com.escritoresnogueira.backend.model.NewsletterMessage.builder()
                .subject(subject)
                .content(content)
                .recipientsCount(0)
                .build();
        try {
            message = newsletterMessageRepository.save(message);
        } catch (Exception e) {
            log.warn("Could not persist NewsletterMessage record: {}", e.getMessage());
        }

        List<NewsletterClientDTO> subscribers = newsletterService.getAllActiveSubscribers();
        int sent = 0;
        for (NewsletterClientDTO subscriber : subscribers) {
            try {
                NewsletterClient client = newsletterClientRepository.findByEmailAndActiveTrue(subscriber.getEmail())
                        .orElseThrow(() -> new RuntimeException("Client not found"));
                emailService.sendNewsletterEmail(subscriber.getEmail(), subject, content, subscriber.getName(), client.getUnsubscribeToken());
                sent++;
            } catch (Exception e) {
                log.error("Failed to send newsletter to {}: {}", subscriber.getEmail(), e.getMessage());
            }
        }

        // update persisted message with sentAt and recipientsCount
        try {
            message.setSentAt(java.time.LocalDateTime.now());
            message.setRecipientsCount(sent);
            newsletterMessageRepository.save(message);
        } catch (Exception e) {
            log.warn("Could not update NewsletterMessage record: {}", e.getMessage());
        }
    }
}


