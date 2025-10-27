package main.java.com.escritoresnogueira.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "blog_tags")
@Getter
@Setter
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlogTag extends BaseEntity {
    
    @Column(nullable = false, unique = true)
    private String name;
    
    @Column(unique = true, nullable = false)
    private String slug;
    
    @Column(name = "post_count")
    @Builder.Default
    private Integer postCount = 0;
    
    @ManyToMany(mappedBy = "tags")
    @JsonIgnore
    @Builder.Default
    private Set<BlogPost> posts = new HashSet<>();
}