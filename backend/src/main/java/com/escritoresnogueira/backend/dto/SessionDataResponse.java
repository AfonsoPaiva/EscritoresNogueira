package main.java.com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionDataResponse {
    private String displayName;
    private String email;
    private String photoUrl;
    private LocalDateTime expiresAt;
    private boolean valid;
}
