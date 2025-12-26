package com.escritoresnogueira.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "newsletter_clients")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsletterClient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column
    private String name;

    @Column(nullable = false)
    private LocalDateTime subscribedAt;

    @Column
    private LocalDateTime unsubscribedAt;

    @Column(nullable = false)
    private boolean active = true;

    @Column
    @Builder.Default
    private String unsubscribeToken = null;

    @PrePersist
    protected void onCreate() {
        subscribedAt = LocalDateTime.now();
        if (unsubscribeToken == null) {
            unsubscribeToken = java.util.UUID.randomUUID().toString();
        }
    }
}