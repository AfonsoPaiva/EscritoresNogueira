package main.java.com.escritoresnogueira.backend.repository;

import main.java.com.escritoresnogueira.backend.model.BlogCategory;
import main.java.com.escritoresnogueira.backend.model.BlogPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {
    
    Optional<BlogPost> findBySlug(String slug);
    
    Page<BlogPost> findByCategory(BlogCategory category, Pageable pageable);

    List<BlogPost> findTop5ByOrderByCreatedAtDesc();
    
    Page<BlogPost> findByPublishedTrue(Pageable pageable);
    
    Page<BlogPost> findByPublishedTrueAndFeaturedTrue(Pageable pageable);
    
    Page<BlogPost> findByPublishedTrueAndCategoryId(Long categoryId, Pageable pageable);
    
    @Query("SELECT p FROM BlogPost p JOIN p.tags t WHERE t.slug = :tagSlug AND p.published = true")
    Page<BlogPost> findByTagSlugAndPublishedTrue(@Param("tagSlug") String tagSlug, Pageable pageable);
    
    @Query("SELECT p FROM BlogPost p WHERE p.published = true AND " +
           "(LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.content) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<BlogPost> searchPublishedPosts(@Param("query") String query, Pageable pageable);
    
    List<BlogPost> findTop5ByPublishedTrueOrderByCreatedAtDesc();
    
    List<BlogPost> findTop5ByPublishedTrueOrderByViewCountDesc();
    
    Long countByPublishedTrue();
}
