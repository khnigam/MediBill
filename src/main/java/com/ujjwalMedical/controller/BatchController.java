package com.ujjwalMedical.controller;

import com.ujjwalMedical.entity.Purchase;
import com.ujjwalMedical.entity.PurchaseItem;
import com.ujjwalMedical.entity.Sale;
import com.ujjwalMedical.entity.SaleItem;
import com.ujjwalMedical.entity.Supplier;
import com.ujjwalMedical.repository.BatchRepository;
import com.ujjwalMedical.repository.PurchaseItemRepository;
import com.ujjwalMedical.repository.SaleItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/batches")
@CrossOrigin(origins = "*")
public class BatchController {
    private final BatchRepository batchRepo;
    private final PurchaseItemRepository purchaseItemRepo;
    private final SaleItemRepository saleItemRepo;

    public BatchController(
            BatchRepository batchRepo,
            PurchaseItemRepository purchaseItemRepo,
            SaleItemRepository saleItemRepo) {
        this.batchRepo = batchRepo;
        this.purchaseItemRepo = purchaseItemRepo;
        this.saleItemRepo = saleItemRepo;
    }

    /**
     * Ledger-style movements for one batch: purchases add stock (+), sales remove (-),
     * sorted oldest-first with running balance.
     */
    @GetMapping("/{batchId}/history")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getBatchHistory(@PathVariable Long batchId) {
        if (!batchRepo.existsById(batchId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found: " + batchId);
        }

        List<Map<String, Object>> rows = new ArrayList<>();

        for (PurchaseItem pi : purchaseItemRepo.findPurchaseHistoryForBatch(batchId)) {
            Purchase p = pi.getPurchase();
            LocalDate d = p != null && p.getPurchaseDate() != null ? p.getPurchaseDate() : LocalDate.now();
            Supplier s = p != null ? p.getSupplier() : null;
            int qty = pi.getQuantity() != null ? pi.getQuantity() : 0;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("kind", "PURCHASE");
            m.put("date", d.toString());
            m.put("reference", p != null && p.getInvoiceNo() != null ? p.getInvoiceNo() : "");
            m.put("counterparty", s != null && s.getName() != null ? s.getName() : "");
            m.put("quantityDelta", qty);
            m.put("sourceType", "purchase");
            m.put("sourceId", p != null ? p.getId() : null);
            m.put("lineId", pi.getId());
            rows.add(m);
        }

        for (SaleItem si : saleItemRepo.findSaleHistoryForBatch(batchId)) {
            Sale sale = si.getSale();
            LocalDate d = sale != null && sale.getSaleDate() != null ? sale.getSaleDate() : LocalDate.now();
            int raw = si.getQuantity() != null ? si.getQuantity() : 0;
            int delta = raw == 0 ? 0 : -Math.abs(raw);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("kind", "SALE");
            m.put("date", d.toString());
            m.put("reference", sale != null && sale.getInvoiceNumber() != null ? sale.getInvoiceNumber() : "");
            m.put(
                    "counterparty",
                    sale != null && sale.getCustomerName() != null ? sale.getCustomerName() : "");
            m.put("quantityDelta", delta);
            m.put("sourceType", "sale");
            m.put("sourceId", sale != null ? sale.getId() : null);
            m.put("lineId", si.getId());
            rows.add(m);
        }

        rows.sort(
                Comparator.comparing((Map<String, Object> m) -> LocalDate.parse(String.valueOf(m.get("date"))))
                        .thenComparing(m -> "PURCHASE".equals(m.get("kind")) ? 0 : 1)
                        .thenComparing(
                                m -> m.get("sourceId") instanceof Number n ? n.longValue() : 0L)
                        .thenComparing(
                                m -> m.get("lineId") instanceof Number n ? n.longValue() : 0L));

        int balance = 0;
        for (Map<String, Object> m : rows) {
            balance += ((Number) m.get("quantityDelta")).intValue();
            m.put("balanceAfter", balance);
        }

        return rows;
    }
}
