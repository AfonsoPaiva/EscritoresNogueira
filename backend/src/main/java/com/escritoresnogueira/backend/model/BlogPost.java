package main.java.com.escritoresnogueira.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@Builder
@EqualsAndHashCode(callSuper = false)
@Entity
@Table(name = "blog_posts")
@NoArgsConstructor
@AllArgsConstructor
public class BlogPost extends BaseEntity {
    
    @Column(nullable = false)
    private String title;
    
    @Column(unique = true, nullable = false)
    private String slug;
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;
    
    @Column(columnDefinition = "TEXT")
    private String excerpt;
    
    @Column(name = "featured_image")
    private String featuredImage;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private BlogCategory category;
    
    private String author;
    
    @Column(name = "view_count")
    @Builder.Default
    private Long viewCount = 0L;
    
    @Column(nullable = false)
    @Builder.Default
    private boolean featured = false;
    
    @ManyToMany
    @JoinTable(
        name = "blog_post_tags",
        joinColumns = @JoinColumn(name = "post_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    private Set<BlogTag> tags = new HashSet<>();
    
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BlogComment> comments = new ArrayList<>();
    
    @Column(nullable = false)
    @Builder.Default
    private boolean published = false;
    
    public void addTag(BlogTag tag) {
        tags.add(tag);
        tag.getPosts().add(this);
    }
    
    public void removeTag(BlogTag tag) {
        tags.remove(tag);
        tag.getPosts().remove(this);
    }
    
    public void addComment(BlogComment comment) {
        comments.add(comment);
        comment.setPost(this);
    }
    
    public void removeComment(BlogComment comment) {
        comments.remove(comment);
        comment.setPost(null);
    }
}