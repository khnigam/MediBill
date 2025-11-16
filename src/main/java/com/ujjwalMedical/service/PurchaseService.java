package com.ujjwalMedical.service;

import com.ujjwalMedical.entity.*;
import com.ujjwalMedical.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class PurchaseService {

    private final PurchaseRepository purchaseRepo;
    private final BatchRepository batchRepo;
    private final MedicineRepository medicineRepo;
    private final SupplierRepository supplierRepo;

    public PurchaseService(PurchaseRepository purchaseRepo, BatchRepository batchRepo,
                           MedicineRepository medicineRepo, SupplierRepository supplierRepo) {
        this.purchaseRepo = purchaseRepo;
        this.batchRepo = batchRepo;
        this.medicineRepo = medicineRepo;
        this.supplierRepo = supplierRepo;
    }

    @Transactional
    public Purchase createPurchase(Purchase purchaseRequest) {
        // resolve supplier (optional check)
        if (purchaseRequest.getSupplier() != null && purchaseRequest.getSupplier().getId() != null) {
            Supplier s = supplierRepo.findById(purchaseRequest.getSupplier().getId())
                    .orElseThrow(() -> new RuntimeException("Supplier not found"));
            purchaseRequest.setSupplier(s);
        }

        // For each item => find/create batch and update quantity
        List<PurchaseItem> items = purchaseRequest.getItems();
        for (PurchaseItem item : items) {
            Long medId = item.getMedicine().getId();
            Medicine med = medicineRepo.findById(medId)
                    .orElseThrow(() -> new RuntimeException("Medicine not found id=" + medId));
            item.setMedicine(med);
            String batchNo = item.getBatchNo();
            Batch batch = null;
            if (batchNo != null) {
                Optional<Batch> existing = batchRepo.findByMedicineIdAndBatchNo(medId, batchNo);
                if (existing.isPresent()) {
                    batch = existing.get();
                    // update rates if changed
                    if (item.getNetRate() != null) batch.setPurchaseRate(item.getNetRate());
                    if (item.getBillingRate() != null) batch.setMrp(item.getBillingRate());
                    // increase quantity
                    int newQty = (batch.getQuantity() == null ? 0 : batch.getQuantity()) + (item.getQuantity() == null ? 0 : item.getQuantity());
                    batch.setQuantity(newQty);
                } else {
                    // create new batch
                    batch = new Batch();
                    batch.setMedicine(med);
                    batch.setBatchNo(batchNo);
                    batch.setPurchaseRate(item.getNetRate());
                    batch.setMrp(item.getBillingRate());
                    batch.setQuantity(item.getQuantity() == null ? 0 : item.getQuantity());
                }
                batch = batchRepo.save(batch);
                item.setBatch(batch);
            }
            // link item -> purchase will be set later
        }

        // Save purchase and cascade items
        purchaseRequest.setCreatedAt(java.time.LocalDateTime.now());
        Purchase saved = purchaseRepo.save(purchaseRequest);

        // set purchase reference on items and save handled by cascade if mapped
        for (PurchaseItem it : saved.getItems()) {
            it.setPurchase(saved);
        }

        return saved;
    }
}
