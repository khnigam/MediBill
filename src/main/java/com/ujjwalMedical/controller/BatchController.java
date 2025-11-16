package com.ujjwalMedical.controller;
import com.ujjwalMedical.entity.Batch;
import com.ujjwalMedical.entity.PurchaseItem;
import com.ujjwalMedical.repository.BatchRepository;
import com.ujjwalMedical.repository.PurchaseItemRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;


@RestController
@RequestMapping("/api/batches")
public class BatchController {
    private final BatchRepository batchRepo;
    private final PurchaseItemRepository itemRepo;

    public BatchController(BatchRepository batchRepo, PurchaseItemRepository itemRepo) {
        this.batchRepo = batchRepo;
        this.itemRepo = itemRepo;
    }

    @GetMapping("/medicine/{medicineId}")
    public List<Batch> getBatchesForMedicine(@PathVariable Long medicineId) {
        return batchRepo.findAll().stream().filter(b -> b.getMedicine().getId().equals(medicineId)).toList();
    }

    @GetMapping("/{batchId}/history")
    public List<PurchaseItem> getBatchHistory(@PathVariable Long batchId) {
        return itemRepo.findAll().stream().filter(it -> it.getBatch() != null && it.getBatch().getId().equals(batchId)).toList();
    }
}
