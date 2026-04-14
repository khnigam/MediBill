package com.ujjwalMedical.controller;

import com.ujjwalMedical.entity.Sale;
import com.ujjwalMedical.repository.SaleRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sales")
@CrossOrigin(origins = "*")
public class SaleController {

    private final SaleRepository saleRepository;

    public SaleController(SaleRepository saleRepository) {
        this.saleRepository = saleRepository;
    }

    @GetMapping
    public List<Map<String, Object>> getSalesList() {
        return saleRepository.findAllByOrderBySaleDateDescIdDesc().stream().map(this::toRow).toList();
    }

    private Map<String, Object> toRow(Sale sale) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", sale.getId());
        row.put("invoiceNumber", sale.getInvoiceNumber());
        row.put("date", sale.getSaleDate());
        row.put("customer", sale.getCustomer() != null ? sale.getCustomer().getName() : "Walk-in Customer");
        row.put("totalAmount", sale.getTotalAmount() != null ? sale.getTotalAmount() : 0.0);
        row.put("status", "Completed");
        return row;
    }
}

