package main.java.com.escritoresnogueira.backend.controller;

import main.java.com.escritoresnogueira.backend.dto.BookDTO;
import main.java.com.escritoresnogueira.backend.model.Book;
import main.java.com.escritoresnogueira.backend.repository.BookRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/books")
@CrossOrigin(origins = "*")
public class BookController {

    @Autowired
    private BookRepository bookRepository;

    @GetMapping
    public ResponseEntity<List<BookDTO>> getAllBooks() {
        List<Book> books = bookRepository.findByActiveTrue();
        List<BookDTO> bookDTOs = books.stream()
                .map(BookDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(bookDTOs);
    }

    @GetMapping("/featured")
    public ResponseEntity<List<BookDTO>> getFeaturedBooks() {
        List<Book> books = bookRepository.findByFeaturedTrueAndActiveTrue();
        List<BookDTO> bookDTOs = books.stream()
                .map(BookDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(bookDTOs);
    }

    @GetMapping("/{identifier}")
    public ResponseEntity<BookDTO> getBook(@PathVariable String identifier) {
        // Try to parse as ID first
        try {
            Long id = Long.parseLong(identifier);
            return bookRepository.findById(id)
                .filter(Book::isActive)
                .map(book -> {
                    // Increment view count when book is accessed
                    book.setViewCount(book.getViewCount() + 1);
                    bookRepository.save(book);
                    return ResponseEntity.ok(BookDTO.fromEntity(book));
                })
                .orElse(ResponseEntity.notFound().build());
        } catch (NumberFormatException e) {
            // If not a number, treat as slug
            return bookRepository.findBySlug(identifier)
                .filter(Book::isActive)
                .map(book -> {
                    // Increment view count when book is accessed
                    book.setViewCount(book.getViewCount() + 1);
                    bookRepository.save(book);
                    return ResponseEntity.ok(BookDTO.fromEntity(book));
                })
                .orElse(ResponseEntity.notFound().build());
        }
    }
}
