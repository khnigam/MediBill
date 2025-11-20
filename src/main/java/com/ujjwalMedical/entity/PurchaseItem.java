package com.ujjwalMedical.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;

@Entity
@Table(name = "purchase_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"purchase", "medicine", "batch"})
public class PurchaseItem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_id")
    @JsonIgnore
    private Purchase purchase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id")
    private Medicine medicine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private Batch batch;

    private String batchNo;

    private Integer quantity;
    private Double unitPrice;      // before tax
    private Double netUnitPrice;   // after tax
    private Double taxPercent;     // tax field from payload
    private LocalDate expiry;

    private Double gstAmount;      // tax amount for qty
    private Double totalAmount;    // (net_unit_price * qty)
}
