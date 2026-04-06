package com.ujjwalMedical.service;

import com.ujjwalMedical.dto.MedicineSummaryDTO;
import com.ujjwalMedical.entity.Medicine;
import com.ujjwalMedical.repository.MedicineRepository;
import com.ujjwalMedical.repository.SaleRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDate;

@Service
public class MedicineService {

    private final MedicineRepository repo;
    private final SaleRepository saleRepo;

    public MedicineService(MedicineRepository repo, SaleRepository saleRepo) {
        this.repo = repo;
        this.saleRepo = saleRepo;
    }

    public List<MedicineSummaryDTO> getSummary() {
        return repo.getMedicineSummary();
    }

    public List<Map<String, Object>> searchMedicines(String query) {
        List<Medicine> meds = repo.searchByName(query.toLowerCase());

        return meds.stream().map(med -> {
            List<Map<String, Object>> batchList = med.getBatches().stream().map(b -> {
                Map<String, Object> batchMap = new HashMap<>();
                batchMap.put("batchId", b.getId());
                batchMap.put("batchNo", b.getBatchNo());
                return batchMap;
            }).toList();

            Map<String, Object> medMap = new HashMap<>();
            medMap.put("medicineId", med.getId());
            medMap.put("medicineName", med.getName());
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

}
