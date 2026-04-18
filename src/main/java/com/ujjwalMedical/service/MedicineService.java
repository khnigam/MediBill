package com.ujjwalMedical.service;

import com.ujjwalMedical.dto.MedicineSummaryDTO;
import com.ujjwalMedical.entity.Batch;
import com.ujjwalMedical.entity.Medicine;
import com.ujjwalMedical.entity.Sale;
import com.ujjwalMedical.repository.BatchRepository;
import com.ujjwalMedical.repository.MedicineRepository;
import com.ujjwalMedical.repository.PurchaseItemRepository;
import com.ujjwalMedical.repository.SaleRepository;
import com.ujjwalMedical.repository.SaleItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDate;

@Service
public class MedicineService {

    private final MedicineRepository repo;
    private final SaleRepository saleRepo;
    private final BatchRepository batchRepo;
    private final PurchaseItemRepository purchaseItemRepo;
    private final SaleItemRepository saleItemRepo;

    public MedicineService(
            MedicineRepository repo,
            SaleRepository saleRepo,
            BatchRepository batchRepo,
            PurchaseItemRepository purchaseItemRepo,
            SaleItemRepository saleItemRepo
    ) {
        this.repo = repo;
        this.saleRepo = saleRepo;
        this.batchRepo = batchRepo;
        this.purchaseItemRepo = purchaseItemRepo;
        this.saleItemRepo = saleItemRepo;
    }

    public List<MedicineSummaryDTO> getSummary() {
        return repo.getMedicineSummary();
    }

    public List<Map<String, Object>> searchMedicines(String query) {
        List<Medicine> meds = repo.searchByName(query.toLowerCase());

        return meds.stream().map(med -> {
            List<Batch> activeBatches = med.getBatches().stream()
                    .filter(b -> b.getActive() == null || b.getActive())
                    .toList();

            List<Map<String, Object>> batchList = activeBatches.stream().map(b -> {
                Map<String, Object> batchMap = new HashMap<>();
                batchMap.put("batchId", b.getId());
                batchMap.put("batchNo", b.getBatchNo());
                batchMap.put("quantity", b.getQuantity()); // Add quantity here
                batchMap.put("mrp", b.getMrp());
                batchMap.put("gst", b.getGst());
                batchMap.put("expiryDate", b.getExpiryDate());
                return batchMap;
            }).toList();

            Double medicineGst = activeBatches.stream()
                    .max((a, b) -> Integer.compare(
                            a.getQuantity() == null ? 0 : a.getQuantity(),
                            b.getQuantity() == null ? 0 : b.getQuantity()
                    ))
                    .map(Batch::getGst)
                    .orElse(5.0);

            Map<String, Object> medMap = new HashMap<>();
            medMap.put("medicineId", med.getId());
            medMap.put("medicineName", med.getName());
            medMap.put("gst", medicineGst);
            medMap.put("batches", batchList);

            return medMap;
        }).toList();
    }

    public double getTotalSalesThisMonth() {
        LocalDate now = LocalDate.now();
        LocalDate start = now.withDayOfMonth(1);
        LocalDate end = start.plusMonths(1);
        Double total = saleRepo.sumTotalAmountBetween(start, end);
        return total == null ? 0.0 : total;
    }

    public int countLowStockMedicines() {
        // Keep threshold consistent with frontend "low stock" indicator
        return (int) repo.countMedicinesWithTotalQuantityLessThan(50);
    }

    public int countExpiringSoonMedicines(int months) {
        LocalDate cutoff = LocalDate.now().plusMonths(months);
        return (int) repo.countMedicinesExpiringOnOrBefore(cutoff);
    }

    public List<Map<String, Object>> getLowStockAlerts(int threshold) {
        return repo.findLowStockMedicineRows(threshold).stream().map(row -> {
            String name = row[0] == null ? "" : String.valueOf(row[0]);
            int stock = row[1] instanceof Number ? ((Number) row[1]).intValue() : 0;

            String levelClass;
            if (stock < 15) {
                levelClass = "critical";
            } else if (stock < 30) {
                levelClass = "warning";
            } else {
                levelClass = "ok";
            }

            Map<String, Object> item = new HashMap<>();
            item.put("name", name);
            item.put("stock", stock);
            item.put("levelClass", levelClass);
            return item;
        }).toList();
    }

    public List<Map<String, Object>> getRecentSales() {
        return saleRepo.findTop10ByOrderBySaleDateDescIdDesc().stream().map(this::toRecentSaleItem).toList();
    }

    private Map<String, Object> toRecentSaleItem(Sale sale) {
        String invoiceNo = sale.getInvoiceNumber() == null ? "-" : sale.getInvoiceNumber();
        String customerName = sale.getCustomer() != null && sale.getCustomer().getName() != null
                ? sale.getCustomer().getName()
                : "Walk-in Customer";
        double amount = sale.getTotalAmount() == null ? 0.0 : sale.getTotalAmount();

        Map<String, Object> item = new HashMap<>();
        item.put("type", "sale");
        item.put("title", "Sale #" + invoiceNo);
        item.put("sub", customerName);
        item.put("amount", amount);
        return item;
    }

    @Transactional
    public void deleteBatch(Long batchId) {
        Batch batch = batchRepo.findById(batchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));
        batch.setActive(false);
        batchRepo.save(batch);
    }

    @Transactional
    public void deleteMedicine(Long medicineId) {
        Medicine medicine = repo.findById(medicineId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medicine not found"));
        medicine.setActive(false);
        repo.save(medicine);

        // Keep related batches but mark them disabled as well.
        List<Batch> batches = batchRepo.findByMedicineId(medicineId);
        for (Batch b : batches) {
            b.setActive(false);
            batchRepo.save(b);
        }
    }

}
