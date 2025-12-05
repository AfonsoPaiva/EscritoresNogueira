package main.java.com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatsDTO {
    private int cartItemsCount;
    private int totalPurchases;
    private BigDecimal totalSpent;
    private int totalBooksOwned;
}
