package com.escritoresnogueira.backend.repository;

import com.escritoresnogueira.backend.model.NewsletterClient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NewsletterClientRepository extends JpaRepository<NewsletterClient, Long> {

    Optional<NewsletterClient> findByEmail(String email);

    Optional<NewsletterClient> findByEmailAndActiveTrue(String email);

    List<NewsletterClient> findByActiveTrue();

    Optional<NewsletterClient> findByUnsubscribeToken(String token);

    @Query("SELECT COUNT(c) FROM NewsletterClient c WHERE c.active = true")
    long countByActiveTrue();
}