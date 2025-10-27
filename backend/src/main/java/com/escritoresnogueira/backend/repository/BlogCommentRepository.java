package main.java.com.escritoresnogueira.backend.repository;

import main.java.com.escritoresnogueira.backend.model.BlogComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BlogCommentRepository extends JpaRepository<BlogComment, Long> {
    
    Page<BlogComment> findByPostIdAndApprovedTrue(Long postId, Pageable pageable);
    
    Page<BlogComment> findByPostId(Long postId, Pageable pageable);
    
    List<BlogComment> findByPostIdAndApprovedTrueAndParentIsNull(Long postId);
    
    Page<BlogComment> findByApprovedFalse(Pageable pageable);
    
    Long countByApprovedFalse();
    
    Long countByPostIdAndApprovedTrue(Long postId);
}
