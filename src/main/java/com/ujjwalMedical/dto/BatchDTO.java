package com.ujjwalMedical.dto;

import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchDTO {
    private Long id;
    @Column(name = "batch_number")
    private String batchNo;
    private LocalDate expiryDate;
    private Double mrp;
    private Double purchaseRate;
    private Integer quantity;
}
