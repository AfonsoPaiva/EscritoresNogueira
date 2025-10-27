package main.java.com.escritoresnogueira.backend.controller;

import main.java.com.escritoresnogueira.backend.model.BlogPost;
import main.java.com.escritoresnogueira.backend.model.BlogCategory;
import main.java.com.escritoresnogueira.backend.repository.BlogPostRepository;
import main.java.com.escritoresnogueira.backend.repository.BlogCategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

    // Listar todos os posts (com paginação)
    @GetMapping("/posts")
    public ResponseEntity<Page<BlogPost>> getAllPosts(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<BlogPost> posts = blogPostRepository.findAll(pageable);
        return ResponseEntity.ok(posts);
    }

    // Ver post individual por slug
    @GetMapping("/posts/{slug}")
    public ResponseEntity<BlogPost> getPostBySlug(@PathVariable String slug) {
        return blogPostRepository.findBySlug(slug)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // Listar posts por categoria
    @GetMapping("/categories/{categorySlug}/posts")
    public ResponseEntity<Page<BlogPost>> getPostsByCategory(
        @PathVariable String categorySlug,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return blogCategoryRepository.findBySlug(categorySlug)
            .map(category -> {
                Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
                Page<BlogPost> posts = blogPostRepository.findByCategory(category, pageable);
                return ResponseEntity.ok(posts);
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
    public ResponseEntity<List<BlogPost>> getFeaturedPosts() {
        List<BlogPost> posts = blogPostRepository.findTop5ByOrderByCreatedAtDesc();
        return ResponseEntity.ok(posts);
    }
}