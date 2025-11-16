package com.ujjwalMedical.repository;

import com.ujjwalMedical.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BatchRepository extends JpaRepository<Batch, Long> {
    Optional<Batch> findByMedicineIdAndBatchNo(Long medicineId, String batchNo);
    List<Batch> findByMedicineId(Long medicineId);
}
