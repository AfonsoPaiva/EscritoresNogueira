package main.java.com.escritoresnogueira.backend.repository;

import main.java.com.escritoresnogueira.backend.model.BlogTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlogTagRepository extends JpaRepository<BlogTag, Long> {
    
    Optional<BlogTag> findBySlug(String slug);
    
    Optional<BlogTag> findByName(String name);
    
    List<BlogTag> findTop10ByOrderByPostCountDesc();
    
    List<BlogTag> findByNameIn(List<String> names);
}
