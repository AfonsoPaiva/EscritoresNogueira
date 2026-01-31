package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "idToken")
public class RegisterRequest {
    private String email;
    /** Firebase ID token (client must create the user via Firebase client). */
    private String idToken;
    private String name;
    private String recaptchaToken;
    // Optional client-side heuristic flag indicating suspicious interaction
    private Boolean suspiciousInteraction;
    // true when client performed invisible challenge and is resubmitting
    private Boolean challenge;
}


