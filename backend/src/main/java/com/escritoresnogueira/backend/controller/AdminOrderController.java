package com.escritoresnogueira.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.escritoresnogueira.backend.model.Order;
import com.escritoresnogueira.backend.model.UserSession;
import com.escritoresnogueira.backend.model.OrderStatusHistory;
import com.escritoresnogueira.backend.repository.OrderRepository;
import com.escritoresnogueira.backend.repository.OrderStatusHistoryRepository;
import com.escritoresnogueira.backend.service.UserSessionService;
import com.escritoresnogueira.backend.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository historyRepository;
    private final UserSessionService sessionService;
    private final EmailService emailService;
    @org.springframework.beans.factory.annotation.Value("${app.frontend.url:https://www.escritoresnogueira.com/conta#orders}")
    private String frontendUrl;

    private static final String SESSION_HEADER = "X-Session-Token";

    private Optional<UserSession> resolveAdminSession(String sessionToken) {
        Optional<UserSession> usOpt = sessionService.validateSession(sessionToken);
        if (usOpt.isPresent() && usOpt.get().getUser() != null && usOpt.get().getUser().getRoles().contains("ROLE_ADMIN")) {
            return usOpt;
        }
        return Optional.empty();
    }

    private boolean hasAdminAccess(String sessionToken) {
        Optional<UserSession> usOpt = resolveAdminSession(sessionToken);
        if (usOpt.isPresent()) return true;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return auth.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .anyMatch("ROLE_ADMIN"::equals);
        }
        return false;
    }

    private String actorEmail(String sessionToken) {
        Optional<UserSession> usOpt = resolveAdminSession(sessionToken);
        if (usOpt.isPresent() && usOpt.get().getUser() != null && usOpt.get().getUser().getEmail() != null) {
            return usOpt.get().getUser().getEmail();
        }
        return "admin-user";
    }

    private Map<String, Object> toOrderSummary(Order order) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", order.getId());
        m.put("orderNumber", order.getOrderNumber());
        m.put("customerEmail", order.getCustomerEmail());
        m.put("total", order.getTotal());
        m.put("status", order.getStatus());
        m.put("paymentStatus", order.getPaymentStatus());
        m.put("paymentMethod", order.getPaymentMethod());
        m.put("createdAt", order.getCreatedAt());
        m.put("updatedAt", order.getUpdatedAt());
        return m;
    }

    private Map<String, Object> toOrderDetail(Order order) {
        Map<String, Object> m = toOrderSummary(order);
        m.put("paymentId", order.getPaymentId());
        m.put("receiptUrl", order.getReceiptUrl());
        m.put("invoicePdfUrl", order.getInvoicePdfUrl());
        m.put("shippingAddress", order.getShippingAddress());

        List<Map<String, Object>> itemDtos = new ArrayList<>();
        if (order.getItems() != null) {
            order.getItems().forEach(item -> {
                Map<String, Object> i = new HashMap<>();
                i.put("id", item.getId());
                i.put("quantity", item.getQuantity());
                i.put("price", item.getPrice());
                if (item.getBook() != null) {
                    Map<String, Object> b = new HashMap<>();
                    b.put("id", item.getBook().getId());
                    b.put("title", item.getBook().getTitle());
                    b.put("slug", item.getBook().getSlug());
                    b.put("coverImage", item.getBook().getCoverImage());
                    i.put("book", b);
                }
                itemDtos.add(i);
            });
        }
        m.put("items", itemDtos);
        return m;
    }

    @PatchMapping("/orders/{orderId}/status")
    public ResponseEntity<?> updateOrderStatus(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken,
            @PathVariable Long orderId,
            @RequestBody Map<String,String> body) {

        if (!hasAdminAccess(sessionToken)) {
            return ResponseEntity.status(403).body(Map.of("error","forbidden"));
        }

        if (body == null || !body.containsKey("status")) {
            return ResponseEntity.badRequest().body(Map.of("error","missing status"));
        }

        String newStatusRaw = body.get("status");
        Order.OrderStatus newStatus;
        try {
            newStatus = Order.OrderStatus.valueOf(newStatusRaw.toUpperCase());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error","invalid status"));
        }

        Optional<Order> ordOpt = orderRepository.findById(orderId);
        if (ordOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error","order not found"));

        Order order = ordOpt.get();
        Order.OrderStatus prev = order.getStatus();
        order.setStatus(newStatus);
        orderRepository.save(order);

        // record history
        try {
            OrderStatusHistory h = OrderStatusHistory.builder()
                    .order(order)
                    .oldStatus(prev != null ? prev.name() : null)
                    .newStatus(newStatus.name())
                        .changedBy(actorEmail(sessionToken))
                    .changedAt(LocalDateTime.now())
                    .build();
            historyRepository.save(h);
        } catch (Exception e) {
            log.warn("Failed to persist order history: {}", e.getMessage());
        }

        // send notification for notable transitions
        try {
            String customerEmail = order.getCustomerEmail();
            if (customerEmail != null && !customerEmail.isBlank()) {
                if (newStatus == Order.OrderStatus.SHIPPED) {
                    String subj = "Pedido enviado - " + order.getOrderNumber();
                    String html = "<p>O seu pedido foi enviado.</p><p>Pode acompanhar a sua encomenda aqui: <a href='" + frontendUrl + "' target='_blank'>Acompanhar Encomenda</a></p>";
                    String text = "O seu pedido foi enviado.\n\nPode acompanhar a sua encomenda aqui: " + frontendUrl;
                    emailService.sendTransactionalEmail(customerEmail, subj, html, text);
                } else if (newStatus == Order.OrderStatus.DELIVERED) {
                    String subj = "Pedido realizado - " + order.getOrderNumber();
                    String html = "<p>O seu pedido foi concluído. Obrigado!</p><p>Pode acompanhar a sua encomenda aqui: <a href='" + frontendUrl + "' target='_blank'>Acompanhar Encomenda</a></p>";
                    String text = "O seu pedido foi concluído. Obrigado!\n\nPode acompanhar a sua encomenda aqui: " + frontendUrl;
                    emailService.sendTransactionalEmail(customerEmail, subj, html, text);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send status notification: {}", e.getMessage());
        }

        log.info("Admin {} changed order {} status {} -> {}", actorEmail(sessionToken), orderId, prev, newStatus);

        return ResponseEntity.ok(Map.of("orderId", orderId, "status", newStatus.name()));
    }

    @GetMapping("/orders")
    @Transactional(readOnly = true)
    public ResponseEntity<?> listOrders(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status
    ) {
        if (!hasAdminAccess(sessionToken)) {
            return ResponseEntity.status(403).body(Map.of("error", "forbidden"));
        }

        try {
            PageRequest pr = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<Order> ordersPage;
            if (status != null && !status.isBlank()) {
                try {
                    Order.OrderStatus st = Order.OrderStatus.valueOf(status.toUpperCase());
                    ordersPage = orderRepository.findByStatus(st, pr);
                } catch (Exception e) {
                    return ResponseEntity.badRequest().body(Map.of("error", "invalid status"));
                }
            } else {
                ordersPage = orderRepository.findAll(pr);
            }

            List<Map<String, Object>> orders = ordersPage.getContent().stream()
                    .map(this::toOrderSummary)
                    .toList();

            return ResponseEntity.ok(Map.of(
                    "page", ordersPage.getNumber(),
                    "size", ordersPage.getSize(),
                    "totalElements", ordersPage.getTotalElements(),
                    "totalPages", ordersPage.getTotalPages(),
                    "orders", orders
            ));
        } catch (Exception e) {
            log.error("Failed to list orders: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "internal"));
        }
    }

    /**
     * Admin: delete all orders for a given user id. By default will NOT delete PAID orders.
     * Use query param `force=true` to also remove PAID orders (use with caution).
     */
    @DeleteMapping("/users/{userId}/orders")
    public ResponseEntity<?> deleteOrdersForUser(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken,
            @PathVariable Long userId,
            @RequestParam(required = false, defaultValue = "false") boolean force) {

        if (!hasAdminAccess(sessionToken)) {
            return ResponseEntity.status(403).body(Map.of("error","forbidden"));
        }

        try {
            java.util.List<Order> orders = orderRepository.findAllByUserId(userId);
            if (orders == null || orders.isEmpty()) return ResponseEntity.ok(Map.of("deleted", 0));

            // If not forcing, prevent deletion when any order is PAID
            if (!force) {
                boolean hasPaid = orders.stream().anyMatch(o -> o.getPaymentStatus() == Order.PaymentStatus.PAID);
                if (hasPaid) {
                    return ResponseEntity.status(400).body(Map.of("error", "contains_paid_orders", "message", "Some orders are PAID; pass force=true to remove them"));
                }
            }

            orderRepository.deleteAll(orders);
            return ResponseEntity.ok(Map.of("deleted", orders.size()));
        } catch (Exception e) {
            log.error("Failed to delete orders for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "internal", "detail", e.getMessage()));
        }
    }

    /**
     * Admin: get a single order by id
     */
    @GetMapping("/orders/{orderId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getOrderById(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken,
            @PathVariable Long orderId) {

        if (!hasAdminAccess(sessionToken)) {
            return ResponseEntity.status(403).body(Map.of("error","forbidden"));
        }

        Optional<Order> ordOpt = orderRepository.findById(orderId);
        if (ordOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error","order not found"));
        return ResponseEntity.ok(toOrderDetail(ordOpt.get()));
    }

    /**
     * Admin: delete a single order by id. Use `?force=true` to delete paid orders.
     */
    @DeleteMapping("/orders/{orderId}")
    public ResponseEntity<?> deleteOrderById(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken,
            @PathVariable Long orderId,
            @RequestParam(required = false, defaultValue = "false") boolean force) {

        if (!hasAdminAccess(sessionToken)) {
            return ResponseEntity.status(403).body(Map.of("error","forbidden"));
        }

        Optional<Order> ordOpt = orderRepository.findById(orderId);
        if (ordOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error","order not found"));

        Order order = ordOpt.get();
        if (!force && order.getPaymentStatus() == Order.PaymentStatus.PAID) {
            return ResponseEntity.status(400).body(Map.of("error","contains_paid_order", "message", "Order is PAID; pass force=true to remove"));
        }

        try {
            orderRepository.delete(order);
            log.info("Admin {} deleted order {} (force={})", actorEmail(sessionToken), orderId, force);
            return ResponseEntity.ok(Map.of("deleted", true, "orderId", orderId));
        } catch (Exception e) {
            log.error("Failed to delete order {}: {}", orderId, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error","internal", "detail", e.getMessage()));
        }
    }

    /**
     * Admin: patch order fields (shippingAddress, customerEmail)
     */
    @PatchMapping("/orders/{orderId}")
    public ResponseEntity<?> patchOrderFields(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken,
            @PathVariable Long orderId,
            @RequestBody Map<String, Object> body) {

        if (!hasAdminAccess(sessionToken)) {
            return ResponseEntity.status(403).body(Map.of("error","forbidden"));
        }

        Optional<Order> ordOpt = orderRepository.findById(orderId);
        if (ordOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error","order not found"));

        try {
            Order order = ordOpt.get();
            boolean changed = false;
            if (body.containsKey("shippingAddress")) {
                Object v = body.get("shippingAddress");
                order.setShippingAddress(v == null ? null : String.valueOf(v));
                changed = true;
            }
            if (body.containsKey("customerEmail")) {
                Object v = body.get("customerEmail");
                order.setCustomerEmail(v == null ? null : String.valueOf(v));
                changed = true;
            }
            if (changed) {
                orderRepository.save(order);
                log.info("Admin {} patched order {}", actorEmail(sessionToken), orderId);
            }
            return ResponseEntity.ok(Map.of("orderId", orderId));
        } catch (Exception e) {
            log.error("Failed to patch order {}: {}", orderId, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error","internal", "detail", e.getMessage()));
        }
    }
}
