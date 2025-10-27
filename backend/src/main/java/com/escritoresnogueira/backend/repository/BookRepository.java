package main.java.com.escritoresnogueira.backend.repository;

import main.java.com.escritoresnogueira.backend.model.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookRepository extends JpaRepository<Book, Long> {
    
    Optional<Book> findBySlug(String slug);
    
    List<Book> findByFeaturedTrueAndActiveTrue();
    
    List<Book> findByActiveTrue();
    
    List<Book> findByCategoryIdAndActiveTrue(Long categoryId);
}
