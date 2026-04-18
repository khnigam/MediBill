package com.ujjwalMedical.repository;

import com.ujjwalMedical.entity.PurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface PurchaseItemRepository extends JpaRepository<PurchaseItem, Long> {
    List<PurchaseItem> findByPurchaseIdOrderByIdAsc(Long purchaseId);

    @Query(
            "SELECT pi FROM PurchaseItem pi JOIN FETCH pi.purchase p LEFT JOIN FETCH p.supplier "
                    + "WHERE pi.batch.id = :batchId ORDER BY p.purchaseDate ASC, p.id ASC, pi.id ASC")
    List<PurchaseItem> findPurchaseHistoryForBatch(@Param("batchId") Long batchId);
    boolean existsByBatchId(Long batchId);
    boolean existsByMedicineId(Long medicineId);

    @Transactional
    void deleteByPurchaseId(Long purchaseId);
}
