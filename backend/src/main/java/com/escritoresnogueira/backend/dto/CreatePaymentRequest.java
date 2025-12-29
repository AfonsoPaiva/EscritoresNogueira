package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import com.escritoresnogueira.backend.dto.ShippingDTO;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentRequest {
    private List<PaymentItemDTO> items;
    private ShippingDTO shipping;
    private String successUrl;
    private String cancelUrl;
    private String customerEmail;
    private String customerPhone;
}
