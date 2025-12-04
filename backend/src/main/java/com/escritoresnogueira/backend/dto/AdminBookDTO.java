package main.java.com.escritoresnogueira.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import main.java.com.escritoresnogueira.backend.model.Book;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO for Admin Book API
 * Format:
 * {
 *   "id": 1,
 *   "slug": "test",
 *   "title": "test",
 *   "author": "Oscar Wilde",
 *   "category": "ficcao",
 *   "price": 15.90,
 *   "oldPrice": null,
 *   "description": "...",
 *   "isbn": "978-0-14-143957-0",
 *   "pages": 254,
 *   "year": 1890,
 *   "language": "Português",
 *   "publisher": "Penguin Classics",
 *   "featured": true,
 *   "promo": false,
 *   "image": null,
 *   "samplePages": ["url1", "url2"],
 *   "stock": 10,
 *   "active": true
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminBookDTO {
    
    private Long id;
    private String slug;
    private String title;
    private String author;
    private String category;
    private BigDecimal price;
    
    @JsonProperty("oldPrice")
    private BigDecimal oldPrice;
    
    private String description;
    private String isbn;
    private Integer pages;
    
    @JsonProperty("year")
    private Integer year;
    
    private String language;
    private String publisher;
    private Boolean featured;
    
    // Promo field - manually set, NOT calculated
    private Boolean promo;
    
    // Image URL
    private String image;
    
    // Sample pages as array
    private List<String> samplePages;
    
    // Additional admin fields
    private Integer stock;
    private Boolean active;
    
    /**
     * Convert from Entity to DTO
     */
    public static AdminBookDTO fromEntity(Book book) {
        List<String> samplePagesList = new ArrayList<>();
        if (book.getSamplePages() != null && !book.getSamplePages().isEmpty()) {
            String cleaned = book.getSamplePages()
                .replace("[", "")
                .replace("]", "")
                .replace("\"", "")
                .trim();
            if (!cleaned.isEmpty()) {
                for (String page : cleaned.split(",\\s*")) {
                    if (!page.trim().isEmpty()) {
                        samplePagesList.add(page.trim());
                    }
                }
            }
        }
        
        return AdminBookDTO.builder()
                .id(book.getId())
                .slug(book.getSlug())
                .title(book.getTitle())
                .author(book.getAuthor())
                .category(book.getCategory())
                .price(book.getPrice())
                .oldPrice(book.getOriginalPrice())
                .description(book.getDescription())
                .isbn(book.getIsbn())
                .pages(book.getPages())
                .year(book.getPublishYear())
                .language(book.getLanguage())
                .publisher(book.getPublisher())
                .featured(book.getFeatured())
                .promo(book.getPromo() != null ? book.getPromo() : false)
                .image(book.getCoverImage() != null ? book.getCoverImage() : book.getCoverUrl())
                .samplePages(samplePagesList)
                .stock(book.getStock())
                .active(book.isActive())
                .build();
    }
    
    /**
     * Convert DTO to Entity (for create)
     */
    public Book toEntity() {
        return Book.builder()
                .slug(this.slug)
                .title(this.title)
                .author(this.author)
                .category(this.category != null ? this.category : "geral")
                .price(this.price)
                .originalPrice(this.oldPrice)
                .description(this.description)
                .isbn(this.isbn)
                .pages(this.pages)
                .publishYear(this.year)
                .language(this.language)
                .publisher(this.publisher)
                .featured(this.featured != null ? this.featured : false)
                .promo(this.promo != null ? this.promo : false)
                .coverImage(this.image)
                .samplePages(this.samplePages != null ? convertListToJsonString(this.samplePages) : null)
                .stock(this.stock != null ? this.stock : 0)
                .active(this.active != null ? this.active : true)
                .build();
    }
    
    /**
     * Update existing entity with DTO values
     */
    public void updateEntity(Book book) {
        if (this.slug != null) book.setSlug(this.slug);
        if (this.title != null) book.setTitle(this.title);
        if (this.author != null) book.setAuthor(this.author);
        if (this.category != null) book.setCategory(this.category);
        if (this.price != null) book.setPrice(this.price);
        if (this.oldPrice != null) book.setOriginalPrice(this.oldPrice);
        if (this.description != null) book.setDescription(this.description);
        if (this.isbn != null) book.setIsbn(this.isbn);
        if (this.pages != null) book.setPages(this.pages);
        if (this.year != null) book.setPublishYear(this.year);
        if (this.language != null) book.setLanguage(this.language);
        if (this.publisher != null) book.setPublisher(this.publisher);
        if (this.featured != null) book.setFeatured(this.featured);
        if (this.promo != null) book.setPromo(this.promo);
        if (this.image != null) book.setCoverImage(this.image);
        if (this.samplePages != null) book.setSamplePages(convertListToJsonString(this.samplePages));
        if (this.stock != null) book.setStock(this.stock);
        if (this.active != null) book.setActive(this.active);
    }
    
    /**
     * Convert List<String> to JSON array string for storage
     */
    private static String convertListToJsonString(List<String> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            sb.append("\"").append(list.get(i)).append("\"");
            if (i < list.size() - 1) {
                sb.append(", ");
            }
        }
        sb.append("]");
        return sb.toString();
    }
}
