package com.ujjwalMedical.repository;

import com.ujjwalMedical.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface BatchRepository extends JpaRepository<Batch, Long> {
    @Query("SELECT b FROM Batch b WHERE b.medicine.id = :medicineId AND b.batchNo = :batchNo AND b.onBill = :onBill")
    Optional<Batch> findByMedicineIdAndBatchNo(Long medicineId, String batchNo, Boolean onBill);
    List<Batch> findByMedicineId(Long medicineId);
}
