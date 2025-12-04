package main.java.com.escritoresnogueira.backend.dto;

import main.java.com.escritoresnogueira.backend.model.Book;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookDTO {
    
    private Long id;
    private String slug;
    private String title;
    private String author;
    private String category; // String instead of object
    private BigDecimal price;
    
    @JsonProperty("oldPrice")
    private BigDecimal oldPrice; // renamed from originalPrice
    
    private String description;
    private String isbn;
    private Integer pages;
    
    @JsonProperty("year")
    private Integer year; // renamed from publishYear
    
    private String language;
    private String publisher;
    private Boolean featured;
    private Boolean promo; // manually set field, NOT calculated
    private String image; // renamed from coverUrl/coverImage
    private List<String> samplePages; // as array instead of JSON string
    
    // Additional fields that might be useful
    private Integer stock;
    private Double rating;
    private Integer reviewCount;
    private Integer viewCount;
    private boolean active;
    
    /**
     * Convert Book entity to BookDTO
     */
    public static BookDTO fromEntity(Book book) {
        if (book == null) return null;
        
        return BookDTO.builder()
                .id(book.getId())
                .slug(book.getSlug())
                .title(book.getTitle())
                .author(book.getAuthor())
                .category(book.getCategory()) // Now category is already a String
                .price(book.getPrice())
                .oldPrice(book.getOriginalPrice())
                .description(book.getDescription())
                .isbn(book.getIsbn())
                .pages(book.getPages())
                .year(book.getPublishYear())
                .language(book.getLanguage())
                .publisher(book.getPublisher())
                .featured(book.getFeatured() != null ? book.getFeatured() : false)
                .promo(book.getPromo() != null ? book.getPromo() : false)
                .image(book.getCoverUrl() != null ? book.getCoverUrl() : book.getCoverImage())
                .samplePages(book.getSamplePagesList())
                .stock(book.getStock())
                .rating(book.getRating())
                .reviewCount(book.getReviewCount())
                .viewCount(book.getViewCount())
                .active(book.isActive())
                .build();
    }
}
