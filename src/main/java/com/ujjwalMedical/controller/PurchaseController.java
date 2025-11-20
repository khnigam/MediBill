package com.ujjwalMedical.controller;

import com.ujjwalMedical.dto.PurchaseRequest;
import com.ujjwalMedical.entity.Purchase;
import com.ujjwalMedical.repository.PurchaseRepository;
import com.ujjwalMedical.service.PurchaseService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchases")
@CrossOrigin(origins = "*")
public class PurchaseController {

    private final PurchaseService purchaseService;
    private final PurchaseRepository purchaseRepo;

    public PurchaseController(PurchaseService purchaseService, PurchaseRepository purchaseRepo) {
        this.purchaseService = purchaseService;
        this.purchaseRepo = purchaseRepo;
    }

    @PostMapping
    public Purchase createPurchase(@RequestBody PurchaseRequest request) {
        return purchaseService.createPurchase(request);
    }

    @GetMapping("/{id}")
    public Purchase getPurchase(@PathVariable Long id) {
        return purchaseRepo.findById(id).orElseThrow(() -> new RuntimeException("Purchase not found"));
    }

    @GetMapping
    public List<Purchase> listPurchases() {
        return purchaseRepo.findAll();
    }
}
