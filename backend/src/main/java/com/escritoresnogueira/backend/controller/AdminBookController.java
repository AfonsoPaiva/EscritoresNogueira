package main.java.com.escritoresnogueira.backend.controller;

import lombok.RequiredArgsConstructor; 
import main.java.com.escritoresnogueira.backend.model.Book;
import main.java.com.escritoresnogueira.backend.model.Category;
import main.java.com.escritoresnogueira.backend.repository.BookRepository;
import main.java.com.escritoresnogueira.backend.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize; 
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/admin/books")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5500", "http://127.0.0.1:5500"})
@PreAuthorize("hasRole('ADMIN')")
public class AdminBookController {

    private final BookRepository bookRepository;
    private final CategoryRepository categoryRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @PostMapping(consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Book> createBook(HttpServletRequest request) throws IOException {
        Book book = objectMapper.readValue(request.getInputStream(), Book.class);
        Book saved = bookRepository.save(book);
        return ResponseEntity.ok(saved);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Book> updateBook(@PathVariable Long id, HttpServletRequest request) throws IOException {
        Book book = objectMapper.readValue(request.getInputStream(), Book.class);
        return bookRepository.findById(id)
            .map(existingBook -> {
                existingBook.setTitle(book.getTitle());
                existingBook.setSlug(book.getSlug());
                existingBook.setDescription(book.getDescription());
                existingBook.setAuthor(book.getAuthor());
                existingBook.setPrice(book.getPrice());
                existingBook.setCoverImage(book.getCoverImage());
                existingBook.setIsbn(book.getIsbn());
                existingBook.setLanguage(book.getLanguage());
                existingBook.setPublisher(book.getPublisher());
                existingBook.setCategory(book.getCategory());
                
                Book updatedBook = bookRepository.save(existingBook);
                return ResponseEntity.ok(updatedBook);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
        if (bookRepository.existsById(id)) {
            bookRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        return ResponseEntity.ok(categories);
    }

    @PostMapping("/categories")
    public ResponseEntity<Category> createCategory(@RequestBody Category category) {
        Category savedCategory = categoryRepository.save(category);
        return ResponseEntity.ok(savedCategory);
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<Category> updateCategory(@PathVariable Long id, @RequestBody Category category) {
        return categoryRepository.findById(id)
            .map(existing -> {
                existing.setName(category.getName());
                existing.setSlug(category.getSlug());
                existing.setDescription(category.getDescription());
                Category updated = categoryRepository.save(existing);
                return ResponseEntity.ok(updated);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        if (categoryRepository.existsById(id)) {
            categoryRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}