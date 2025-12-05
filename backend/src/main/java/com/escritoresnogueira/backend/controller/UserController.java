package main.java.com.escritoresnogueira.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import main.java.com.escritoresnogueira.backend.dto.UpdateProfileDTO;
import main.java.com.escritoresnogueira.backend.dto.UserProfileDTO;
import main.java.com.escritoresnogueira.backend.dto.UserStatsDTO;
import main.java.com.escritoresnogueira.backend.model.Order;
import main.java.com.escritoresnogueira.backend.model.User;
import main.java.com.escritoresnogueira.backend.model.UserSession;
import main.java.com.escritoresnogueira.backend.repository.OrderRepository;
import main.java.com.escritoresnogueira.backend.repository.UserRepository;
import main.java.com.escritoresnogueira.backend.service.UserSessionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/user")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class UserController {

    private final UserSessionService sessionService;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    
    private static final String SESSION_HEADER = "X-Session-Token";

    /**
     * Get current user's profile
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken) {
        
        Optional<User> userOpt = getUserFromSession(sessionToken);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                "error", true,
                "message", "Sessão inválida ou expirada"
            ));
        }

        User user = userOpt.get();
        
        UserProfileDTO profile = UserProfileDTO.builder()
                .email(user.getEmail())
                .name(user.getName())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .address(user.getAddress())
                .postalCode(user.getPostalCode())
                .city(user.getCity())
                .country(user.getCountry())
                .photoUrl(user.getPhotoUrl())
                .createdAt(user.getCreatedAt())
                .build();

        return ResponseEntity.ok(profile);
    }

    /**
     * Update current user's profile
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken,
            @RequestBody UpdateProfileDTO updateDTO) {
        
        Optional<User> userOpt = getUserFromSession(sessionToken);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                "error", true,
                "message", "Sessão inválida ou expirada"
            ));
        }

        User user = userOpt.get();
        
        // Update fields
        if (updateDTO.getFirstName() != null) {
            user.setFirstName(updateDTO.getFirstName());
        }
        if (updateDTO.getLastName() != null) {
            user.setLastName(updateDTO.getLastName());
        }
        if (updateDTO.getPhone() != null) {
            user.setPhone(updateDTO.getPhone());
        }
        if (updateDTO.getAddress() != null) {
            user.setAddress(updateDTO.getAddress());
        }
        if (updateDTO.getPostalCode() != null) {
            user.setPostalCode(updateDTO.getPostalCode());
        }
        if (updateDTO.getCity() != null) {
            user.setCity(updateDTO.getCity());
        }
        if (updateDTO.getCountry() != null) {
            user.setCountry(updateDTO.getCountry());
        }
        
        // Update display name if first/last name changed
        String newName = buildDisplayName(updateDTO.getFirstName(), updateDTO.getLastName());
        if (newName != null && !newName.isBlank()) {
            user.setName(newName);
        }
        
        userRepository.save(user);
        log.info("✅ Profile updated for user: {}", user.getEmail());

        UserProfileDTO profile = UserProfileDTO.builder()
                .email(user.getEmail())
                .name(user.getName())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .address(user.getAddress())
                .postalCode(user.getPostalCode())
                .city(user.getCity())
                .country(user.getCountry())
                .photoUrl(user.getPhotoUrl())
                .createdAt(user.getCreatedAt())
                .build();

        return ResponseEntity.ok(profile);
    }

    /**
     * Get user statistics (purchases, cart items, etc.)
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken) {
        
        Optional<User> userOpt = getUserFromSession(sessionToken);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                "error", true,
                "message", "Sessão inválida ou expirada"
            ));
        }

        User user = userOpt.get();
        
        // Calculate user statistics
        List<Order> userOrders = orderRepository.findByUserId(
            user.getId(), 
            PageRequest.of(0, 1000, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).getContent();
        
        int totalPurchases = userOrders.size();
        BigDecimal totalSpent = userOrders.stream()
                .filter(o -> o.getPaymentStatus() == Order.PaymentStatus.PAID)
                .map(Order::getTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        int totalBooksOwned = userOrders.stream()
                .filter(o -> o.getPaymentStatus() == Order.PaymentStatus.PAID)
                .flatMap(o -> o.getItems().stream())
                .mapToInt(item -> item.getQuantity())
                .sum();
        
        // Cart items count (from frontend localStorage - we can't access it from backend)
        // The frontend will need to track this separately
        int cartItemsCount = 0;
        
        UserStatsDTO stats = UserStatsDTO.builder()
                .cartItemsCount(cartItemsCount)
                .totalPurchases(totalPurchases)
                .totalSpent(totalSpent)
                .totalBooksOwned(totalBooksOwned)
                .build();

        return ResponseEntity.ok(stats);
    }

    /**
     * Get user's orders
     */
    @GetMapping("/orders")
    public ResponseEntity<?> getOrders(
            @RequestHeader(value = SESSION_HEADER, required = false) String sessionToken,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Optional<User> userOpt = getUserFromSession(sessionToken);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                "error", true,
                "message", "Sessão inválida ou expirada"
            ));
        }

        User user = userOpt.get();
        
        Page<Order> orders = orderRepository.findByUserId(
            user.getId(),
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        return ResponseEntity.ok(orders.getContent());
    }

    /**
     * Helper method to get user from session token
     */
    private Optional<User> getUserFromSession(String sessionToken) {
        if (sessionToken == null || sessionToken.isBlank()) {
            return Optional.empty();
        }
        
        return sessionService.validateSession(sessionToken)
                .map(UserSession::getUser);
    }
    
    /**
     * Build display name from first and last name
     */
    private String buildDisplayName(String firstName, String lastName) {
        StringBuilder sb = new StringBuilder();
        if (firstName != null && !firstName.isBlank()) {
            sb.append(firstName.trim());
        }
        if (lastName != null && !lastName.isBlank()) {
            if (sb.length() > 0) {
                sb.append(" ");
            }
            sb.append(lastName.trim());
        }
        return sb.toString();
    }
}
