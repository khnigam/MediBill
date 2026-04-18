package com.ujjwalMedical.repository;

import com.ujjwalMedical.entity.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {
    boolean existsByBatchId(Long batchId);

    @Query(
            "SELECT si FROM SaleItem si JOIN FETCH si.sale WHERE si.batch.id = :batchId "
                    + "ORDER BY si.sale.saleDate ASC, si.sale.id ASC, si.id ASC")
    List<SaleItem> findSaleHistoryForBatch(@Param("batchId") Long batchId);

    List<SaleItem> findBySaleIdOrderByIdAsc(Long saleId);

    void deleteBySaleId(Long saleId);
}

