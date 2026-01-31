package com.escritoresnogueira.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServicosPrecosDTO {
    private String plano; // "essencial", "profissional", "premium"
    private BigDecimal precoAtual;
    private BigDecimal precoAntigo; // null se não houver desconto
    private Integer descontoPercentagem; // null se não houver desconto
    private boolean emPromocao;
    private String descricaoPromocao;
}