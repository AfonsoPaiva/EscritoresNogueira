package main.java.com.escritoresnogueira.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import main.java.com.escritoresnogueira.backend.dto.BookCommentDTO;
import main.java.com.escritoresnogueira.backend.dto.CreateBookCommentDTO;
import main.java.com.escritoresnogueira.backend.service.BookCommentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/books")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BookCommentController {
    
    private final BookCommentService bookCommentService;
    
    /**
     * Submit a new comment for a book
     * POST /books/{bookId}/comments
     */
    @PostMapping("/{bookId}/comments")
    public ResponseEntity<Map<String, Object>> submitComment(
            @PathVariable Long bookId,
            @RequestBody CreateBookCommentDTO dto) {
        
        log.info("=== POST /books/{}/comments received ===", bookId);
        log.info("DTO: authorName={}, rating={}, title={}", dto.getAuthorName(), dto.getRating(), dto.getTitle());
        
        try {
            BookCommentDTO comment = bookCommentService.submitComment(bookId, dto);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Comentário enviado com sucesso! Aguardando aprovação.");
            response.put("comment", comment);
            
            log.info("Comment created successfully with ID: {}", comment.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            log.error("Erro de validação: {}", e.getMessage());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (RuntimeException e) {
            log.error("Erro ao submeter comentário: {}", e.getMessage());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
    
    /**
     * Get approved comments for a book (public)
     * GET /books/{bookId}/comments?page=0&size=10
     */
    @GetMapping("/{bookId}/comments")
    public ResponseEntity<Map<String, Object>> getApprovedComments(
            @PathVariable Long bookId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<BookCommentDTO> comments = bookCommentService.getApprovedComments(bookId, pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", comments.getContent());
        response.put("page", comments.getNumber());
        response.put("size", comments.getSize());
        response.put("totalElements", comments.getTotalElements());
        response.put("totalPages", comments.getTotalPages());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Mark comment as helpful
     * PUT /books/comments/{commentId}/helpful
     */
    @PutMapping("/comments/{commentId}/helpful")
    public ResponseEntity<Map<String, Object>> markAsHelpful(
            @PathVariable Long commentId) {
        
        try {
            BookCommentDTO comment = bookCommentService.markAsHelpful(commentId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Marcado como útil!");
            response.put("comment", comment);
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Erro ao marcar como útil: {}", e.getMessage());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
}
