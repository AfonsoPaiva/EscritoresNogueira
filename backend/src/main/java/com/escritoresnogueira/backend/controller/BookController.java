package main.java.com.escritoresnogueira.backend.controller;

import main.java.com.escritoresnogueira.backend.model.Book;
import main.java.com.escritoresnogueira.backend.repository.BookRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/books")
@CrossOrigin(origins = "*")
public class BookController {

    @Autowired
    private BookRepository bookRepository;

    @GetMapping
    public ResponseEntity<List<Book>> getAllBooks() {
        List<Book> books = bookRepository.findByActiveTrue();
        return ResponseEntity.ok(books);
    }

    @GetMapping("/featured")
    public ResponseEntity<List<Book>> getFeaturedBooks() {
        List<Book> books = bookRepository.findByFeaturedTrueAndActiveTrue();
        return ResponseEntity.ok(books);
    }

    @GetMapping("/{slug}")
    public ResponseEntity<Book> getBookBySlug(@PathVariable String slug) {
        return bookRepository.findBySlug(slug)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
