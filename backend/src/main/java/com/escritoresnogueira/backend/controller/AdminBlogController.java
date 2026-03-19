package com.escritoresnogueira.backend.controller;

import com.escritoresnogueira.backend.model.BlogPost;
import com.escritoresnogueira.backend.model.BlogCategory;
import com.escritoresnogueira.backend.repository.BlogPostRepository;
import com.escritoresnogueira.backend.repository.BlogCategoryRepository;
import com.escritoresnogueira.backend.dto.AdminBlogPostDTO;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/blog")
@CrossOrigin(origins = "*")
public class AdminBlogController {

    @Autowired
    private BlogPostRepository blogPostRepository;

    @Autowired
    private BlogCategoryRepository blogCategoryRepository;

    private AdminBlogPostDTO toDto(BlogPost post) {
        return AdminBlogPostDTO.builder()
                .id(post.getId())
                .title(post.getTitle())
                .slug(post.getSlug())
                .content(post.getContent())
                .excerpt(post.getExcerpt())
                .featuredImage(post.getFeaturedImage())
                .author(post.getAuthor())
                .featured(post.isFeatured())
                .published(post.isPublished())
                .category(post.getCategoryName())
                .build();
    }

    @GetMapping("/posts")
    public ResponseEntity<List<AdminBlogPostDTO>> getPosts() {
        return ResponseEntity.ok(
                blogPostRepository.findAll().stream().map(this::toDto).toList()
        );
    }
    
    @PostMapping("/posts")
    public ResponseEntity<AdminBlogPostDTO> createPost(@RequestBody AdminBlogPostDTO dto) {
        // Set category name as plain string (independent from category table)
        BlogPost post = BlogPost.builder()
                .title(dto.getTitle())
                .slug(dto.getSlug())
                .content(dto.getContent())
                .excerpt(dto.getExcerpt())
                .featuredImage(dto.getFeaturedImage())
                .author(dto.getAuthor())
                .featured(dto.getFeatured() != null ? dto.getFeatured() : false)
                .published(dto.getPublished() != null ? dto.getPublished() : false)
                .categoryName(dto.getCategory())
                .build();

        BlogPost savedPost = blogPostRepository.save(post);
        return ResponseEntity.ok(toDto(savedPost));
    }

    @PutMapping("/posts/{id}")
    public ResponseEntity<AdminBlogPostDTO> updatePost(@PathVariable Long id, @RequestBody AdminBlogPostDTO dto) {
        return blogPostRepository.findById(id)
            .map(existingPost -> {
                existingPost.setTitle(dto.getTitle());
                existingPost.setSlug(dto.getSlug());
                existingPost.setContent(dto.getContent());
                existingPost.setExcerpt(dto.getExcerpt());
                existingPost.setFeaturedImage(dto.getFeaturedImage());
                existingPost.setAuthor(dto.getAuthor());
                existingPost.setFeatured(dto.getFeatured() != null ? dto.getFeatured() : existingPost.isFeatured());
                existingPost.setPublished(dto.getPublished() != null ? dto.getPublished() : existingPost.isPublished());

                if (dto.getCategory() != null && !dto.getCategory().trim().isEmpty()) {
                    existingPost.setCategoryName(dto.getCategory().trim());
                }

                BlogPost updatedPost = blogPostRepository.save(existingPost);
                return ResponseEntity.ok(toDto(updatedPost));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable Long id) {
        if (blogPostRepository.existsById(id)) {
            blogPostRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    
    @PostMapping("/categories")
    public ResponseEntity<BlogCategory> createCategory(@RequestBody BlogCategory category) {
        BlogCategory savedCategory = blogCategoryRepository.save(category);
        return ResponseEntity.ok(savedCategory);
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<BlogCategory> updateCategory(@PathVariable Long id, @RequestBody BlogCategory category) {
        return blogCategoryRepository.findById(id)
            .map(existing -> {
                existing.setName(category.getName());
                existing.setSlug(category.getSlug());
                existing.setDescription(category.getDescription());
                BlogCategory updated = blogCategoryRepository.save(existing);
                return ResponseEntity.ok(updated);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        if (blogCategoryRepository.existsById(id)) {
            blogCategoryRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}


