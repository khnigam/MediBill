package com.ujjwalMedical.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "purchase_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_id")
    private Purchase purchase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id")
    private Medicine medicine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private Batch batch; // may be null and created during purchase

    private String batchNo; // keep the batchNo used on invoice

    private Integer quantity;
    private Double gstAmount;
    private Double netRate;
    private Double billingRate;
}
