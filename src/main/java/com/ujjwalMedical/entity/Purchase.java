package com.ujjwalMedical.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "purchases")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"items", "supplier"})
public class Purchase {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String invoiceNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"purchases"})
    private Supplier supplier;

    private LocalDate purchaseDate;

    private String purchaseType;  // stock_update
    private String paymentType;   // credit
    private String rateType;      // none
    private String taxType;       // inclusive

    private Double totalAmount;
    private Double totalGst;

    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "purchase", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseItem> items;
}
