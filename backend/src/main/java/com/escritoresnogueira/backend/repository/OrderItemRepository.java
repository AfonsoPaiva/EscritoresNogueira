package main.java.com.escritoresnogueira.backend.repository;

import main.java.com.escritoresnogueira.backend.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    
    List<OrderItem> findByOrderId(Long orderId);
    
    @Query("SELECT oi FROM OrderItem oi WHERE oi.book.id = :bookId")
    List<OrderItem> findByBookId(@Param("bookId") Long bookId);
    
    @Query("SELECT oi.book.id, SUM(oi.quantity) FROM OrderItem oi " +
           "WHERE oi.order.createdAt BETWEEN :startDate AND :endDate " +
           "GROUP BY oi.book.id " +
           "ORDER BY SUM(oi.quantity) DESC")
    List<Object[]> findTopSellingBooks(
        @Param("startDate") LocalDateTime startDate, 
        @Param("endDate") LocalDateTime endDate
    );
}
