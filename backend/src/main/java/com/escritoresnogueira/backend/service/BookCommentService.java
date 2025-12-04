package main.java.com.escritoresnogueira.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import main.java.com.escritoresnogueira.backend.dto.BookCommentDTO;
import main.java.com.escritoresnogueira.backend.dto.CreateBookCommentDTO;
import main.java.com.escritoresnogueira.backend.model.Book;
import main.java.com.escritoresnogueira.backend.model.BookComment;
import main.java.com.escritoresnogueira.backend.repository.BookCommentRepository;
import main.java.com.escritoresnogueira.backend.repository.BookRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookCommentService {
    
    private final BookCommentRepository bookCommentRepository;
    private final BookRepository bookRepository;
    
    /**
     * Submit a new comment for a book (will be in pending status)
     */
    @Transactional
    public BookCommentDTO submitComment(Long bookId, CreateBookCommentDTO dto) {
        // Optional: Get book if it exists for reference, but don't throw error if it doesn't
        Book book = bookRepository.findById(bookId).orElse(null);
        
        // Validate input
        if (dto.getRating() < 1 || dto.getRating() > 5) {
            throw new IllegalArgumentException("Classificação deve ser entre 1 e 5");
        }
        
        if (dto.getTitle() == null || dto.getTitle().trim().isEmpty() || dto.getTitle().length() > 255) {
            throw new IllegalArgumentException("Título inválido");
        }
        
        if (dto.getContent() == null || dto.getContent().trim().isEmpty() || dto.getContent().length() > 5000) {
            throw new IllegalArgumentException("Conteúdo inválido");
        }
        
        BookComment comment = BookComment.builder()
                .book(book)  // Can be null if book doesn't exist
                .authorName(dto.getAuthorName())
                .rating(dto.getRating())
                .title(dto.getTitle())
                .content(dto.getContent())
                .status("pending")
                .helpfulCount(0)
                .build();
        
        BookComment saved = bookCommentRepository.save(comment);
        log.info("Comentário submetido para o livro ID: {}", bookId);
        
        return mapToDTO(saved);
    }
    
    /**
     * Get approved comments for a book (public view)
     */
    public Page<BookCommentDTO> getApprovedComments(Long bookId, Pageable pageable) {
        return bookCommentRepository.findByBookIdAndStatus(bookId, "approved", pageable)
            .map(this::mapToDTO);
    }
    
    /**
     * Get all comments for a book (admin view)
     */
    public Page<BookCommentDTO> getAllCommentsForBook(Long bookId, Pageable pageable) {
        return bookCommentRepository.findByBookId(bookId, pageable)
                .map(this::mapToDTO);
    }
    
    /**
     * Get pending comments (admin view)
     */
    public Page<BookCommentDTO> getPendingComments(Pageable pageable) {
        return bookCommentRepository.findByStatus("pending", pageable)
            .map(this::mapToDTO);
    }
    
    /**
     * Approve a comment
     */
    @Transactional
    public BookCommentDTO approveComment(Long commentId) {
        BookComment comment = bookCommentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comentário não encontrado"));
        
        comment.setStatus("approved");
        comment.setApprovedAt(LocalDateTime.now());
        
        BookComment saved = bookCommentRepository.save(comment);
        log.info("Comentário aprovado: ID {}", commentId);
        
        return mapToDTO(saved);
    }
    
    /**
     * Reject a comment
     */
    @Transactional
    public BookCommentDTO rejectComment(Long commentId) {
        BookComment comment = bookCommentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comentário não encontrado"));
        
        comment.setStatus("rejected");
        
        BookComment saved = bookCommentRepository.save(comment);
        log.info("Comentário rejeitado: ID {}", commentId);
        
        return mapToDTO(saved);
    }
    
    /**
     * Delete a comment
     */
    @Transactional
    public void deleteComment(Long commentId) {
        BookComment comment = bookCommentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comentário não encontrado"));
        
        bookCommentRepository.delete(comment);
        log.info("Comentário deletado: ID {}", commentId);
    }
    
    /**
     * Mark comment as helpful
     */
    @Transactional
    public BookCommentDTO markAsHelpful(Long commentId) {
        BookComment comment = bookCommentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comentário não encontrado"));
        
        comment.setHelpfulCount(comment.getHelpfulCount() + 1);
        
        BookComment saved = bookCommentRepository.save(comment);
        log.info("Comentário marcado como útil: ID {}", commentId);
        
        return mapToDTO(saved);
    }
    
    /**
     * Get comment count for a book (approved only)
     */
    public Long getApprovedCommentCount(Long bookId) {
        return bookCommentRepository.countByBookIdAndStatus(bookId, "approved");
    }
    
    /**
     * Get pending comment count (admin)
     */
    public Long getPendingCommentCount() {
        return bookCommentRepository.countByStatus("pending");
    }
    
    /**
     * Map BookComment to DTO
     */
    private BookCommentDTO mapToDTO(BookComment comment) {
        return BookCommentDTO.builder()
                .id(comment.getId())
                .authorName(comment.getAuthorName())
                .rating(comment.getRating())
                .title(comment.getTitle())
                .content(comment.getContent())
                .status(comment.getStatus())
                .createdAt(comment.getCreatedAt())
                .approvedAt(comment.getApprovedAt())
                .helpfulCount(comment.getHelpfulCount())
                .build();
    }
}
