package main.java.com.escritoresnogueira.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "blog_categories")
@Getter
@Setter
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlogCategory extends BaseEntity {
    
    @Column(nullable = false)
    private String name;
    
    @Column(unique = true, nullable = false)
    private String slug;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
    
    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;
}