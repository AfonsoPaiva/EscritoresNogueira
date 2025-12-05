package main.java.com.escritoresnogueira.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import main.java.com.escritoresnogueira.backend.model.User;
import main.java.com.escritoresnogueira.backend.model.UserSession;
import main.java.com.escritoresnogueira.backend.repository.UserRepository;
import main.java.com.escritoresnogueira.backend.repository.UserSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserSessionService {
    
    private final UserSessionRepository sessionRepository;
    private final UserRepository userRepository;
    
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Base64.Encoder BASE64_ENCODER = Base64.getUrlEncoder().withoutPadding();
    
    @Value("${session.expiration-hours:24}")
    private int sessionExpirationHours;
    
    @Value("${session.max-sessions-per-user:5}")
    private int maxSessionsPerUser;
    
    /**
     * Generate a cryptographically secure session token
     */
    private String generateSecureToken() {
        byte[] randomBytes = new byte[48]; // 384 bits of randomness
        SECURE_RANDOM.nextBytes(randomBytes);
        return BASE64_ENCODER.encodeToString(randomBytes);
    }
    
    /**
     * Create a new session for a user after successful authentication
     */
    @Transactional
    public UserSession createSession(User user, String firebaseUid, String displayName, 
                                      String photoUrl, String ipAddress, String userAgent) {
        // Check if user has too many active sessions
        Long activeSessions = sessionRepository.countByUserIdAndActiveTrue(user.getId());
        if (activeSessions >= maxSessionsPerUser) {
            log.info("🔒 User {} has max sessions, deactivating oldest", user.getEmail());
            // Deactivate all sessions for this user (they'll need to re-login on other devices)
            sessionRepository.deactivateAllUserSessions(user.getId());
        }
        
        String sessionToken = generateSecureToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(sessionExpirationHours);
        
        UserSession session = UserSession.builder()
                .sessionToken(sessionToken)
                .user(user)
                .firebaseUid(firebaseUid)
                .displayName(displayName)
                .photoUrl(photoUrl)
                .expiresAt(expiresAt)
                .lastAccessedAt(LocalDateTime.now())
                .ipAddress(ipAddress)
                .userAgent(userAgent != null && userAgent.length() > 512 ? userAgent.substring(0, 512) : userAgent)
                .active(true)
                .build();
        
        session = sessionRepository.save(session);
        log.info("✅ Session created for user: {} (expires: {})", user.getEmail(), expiresAt);
        
        return session;
    }
    
    /**
     * Validate a session token and return session data if valid
     * Uses JOIN FETCH to eagerly load the user to avoid LazyInitializationException
     * Note: We don't update last_accessed_at on every validation to avoid CockroachDB
     * transaction conflicts when multiple requests happen in parallel
     */
    @Transactional(readOnly = true)
    public Optional<UserSession> validateSession(String sessionToken) {
        if (sessionToken == null || sessionToken.isBlank()) {
            return Optional.empty();
        }
        
        Optional<UserSession> sessionOpt = sessionRepository.findBySessionTokenAndActiveTrueWithUser(sessionToken);
        
        if (sessionOpt.isEmpty()) {
            log.debug("🔒 Session not found or inactive: {}", sessionToken.substring(0, Math.min(10, sessionToken.length())) + "...");
            return Optional.empty();
        }
        
        UserSession session = sessionOpt.get();
        
        if (session.isExpired()) {
            log.info("🔒 Session expired for user: {}", session.getUser().getEmail());
            // Don't update here - let the cleanup job handle it
            return Optional.empty();
        }
        
        return Optional.of(session);
    }
    
    /**
     * Touch a session (update last accessed time) - call this sparingly
     * to avoid transaction conflicts on frequent operations
     */
    @Transactional
    public void touchSession(String sessionToken) {
        try {
            sessionRepository.findBySessionTokenAndActiveTrue(sessionToken).ifPresent(session -> {
                session.setLastAccessedAt(LocalDateTime.now());
                sessionRepository.save(session);
            });
        } catch (Exception e) {
            // Ignore touch failures - not critical
            log.debug("Could not touch session: {}", e.getMessage());
        }
    }
    
    /**
     * Deactivate an expired session - separate transaction
     */
    @Transactional
    public void deactivateExpiredSession(Long sessionId) {
        try {
            sessionRepository.findById(sessionId).ifPresent(session -> {
                session.setActive(false);
                sessionRepository.save(session);
            });
        } catch (Exception e) {
            log.debug("Could not deactivate session: {}", e.getMessage());
        }
    }
    
    /**
     * Get session data (display name, photo URL) without sensitive info
     */
    public Optional<SessionData> getSessionData(String sessionToken) {
        return validateSession(sessionToken)
                .map(session -> new SessionData(
                        session.getDisplayName(),
                        session.getUser().getEmail(),
                        session.getPhotoUrl(),
                        session.getExpiresAt()
                ));
    }
    
    /**
     * Invalidate a specific session (logout)
     */
    @Transactional
    public void invalidateSession(String sessionToken) {
        sessionRepository.findBySessionTokenAndActiveTrue(sessionToken)
                .ifPresent(session -> {
                    session.setActive(false);
                    sessionRepository.save(session);
                    log.info("🔒 Session invalidated for user: {}", session.getUser().getEmail());
                });
    }
    
    /**
     * Invalidate all sessions for a user (force logout everywhere)
     */
    @Transactional
    public void invalidateAllUserSessions(String firebaseUid) {
        sessionRepository.deactivateAllSessionsByFirebaseUid(firebaseUid);
        log.info("🔒 All sessions invalidated for Firebase UID: {}", firebaseUid);
    }
    
    /**
     * Delete all sessions for a user (used when deleting user account)
     */
    @Transactional
    public void deleteAllUserSessions(Long userId, String firebaseUid) {
        sessionRepository.deleteAllByUserId(userId);
        sessionRepository.deleteAllByFirebaseUid(firebaseUid);
        log.info("🗑️ All sessions deleted for user ID: {} / Firebase UID: {}", userId, firebaseUid);
    }
    
    /**
     * Scheduled task to cleanup expired sessions
     */
    @Scheduled(fixedRate = 3600000) // Run every hour
    @Transactional
    public void cleanupExpiredSessions() {
        LocalDateTime now = LocalDateTime.now();
        sessionRepository.deactivateExpiredSessions(now);
        
        // Delete inactive sessions older than 7 days
        LocalDateTime cutoff = now.minusDays(7);
        sessionRepository.deleteInactiveSessions(cutoff);
        
        log.debug("🧹 Session cleanup completed");
    }
    
    /**
     * Extend session expiration (for "remember me" functionality)
     */
    @Transactional
    public void extendSession(String sessionToken, int additionalHours) {
        sessionRepository.findBySessionTokenAndActiveTrue(sessionToken)
                .ifPresent(session -> {
                    session.setExpiresAt(session.getExpiresAt().plusHours(additionalHours));
                    sessionRepository.save(session);
                    log.info("🔒 Session extended for user: {}", session.getUser().getEmail());
                });
    }
    
    /**
     * DTO for returning safe session data to frontend
     */
    public record SessionData(String displayName, String email, String photoUrl, LocalDateTime expiresAt) {}
}
