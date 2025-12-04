package main.java.com.escritoresnogueira.backend.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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
    @JsonAlias({"image", "coverImage"})
    private String coverImage;
    
    @Column(unique = true, length = 255)
    private String isbn;
    
    @Column(length = 255)
    private String language;
    
    @Column(length = 255)
    private String publisher;
    
    // Category as string (for display/API)
    @Column(length = 100)
    private String category;
    
    // Category ID for database foreign key constraint (nullable)
    @Column(name = "category_id")
    private Long categoryId;
    
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
    
    @Column
    @Builder.Default
    private Boolean featured = false;
    
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
    
    @Column(name = "original_price", precision = 10, scale = 2)
    @JsonAlias("oldPrice")
    private BigDecimal originalPrice;
    
    @Column(name = "publish_year")
    @JsonAlias("year")
    private Integer publishYear;
    
    // Promo field - manually set, NOT calculated
    @Column
    @Builder.Default
    private Boolean promo = false;
    
    // Sample pages for book preview (stored as JSON array string)
    @Column(name = "sample_pages", length = 2000)
    private String samplePages;
    
    // Helper method to get sample pages as list
    @Transient
    public List<String> getSamplePagesList() {
        if (samplePages == null || samplePages.isEmpty()) {
            return new ArrayList<>();
        }
        // Parse JSON array string like ["url1", "url2"]
        String cleaned = samplePages.replace("[", "").replace("]", "").replace("\"", "");
        if (cleaned.isEmpty()) {
            return new ArrayList<>();
        }
        return List.of(cleaned.split(",\\s*"));
    }
}