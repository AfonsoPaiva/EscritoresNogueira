package com.escritoresnogueira.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "newsletter_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsletterMessage extends BaseEntity {

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "recipients_count")
    private Integer recipientsCount;
}
