package com.ujjwalMedical.controller;

import com.ujjwalMedical.dto.BatchDTO;
import com.ujjwalMedical.entity.Batch;
import com.ujjwalMedical.repository.BatchRepository;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/medicines")
@CrossOrigin(origins = "*")
public class MedicineBatchController {

    private final BatchRepository batchRepository;

    public MedicineBatchController(BatchRepository batchRepository) {
        this.batchRepository = batchRepository;
    }

    @GetMapping("/{medicineId}/batches")
    public List<BatchDTO> getBatches(@PathVariable Long medicineId) {

        List<Batch> batches = batchRepository.findByMedicineId(medicineId);

        return batches.stream()
                .map(b -> new BatchDTO(
                        b.getId(),
                        b.getBatchNo(),
                        b.getExpiryDate(),
                        b.getMrp(),
                        b.getPurchaseRate(),
                        b.getQuantity()
                ))
                .toList();
    }
}
