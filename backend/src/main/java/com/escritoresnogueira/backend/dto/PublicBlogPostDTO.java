package main.java.com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicBlogPostDTO {
    private Long id;
    private String title;
    private String excerpt;
    private String content;
    private String author;
    private String date; // yyyy-MM-dd
    private String readTime; // e.g. "5 min"
    private String category;
    private Boolean featured;
    private String image;
}
