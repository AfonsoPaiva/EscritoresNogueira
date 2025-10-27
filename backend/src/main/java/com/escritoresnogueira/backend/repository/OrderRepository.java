package main.java.com.escritoresnogueira.backend.repository;

import main.java.com.escritoresnogueira.backend.model.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    Optional<Order> findByOrderNumber(String orderNumber);
    
    Page<Order> findByUserId(Long userId, Pageable pageable);
    
    Page<Order> findByStatus(Order.OrderStatus status, Pageable pageable);
    
    Page<Order> findByPaymentStatus(Order.PaymentStatus paymentStatus, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.customerEmail = :email")
    Page<Order> findByCustomerEmail(@Param("email") String email, Pageable pageable);
    
    @Query("SELECT o FROM Order o WHERE o.createdAt BETWEEN :startDate AND :endDate")
    List<Order> findByCreatedAtBetween(
        @Param("startDate") LocalDateTime startDate, 
        @Param("endDate") LocalDateTime endDate
    );
    
    @Query("SELECT o FROM Order o WHERE o.status = :status AND o.createdAt < :date")
    List<Order> findStaleOrders(
        @Param("status") Order.OrderStatus status, 
        @Param("date") LocalDateTime date
    );
    
    Long countByStatus(Order.OrderStatus status);
    
    @Query("SELECT COUNT(o) FROM Order o WHERE o.paymentStatus = :status")
    Long countByPaymentStatus(@Param("status") Order.PaymentStatus status);
}
