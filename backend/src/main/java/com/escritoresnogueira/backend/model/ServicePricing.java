package com.escritoresnogueira.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "service_pricing")
@Getter
@Setter
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServicePricing extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String plano; // "essencial", "profissional", "premium"

    @Column(nullable = false)
    private BigDecimal precoAtual;

    @Column
    private BigDecimal precoAntigo; // null se não houver desconto

    @Column
    private Integer descontoPercentagem; // null se não houver desconto

    @Column(nullable = false)
    private boolean emPromocao = false;

    @Column(length = 500)
    private String descricaoPromocao;
}