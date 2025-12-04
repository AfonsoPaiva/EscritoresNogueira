package main.java.com.escritoresnogueira.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import main.java.com.escritoresnogueira.backend.dto.BookCommentDTO;
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
@RequestMapping("/admin/books/comments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminBookCommentController {
    
    private final BookCommentService bookCommentService;
    
    /**
     * Get all pending comments
     * GET /admin/books/comments/pending?page=0&size=20
     */
    @GetMapping("/pending")
    public ResponseEntity<Map<String, Object>> getPendingComments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        Page<BookCommentDTO> comments = bookCommentService.getPendingComments(pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", comments.getContent());
        response.put("page", comments.getNumber());
        response.put("size", comments.getSize());
        response.put("totalElements", comments.getTotalElements());
        response.put("totalPages", comments.getTotalPages());
        response.put("pendingCount", bookCommentService.getPendingCommentCount());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get all comments for a specific book (admin view)
     * GET /admin/books/comments/book/{bookId}?page=0&size=20
     */
    @GetMapping("/book/{bookId}")
    public ResponseEntity<Map<String, Object>> getCommentsForBook(
            @PathVariable Long bookId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<BookCommentDTO> comments = bookCommentService.getAllCommentsForBook(bookId, pageable);
        
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
     * Approve a comment by ID
     * PUT /admin/books/comments/{commentId}/approve
     */
    @PutMapping("/{commentId}/approve")
    public ResponseEntity<Map<String, Object>> approveComment(
            @PathVariable Long commentId) {
        
        try {
            BookCommentDTO comment = bookCommentService.approveComment(commentId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Comentário aprovado com sucesso!");
            response.put("comment", comment);
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Erro ao aprovar comentário: {}", e.getMessage());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
    
    /**
     * Reject a comment by ID
     * PUT /admin/books/comments/{commentId}/reject
     */
    @PutMapping("/{commentId}/reject")
    public ResponseEntity<Map<String, Object>> rejectComment(
            @PathVariable Long commentId) {
        
        try {
            BookCommentDTO comment = bookCommentService.rejectComment(commentId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Comentário rejeitado com sucesso!");
            response.put("comment", comment);
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Erro ao rejeitar comentário: {}", e.getMessage());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
    
    /**
     * Delete a comment by ID
     * DELETE /admin/books/comments/{commentId}
     */
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Map<String, Object>> deleteComment(
            @PathVariable Long commentId) {
        
        try {
            bookCommentService.deleteComment(commentId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Comentário deletado com sucesso!");
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Erro ao deletar comentário: {}", e.getMessage());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
}
