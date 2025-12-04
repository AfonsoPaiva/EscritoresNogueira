package main.java.com.escritoresnogueira.backend.repository;

import main.java.com.escritoresnogueira.backend.model.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookRepository extends JpaRepository<Book, Long> {
    
    @Query("SELECT b FROM Book b WHERE LOWER(b.slug) = LOWER(:slug)")
    Optional<Book> findBySlug(@Param("slug") String slug);
    
    List<Book> findByFeaturedTrueAndActiveTrue();
    
    List<Book> findByActiveTrue();
    
    List<Book> findByCategoryAndActiveTrue(String category);
}
