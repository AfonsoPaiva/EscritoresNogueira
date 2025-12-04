package main.java.com.escritoresnogueira.backend.controller;

import main.java.com.escritoresnogueira.backend.model.BlogPost;
import main.java.com.escritoresnogueira.backend.model.BlogCategory;
import main.java.com.escritoresnogueira.backend.repository.BlogPostRepository;
import main.java.com.escritoresnogueira.backend.repository.BlogCategoryRepository;
import main.java.com.escritoresnogueira.backend.dto.PublicBlogPostDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/blog")
@CrossOrigin(origins = "*")
public class BlogController {

    @Autowired
    private BlogPostRepository blogPostRepository;

    @Autowired
    private BlogCategoryRepository blogCategoryRepository;

    // Listar todos os posts (público) — devolve lista com o formato público
    @GetMapping("/posts")
    public ResponseEntity<List<PublicBlogPostDTO>> getAllPosts(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<BlogPost> posts = blogPostRepository.findByPublishedTrue(pageable);
        List<PublicBlogPostDTO> dtos = posts.getContent().stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // Ver post individual por slug (formato público)
    @GetMapping("/posts/{slug}")
    public ResponseEntity<PublicBlogPostDTO> getPostBySlug(@PathVariable String slug) {
        return blogPostRepository.findBySlug(slug)
            .map(this::toDto)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // Listar posts por categoria
    @GetMapping("/categories/{categorySlug}/posts")
    public ResponseEntity<List<PublicBlogPostDTO>> getPostsByCategory(
        @PathVariable String categorySlug,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return blogCategoryRepository.findBySlug(categorySlug)
            .map(category -> {
                Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
                Page<BlogPost> posts = blogPostRepository.findByCategory(category, pageable);
                List<PublicBlogPostDTO> dtos = posts.getContent().stream().map(this::toDto).collect(Collectors.toList());
                return ResponseEntity.ok(dtos);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // Listar todas as categorias de blog
    @GetMapping("/categories")
    public ResponseEntity<List<BlogCategory>> getAllCategories() {
        List<BlogCategory> categories = blogCategoryRepository.findAll();
        return ResponseEntity.ok(categories);
    }

    // Posts em destaque
    @GetMapping("/posts/featured")
    public ResponseEntity<List<PublicBlogPostDTO>> getFeaturedPosts() {
        List<BlogPost> posts = blogPostRepository.findTop5ByOrderByCreatedAtDesc();
        List<PublicBlogPostDTO> dtos = posts.stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // --- helper to convert entity -> public DTO ---
    private PublicBlogPostDTO toDto(BlogPost post) {
        if (post == null) return null;
        String categoryName = null;
        if (post.getCategoryName() != null && !post.getCategoryName().trim().isEmpty()) {
            categoryName = post.getCategoryName();
        } else if (post.getCategory() != null) {
            categoryName = post.getCategory().getName();
        }

        String date = null;
        if (post.getCreatedAt() != null) {
            date = post.getCreatedAt().toLocalDate().toString();
        }

        String content = post.getContent() != null ? post.getContent() : "";
        String readTime = estimateReadTime(content);

        return PublicBlogPostDTO.builder()
                .id(post.getId())
                .title(post.getTitle())
                .excerpt(post.getExcerpt())
                .content(content)
                .author(post.getAuthor())
                .date(date)
                .readTime(readTime)
                .category(categoryName)
                .featured(post.isFeatured())
                .image(post.getFeaturedImage())
                .build();
    }

    private String estimateReadTime(String htmlContent) {
        // strip simple HTML tags
        String text = htmlContent.replaceAll("<[^>]*>", " ").trim();
        if (text.isEmpty()) return "1 min";
        String[] words = text.split("\\s+");
        int wordCount = words.length;
        int minutes = Math.max(1, wordCount / 200);
        return minutes + " min";
    }
}