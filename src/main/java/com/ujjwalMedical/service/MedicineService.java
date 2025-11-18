package com.ujjwalMedical.service;

import com.ujjwalMedical.dto.MedicineSummaryDTO;
import com.ujjwalMedical.entity.Medicine;
import com.ujjwalMedical.repository.MedicineRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MedicineService {

    private final MedicineRepository repo;

    public MedicineService(MedicineRepository repo) {
        this.repo = repo;
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

}
