package main.java.com.escritoresnogueira.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@EqualsAndHashCode(callSuper = false)
@Entity
@Table(name = "books")
@NoArgsConstructor
@AllArgsConstructor
public class Book extends BaseEntity {
    
    @Column(nullable = false, length = 255)
    private String title;
    
    @Column(unique = true, nullable = false, length = 255)
    private String slug;

    @Column(nullable = false)
    @Builder.Default
    private Integer salesCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer viewCount = 0;
    
    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Integer stock = 0;  
    
    @Column(nullable = false, length = 255)
    private String author;
    
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
    
    @Column(name = "cover_image", length = 255)
    private String coverImage;
    
    @Column(unique = true, length = 255)
    private String isbn;
    
    @Column(length = 255)
    private String language;
    
    @Column(length = 255)
    private String publisher;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Category category;
    
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
    
    @Column
    @Builder.Default
    private Boolean featured = false;  // Ajustado para nullable como no banco
    
    // Novos campos do schema
    @Column(name = "cover_url", length = 255)
    private String coverUrl;
    
    @Column(length = 500)
    private String genres;
    
    @Column
    private Integer pages;
    
    @Column(name = "published_date")
    private LocalDate publishedDate;
    
    @Column
    private Double rating;
    
    @Column(name = "review_count")
    private Integer reviewCount;
    
    //@ManyToOne(fetch = FetchType.LAZY)
    //@JoinColumn(name = "author_id")
    //@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    //private Author authorEntity;  // FK para authors (opcional)
    
    @Column(name = "original_price", precision = 10, scale = 2)
    private BigDecimal originalPrice;
    
    @Column(name = "publish_year", length = 4)
    private String publishYear;
}