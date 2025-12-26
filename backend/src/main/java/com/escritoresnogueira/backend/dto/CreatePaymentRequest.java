package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentRequest {
    private List<PaymentItemDTO> items;
    private String successUrl;
    private String cancelUrl;
    private String customerEmail;
    private String customerPhone;
}
