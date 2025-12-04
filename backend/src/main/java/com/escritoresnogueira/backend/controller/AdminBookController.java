package main.java.com.escritoresnogueira.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import main.java.com.escritoresnogueira.backend.dto.AdminBookDTO;
import main.java.com.escritoresnogueira.backend.model.Book;
import main.java.com.escritoresnogueira.backend.repository.BookRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/admin/books")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminBookController {

    private final BookRepository bookRepository;

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<AdminBookDTO>> getAllBooks() {
        log.debug("[AdminBookController] GET /admin/books - Fetching all books");
        List<AdminBookDTO> books = bookRepository.findAll().stream()
                .map(AdminBookDTO::fromEntity)
                .collect(Collectors.toList());
        log.info("[AdminBookController] Retrieved {} books", books.size());
        return ResponseEntity.ok(books);
    }

    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AdminBookDTO> getBook(@PathVariable Long id) {
        log.debug("[AdminBookController] GET /admin/books/{} - Fetching book", id);
        return bookRepository.findById(id)
            .map(book -> {
                log.info("[AdminBookController] Found book: {} (ID: {})", book.getTitle(), id);
                return ResponseEntity.ok(AdminBookDTO.fromEntity(book));
            })
            .orElseGet(() -> {
                log.warn("[AdminBookController] Book not found with ID: {}", id);
                return ResponseEntity.notFound().build();
            });
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AdminBookDTO> createBook(@RequestBody AdminBookDTO bookDTO) {
        log.debug("[AdminBookController] POST /admin/books - Creating book: {}", bookDTO.getTitle());
        log.debug("[AdminBookController] Received DTO: {}", bookDTO);
        try {
            Book book = bookDTO.toEntity();
            Book saved = bookRepository.save(book);
            log.info("[AdminBookController] Book created successfully: {} (ID: {})", saved.getTitle(), saved.getId());
            return ResponseEntity.ok(AdminBookDTO.fromEntity(saved));
        } catch (Exception e) {
            log.error("[AdminBookController] Error creating book: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AdminBookDTO> updateBook(@PathVariable Long id, @RequestBody AdminBookDTO bookDTO) {
        log.debug("[AdminBookController] PUT /admin/books/{} - Updating book", id);
        log.debug("[AdminBookController] Received DTO: {}", bookDTO);
        return bookRepository.findById(id)
            .map(existingBook -> {
                log.debug("[AdminBookController] Found existing book: {}", existingBook.getTitle());
                
                // Update entity with DTO values
                bookDTO.updateEntity(existingBook);
                
                try {
                    Book updatedBook = bookRepository.save(existingBook);
                    log.info("[AdminBookController] Book updated successfully: {} (ID: {})", updatedBook.getTitle(), id);
                    return ResponseEntity.ok(AdminBookDTO.fromEntity(updatedBook));
                } catch (Exception e) {
                    log.error("[AdminBookController] Error updating book ID {}: {}", id, e.getMessage(), e);
                    throw e;
                }
            })
            .orElseGet(() -> {
                log.warn("[AdminBookController] Book not found with ID: {} for update", id);
                return ResponseEntity.notFound().build();
            });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
        log.debug("[AdminBookController] DELETE /admin/books/{} - Deleting book", id);
        if (bookRepository.existsById(id)) {
            try {
                bookRepository.deleteById(id);
                log.info("[AdminBookController] Book deleted successfully (ID: {})", id);
                return ResponseEntity.noContent().build();
            } catch (Exception e) {
                log.error("[AdminBookController] Error deleting book ID {}: {}", id, e.getMessage(), e);
                throw e;
            }
        }
        log.warn("[AdminBookController] Book not found with ID: {} for deletion", id);
        return ResponseEntity.notFound().build();
    }

    @PatchMapping(value = "/{id}/toggle-active", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AdminBookDTO> toggleBookActive(@PathVariable Long id) {
        log.debug("[AdminBookController] PATCH /admin/books/{}/toggle-active", id);
        return bookRepository.findById(id)
            .map(book -> {
                book.setActive(!book.isActive());
                Book saved = bookRepository.save(book);
                log.info("[AdminBookController] Book {} active status toggled to: {}", id, saved.isActive());
                return ResponseEntity.ok(AdminBookDTO.fromEntity(saved));
            })
            .orElseGet(() -> {
                log.warn("[AdminBookController] Book not found with ID: {} for toggle", id);
                return ResponseEntity.notFound().build();
            });
    }

    @PatchMapping(value = "/{id}/toggle-featured", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AdminBookDTO> toggleBookFeatured(@PathVariable Long id) {
        log.debug("[AdminBookController] PATCH /admin/books/{}/toggle-featured", id);
        return bookRepository.findById(id)
            .map(book -> {
                book.setFeatured(!book.getFeatured());
                Book saved = bookRepository.save(book);
                log.info("[AdminBookController] Book {} featured status toggled to: {}", id, saved.getFeatured());
                return ResponseEntity.ok(AdminBookDTO.fromEntity(saved));
            })
            .orElseGet(() -> {
                log.warn("[AdminBookController] Book not found with ID: {} for toggle featured", id);
                return ResponseEntity.notFound().build();
            });
    }
}