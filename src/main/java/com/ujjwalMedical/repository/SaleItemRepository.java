package com.ujjwalMedical.repository;

import com.ujjwalMedical.entity.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {
    boolean existsByBatchId(Long batchId);
    List<SaleItem> findBySaleIdOrderByIdAsc(Long saleId);
    void deleteBySaleId(Long saleId);
}

