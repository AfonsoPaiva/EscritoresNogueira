package main.java.com.escritoresnogueira.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookCommentDTO {
    private Long id;
    
    @JsonProperty("authorName")
    private String authorName;
    
    private Integer rating;
    private String title;
    private String content;
    private String status;
    
    @JsonProperty("createdAt")
    private LocalDateTime createdAt;
    
    @JsonProperty("approvedAt")
    private LocalDateTime approvedAt;
    
    @JsonProperty("helpfulCount")
    private Integer helpfulCount;
}
