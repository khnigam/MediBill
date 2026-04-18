package com.ujjwalMedical.controller;

import com.ujjwalMedical.dto.BatchDTO;
import com.ujjwalMedical.entity.Batch;
import com.ujjwalMedical.repository.BatchRepository;
import com.ujjwalMedical.service.MedicineService;

import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/medicines")
@CrossOrigin(origins = "*")
public class MedicineBatchController {

    private final BatchRepository batchRepository;
    private final MedicineService medicineService;

    public MedicineBatchController(BatchRepository batchRepository, MedicineService medicineService) {
        this.batchRepository = batchRepository;
        this.medicineService = medicineService;
    }

    @GetMapping("/{medicineId}/batches")
    public List<BatchDTO> getBatches(@PathVariable Long medicineId) {

        List<Batch> batches = batchRepository.findByMedicineId(medicineId);

        // Newest batches first (identity PK order matches typical insert order).
        return batches.stream()
                .sorted(Comparator.comparing(Batch::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(b -> new BatchDTO(
                        b.getId(),
                        b.getBatchNo(),
                        b.getExpiryDate(),
                        b.getMrp(),
                        b.getPurchaseRate(),
                        b.getQuantity(),
                        b.getActive() == null ? true : b.getActive()
                ))
                .toList();
    }

    @DeleteMapping("/batches/{batchId}")
    public void deleteBatch(@PathVariable Long batchId) {
        medicineService.deleteBatch(batchId);
    }
}
