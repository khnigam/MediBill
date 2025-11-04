package com.example.MediBill.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "medicines")
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String manufacturer;

    // One medicine has many batches
    @OneToMany(mappedBy = "medicine", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Batch> batches = new ArrayList<>();

    // --- Constructors ---
    public Medicine() {}

    public Medicine(String name, String manufacturer) {
        this.name = name;
        this.manufacturer = manufacturer;
    }

    // --- Getters and Setters ---
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public void setManufacturer(String manufacturer) {
        this.manufacturer = manufacturer;
    }

    public List<Batch> getBatches() {
        return batches;
    }

    public void setBatches(List<Batch> batches) {
        this.batches = batches;
    }

    // Utility method — helpful for adding batches easily
    public void addBatch(Batch batch) {
        batches.add(batch);
        batch.setMedicine(this);
    }

    public void removeBatch(Batch batch) {
        batches.remove(batch);
        batch.setMedicine(null);
    }
}
