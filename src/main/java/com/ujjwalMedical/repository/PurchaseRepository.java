package com.ujjwalMedical.repository;

import com.ujjwalMedical.entity.Purchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    List<Purchase> findAllByOrderByPurchaseDateDescIdDesc();

    @Query("""
        SELECT p
        FROM Purchase p
        LEFT JOIN p.supplier s
        WHERE (:query IS NULL OR :query = ''
               OR LOWER(COALESCE(s.name, '')) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(COALESCE(p.invoiceNo, '')) LIKE LOWER(CONCAT('%', :query, '%')))
        ORDER BY p.purchaseDate DESC, p.id DESC
    """)
    List<Purchase> searchRecentBySupplierOrInvoice(@Param("query") String query);
}
