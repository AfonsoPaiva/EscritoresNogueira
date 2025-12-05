package main.java.com.escritoresnogueira.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_sessions")
@Getter
@Setter
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSession extends BaseEntity {
    
    @Column(name = "session_token", unique = true, nullable = false, length = 64)
    private String sessionToken;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(name = "firebase_uid", nullable = false)
    private String firebaseUid;
    
    @Column(name = "display_name")
    private String displayName;
    
    @Column(name = "photo_url")
    private String photoUrl;
    
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    
    @Column(name = "last_accessed_at")
    private LocalDateTime lastAccessedAt;
    
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    
    @Column(name = "user_agent", length = 512)
    private String userAgent;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;
    
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
    
    public boolean isValid() {
        return active && !isExpired();
    }
}
