package com.example.MediBill.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "batches")
public class Batch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String batchNumber;

    private Integer stock;
    private Double mrp;
    private Double sellingPrice;
    private LocalDate expiryDate;

    // Many batches belong to one medicine
    @ManyToOne
    @JoinColumn(name = "medicine_id")
    private Medicine medicine;

    // --- Constructors ---
    public Batch() {}

    public Batch(String batchNumber, Integer stock, Double mrp, Double sellingPrice, LocalDate expiryDate) {
        this.batchNumber = batchNumber;
        this.stock = stock;
        this.mrp = mrp;
        this.sellingPrice = sellingPrice;
        this.expiryDate = expiryDate;
    }

    // --- Getters and Setters ---
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBatchNumber() {
        return batchNumber;
    }

    public void setBatchNumber(String batchNumber) {
        this.batchNumber = batchNumber;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public Double getMrp() {
        return mrp;
    }

    public void setMrp(Double mrp) {
        this.mrp = mrp;
    }

    public Double getSellingPrice() {
        return sellingPrice;
    }

    public void setSellingPrice(Double sellingPrice) {
        this.sellingPrice = sellingPrice;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public Medicine getMedicine() {
        return medicine;
    }

    public void setMedicine(Medicine medicine) {
        this.medicine = medicine;
    }
}
