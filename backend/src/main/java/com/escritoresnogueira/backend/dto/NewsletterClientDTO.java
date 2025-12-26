package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsletterClientDTO {

    private Long id;
    private String email;
    private String name;
    private LocalDateTime subscribedAt;
    private boolean active;
    // Admin-only: token used for unsubscribe links
    private String unsubscribeToken;
}