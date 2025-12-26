package com.escritoresnogueira.backend.controller;

import com.escritoresnogueira.backend.model.Order;
import com.escritoresnogueira.backend.repository.OrderRepository;
import com.escritoresnogueira.backend.repository.UserRepository;
import com.escritoresnogueira.backend.repository.BlogPostRepository;
import com.escritoresnogueira.backend.repository.BookRepository;
import com.escritoresnogueira.backend.repository.BookCommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/admin/api")
@RequiredArgsConstructor
public class AdminApiController {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final BlogPostRepository blogPostRepository;
    private final BookRepository bookRepository;
    private final BookCommentRepository bookCommentRepository;
    private final JdbcTemplate jdbcTemplate;

    @Value("${spring.application.name:escritoresnogueira-backend}")
    private String appName;

    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> m = new HashMap<>();
        m.put("app", appName);
        m.put("serverTime", Instant.now().toString());

        try {
            // Basic DB check
            Integer one = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            m.put("dbOk", one != null && one == 1);
        } catch (Exception e) {
            m.put("dbOk", false);
            m.put("dbError", e.getMessage());
        }

        // counts
        try {
            long totalOrders = orderRepository.count();
            long totalUsers = userRepository.count();
            long paidOrders = orderRepository.countByPaymentStatus(Order.PaymentStatus.PAID);
            m.put("totalOrders", totalOrders);
            m.put("totalUsers", totalUsers);
            m.put("paidOrders", paidOrders);
        } catch (Exception ex) {
            m.put("countsError", ex.getMessage());
        }

        return m;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        Map<String, Object> m = new HashMap<>();
        try {
            m.put("books", bookRepository.count());
            m.put("posts", blogPostRepository.count());
            m.put("orders", orderRepository.count());
            m.put("pendingComments", bookCommentRepository.countByStatus("pending"));

            // Order status counts
            Map<String, Long> orderStatusCounts = new HashMap<>();
            for (Order.OrderStatus status : Order.OrderStatus.values()) {
                orderStatusCounts.put(status.name(), orderRepository.countByStatus(status));
            }
            m.put("orderStatusCounts", orderStatusCounts);

            // Add some chart data (simplified)
            // orders by day - last 7 days
            List<Map<String, Object>> ordersByDay = new ArrayList<>();
            for (int i = 6; i >= 0; i--) {
                LocalDate day = LocalDate.now().minusDays(i);
                long count = orderRepository.findByCreatedAtBetween(
                    day.atStartOfDay(), 
                    day.plusDays(1).atStartOfDay()
                ).size();
                Map<String, Object> item = new HashMap<>();
                item.put("day", day.toString());
                item.put("count", count);
                ordersByDay.add(item);
            }
            m.put("ordersByDay", ordersByDay);

            // revenue by day (simplified, assuming total is revenue)
            m.put("revenueByDay", ordersByDay.stream().map(o -> {
                Map<String, Object> r = new HashMap<>();
                r.put("day", o.get("day"));
                r.put("total", ((Long)o.get("count")) * 10.0); // dummy revenue
                return r;
            }).collect(Collectors.toList()));

            // users by day - dummy
            m.put("usersByDay", ordersByDay.stream().map(o -> {
                Map<String, Object> u = new HashMap<>();
                u.put("day", o.get("day"));
                u.put("count", ((Long)o.get("count")) / 2); // dummy users
                return u;
            }).collect(Collectors.toList()));

            // top items - dummy
            List<Map<String, Object>> topItems = List.of(
                Map.of("name", "Book 1", "count", 10),
                Map.of("name", "Book 2", "count", 8)
            );
            m.put("topItems", topItems);

        } catch (Exception e) {
            // ignore, return empty
        }
        return m;
    }

    @GetMapping("/recent-activity")
    public List<Map<String, Object>> recentActivity() {
        // Return recent orders as activity
        return orderRepository.findAll(PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent().stream()
            .map(order -> {
                Map<String, Object> item = new HashMap<>();
                item.put("type", "order");
                item.put("id", order.getId());
                item.put("description", "Order #" + order.getId() + " - " + order.getTotal() + "€");
                item.put("timestamp", order.getCreatedAt());
                return item;
            })
            .collect(Collectors.toList());
    }
}
