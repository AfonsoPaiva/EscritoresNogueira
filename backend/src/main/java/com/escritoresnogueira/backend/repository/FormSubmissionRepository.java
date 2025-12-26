package com.escritoresnogueira.backend.repository;

import com.escritoresnogueira.backend.model.FormSubmission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FormSubmissionRepository extends JpaRepository<FormSubmission, Long> {

    Page<FormSubmission> findAll(Pageable pageable);
}
