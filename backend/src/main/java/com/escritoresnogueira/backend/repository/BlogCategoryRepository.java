package main.java.com.escritoresnogueira.backend.repository;

import main.java.com.escritoresnogueira.backend.model.BlogCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlogCategoryRepository extends JpaRepository<BlogCategory, Long> {
    
    Optional<BlogCategory> findBySlug(String slug);
    
    List<BlogCategory> findByActiveTrueOrderByDisplayOrderAsc();
    
    List<BlogCategory> findByActiveTrue();
    
    Optional<BlogCategory> findByName(String name);
}
