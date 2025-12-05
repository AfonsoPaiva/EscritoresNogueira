package main.java.com.escritoresnogueira.backend.repository;

import main.java.com.escritoresnogueira.backend.model.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    
    Optional<UserSession> findBySessionTokenAndActiveTrue(String sessionToken);
    
    @Query("SELECT s FROM UserSession s JOIN FETCH s.user WHERE s.sessionToken = :sessionToken AND s.active = true")
    Optional<UserSession> findBySessionTokenAndActiveTrueWithUser(@Param("sessionToken") String sessionToken);
    
    List<UserSession> findByUserIdAndActiveTrue(Long userId);
    
    List<UserSession> findByFirebaseUidAndActiveTrue(String firebaseUid);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.active = false WHERE s.user.id = :userId")
    void deactivateAllUserSessions(@Param("userId") Long userId);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.active = false WHERE s.firebaseUid = :firebaseUid")
    void deactivateAllSessionsByFirebaseUid(@Param("firebaseUid") String firebaseUid);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.active = false WHERE s.expiresAt < :now")
    void deactivateExpiredSessions(@Param("now") LocalDateTime now);
    
    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.active = false AND s.updatedAt < :cutoff")
    void deleteInactiveSessions(@Param("cutoff") LocalDateTime cutoff);
    
    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
    
    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.firebaseUid = :firebaseUid")
    void deleteAllByFirebaseUid(@Param("firebaseUid") String firebaseUid);
    
    Long countByUserIdAndActiveTrue(Long userId);
}
