package main.java.com.escritoresnogueira.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "book_comments")
@Getter
@Setter
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookComment extends BaseEntity {
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    @JsonIgnore
    private Book book;
    
    @Column(nullable = false)
    private String authorName;
    
    @Column(nullable = false)
    private Integer rating; // 1-5 stars
    
    @Column(nullable = false, length = 255)
    private String title;
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;
    
    @Column(nullable = false)
    @Builder.Default
    private String status = "pending"; // pending, approved, rejected
    
    @Column(name = "approved_at")
    private java.time.LocalDateTime approvedAt;
    
    @Column(nullable = false)
    @Builder.Default
    private Integer helpfulCount = 0;
}
