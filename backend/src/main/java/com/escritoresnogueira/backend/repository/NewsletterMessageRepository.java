package com.escritoresnogueira.backend.repository;

import com.escritoresnogueira.backend.model.NewsletterMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NewsletterMessageRepository extends JpaRepository<NewsletterMessage, Long> {
}
