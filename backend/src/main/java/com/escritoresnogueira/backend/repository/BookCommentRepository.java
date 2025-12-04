package main.java.com.escritoresnogueira.backend.repository;

import main.java.com.escritoresnogueira.backend.model.BookComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookCommentRepository extends JpaRepository<BookComment, Long> {
    
    // Find comments for a book with a given status (e.g. "approved", "pending", "rejected")
    Page<BookComment> findByBookIdAndStatus(Long bookId, String status, Pageable pageable);

    Page<BookComment> findByBookId(Long bookId, Pageable pageable);

    // Status-based queries
    List<BookComment> findByStatus(String status);

    Page<BookComment> findByStatus(String status, Pageable pageable);

    Long countByStatus(String status);

    Long countByBookIdAndStatus(Long bookId, String status);

    List<BookComment> findByBookIdAndStatusOrderByCreatedAtDesc(Long bookId, String status);
}
