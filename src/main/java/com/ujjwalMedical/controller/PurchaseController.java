package com.ujjwalMedical.controller;

import com.ujjwalMedical.dto.PurchaseRequest;
import com.ujjwalMedical.entity.Batch;
import com.ujjwalMedical.entity.Medicine;
import com.ujjwalMedical.entity.PurchaseItem;
import com.ujjwalMedical.entity.Purchase;
import com.ujjwalMedical.entity.Supplier;
import com.ujjwalMedical.repository.BatchRepository;
import com.ujjwalMedical.repository.MedicineRepository;
import com.ujjwalMedical.repository.PurchaseItemRepository;
import com.ujjwalMedical.repository.PurchaseRepository;
import com.ujjwalMedical.repository.SupplierRepository;
import com.ujjwalMedical.service.BatchActivePolicy;
import com.ujjwalMedical.service.PurchaseBillAiService;
import com.ujjwalMedical.service.PurchaseService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchases")
@CrossOrigin(origins = "*")
public class PurchaseController {

    private final PurchaseService purchaseService;
    private final PurchaseRepository purchaseRepo;
    private final PurchaseItemRepository purchaseItemRepo;
    private final MedicineRepository medicineRepo;
    private final BatchRepository batchRepo;
    private final SupplierRepository supplierRepo;
    private final PurchaseBillAiService purchaseBillAiService;
    @PersistenceContext
    private EntityManager entityManager;

    public PurchaseController(
            PurchaseService purchaseService,
            PurchaseRepository purchaseRepo,
            PurchaseItemRepository purchaseItemRepo,
            MedicineRepository medicineRepo,
            BatchRepository batchRepo,
            SupplierRepository supplierRepo,
            PurchaseBillAiService purchaseBillAiService
    ) {
        this.purchaseService = purchaseService;
        this.purchaseRepo = purchaseRepo;
        this.purchaseItemRepo = purchaseItemRepo;
        this.medicineRepo = medicineRepo;
        this.batchRepo = batchRepo;
        this.supplierRepo = supplierRepo;
        this.purchaseBillAiService = purchaseBillAiService;
    }

    /**
     * Invoice PDF/photo → line items for bill import. Multipart field name must be {@code file}.
     * Lives under {@code /api/purchases} so it is registered with the same controller as other purchase APIs.
     */
    @PostMapping("/bill-ai-extract")
    public Map<String, Object> billAiExtract(@RequestPart("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing or empty file.");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (java.io.IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read uploaded file.");
        }
        List<Map<String, Object>> lines = purchaseBillAiService.extractLineItems(
                bytes,
                file.getOriginalFilename(),
                file.getContentType()
        );
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("lines", lines);
        return body;
    }

    @PostMapping
    public Purchase createPurchase(@RequestBody PurchaseRequest request) {
        return purchaseService.createPurchase(request);
    }

    @GetMapping("/{id:\\d+}")
    public Purchase getPurchase(@PathVariable Long id) {
        return purchaseRepo.findById(id).orElseThrow(() -> new RuntimeException("Purchase not found"));
    }

    @GetMapping
    public List<Purchase> listPurchases() {
        return purchaseRepo.findAll();
    }

    @GetMapping("/recent")
    public List<Map<String, Object>> listRecentPurchases(@RequestParam(defaultValue = "") String query) {
        return purchaseRepo.searchRecentBySupplierOrInvoice(query).stream().map(p -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", p.getId());
            row.put("purchaseDate", p.getPurchaseDate());
            row.put("supplierName", p.getSupplier() != null ? p.getSupplier().getName() : "");
            row.put("purchaseId", p.getInvoiceNo());
            row.put("totalAmount", p.getTotalAmount() != null ? p.getTotalAmount() : 0.0);
            row.put("status", "Received");
            return row;
        }).toList();
    }

    @GetMapping("/{id:\\d+}/details")
    public Map<String, Object> getPurchaseDetails(@PathVariable Long id) {
        Purchase p = purchaseRepo.findById(id).orElseThrow(() -> new RuntimeException("Purchase not found"));
        List<PurchaseItem> items = purchaseItemRepo.findByPurchaseIdOrderByIdAsc(id);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", p.getId());
        body.put("purchaseDate", p.getPurchaseDate());
        body.put("invoiceNo", p.getInvoiceNo());
        body.put("supplierId", p.getSupplier() != null ? p.getSupplier().getId() : null);
        body.put("supplierName", p.getSupplier() != null ? p.getSupplier().getName() : "");
        body.put("paymentType", p.getPaymentType());
        body.put("purchaseType", p.getPurchaseType());
        body.put("taxType", p.getTaxType());
        body.put("rateType", p.getRateType());
        body.put("totalAmount", p.getTotalAmount() != null ? p.getTotalAmount() : 0.0);
        body.put("totalGst", p.getTotalGst() != null ? p.getTotalGst() : 0.0);
        body.put("items", items.stream().map(this::toItemMap).toList());
        return body;
    }

    @PutMapping("/{id:\\d+}")
    @Transactional
    public Map<String, Object> updatePurchase(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Purchase p = purchaseRepo.findById(id).orElseThrow(() -> new RuntimeException("Purchase not found"));

        p.setInvoiceNo(asString(payload.get("invoiceNo"), p.getInvoiceNo()));
        p.setPaymentType(asString(payload.get("paymentType"), p.getPaymentType()));
        p.setRateType(asString(firstPresent(payload, "rateType", "rate_type"), p.getRateType()));
        p.setTaxType(asString(firstPresent(payload, "taxType", "tax_type"), p.getTaxType()));
        p.setPurchaseType(asString(firstPresent(payload, "purchaseType", "purchase_type"), p.getPurchaseType()));
        p.setPurchaseDate(parseDate(payload.get("purchaseDate"), p.getPurchaseDate()));
        Long supplierId = asLong(firstPresent(payload, "supplierId", "distributor_id"), null);
        if (supplierId != null) {
            Supplier supplier = supplierRepo.findById(supplierId)
                    .orElseThrow(() -> new RuntimeException("Supplier not found: " + supplierId));
            p.setSupplier(supplier);
        }

        // Revert previously added stock from old purchase items before rebuilding items.
        List<PurchaseItem> oldItems = purchaseItemRepo.findByPurchaseIdOrderByIdAsc(id);
        for (PurchaseItem old : oldItems) {
            Batch oldBatch = old.getBatch();
            if (oldBatch != null) {
                int oldQty = old.getQuantity() != null ? old.getQuantity() : 0;
                int currentQty = oldBatch.getQuantity() != null ? oldBatch.getQuantity() : 0;
                oldBatch.setQuantity(Math.max(currentQty - oldQty, 0));
                BatchActivePolicy.syncActiveFromQuantity(oldBatch);
                batchRepo.save(oldBatch);
            }
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
        purchaseItemRepo.deleteByPurchaseId(id);

        double totalAmount = 0;
        double totalGst = 0;
        if (items != null) {
            for (Map<String, Object> row : items) {
                PurchaseItem item = new PurchaseItem();
                item.setPurchase(p);
                Long medicineId = asLong(row.get("medicineId"), null);
                String medicineName = asString(row.get("medicineName"), "");
                Medicine medicine = resolveMedicine(medicineId, medicineName);
                item.setMedicine(medicine);

                item.setBatchNo(asString(row.get("batchNo"), ""));
                item.setQuantity(asInt(row.get("quantity"), 0));
                item.setUnitPrice(asDouble(row.get("unitPrice"), 0));
                item.setNetUnitPrice(asDouble(row.get("netUnitPrice"), item.getUnitPrice()));
                item.setTaxPercent(asDouble(row.get("taxPercent"), 0));
                item.setExpiry(parseExpiry(row.get("expiry")));
                item.setTotalAmount(item.getNetUnitPrice() * item.getQuantity());
                item.setGstAmount(item.getTotalAmount() * (item.getTaxPercent() / 100.0));

                boolean onBill = "stock_update".equalsIgnoreCase(p.getPurchaseType());
                Batch batch = batchRepo
                        .findByMedicineIdAndBatchNo(medicine.getId(), item.getBatchNo(), onBill)
                        .orElseGet(() -> {
                            Batch b = new Batch();
                            b.setMedicine(medicine);
                            b.setBatchNo(item.getBatchNo());
                            b.setOnBill(onBill);
                            b.setQuantity(0);
                            return b;
                        });
                int currentBatchQty = batch.getQuantity() != null ? batch.getQuantity() : 0;
                batch.setQuantity(currentBatchQty + item.getQuantity());
                BatchActivePolicy.syncActiveFromQuantity(batch);
                batch.setMrp(asDouble(row.get("mrp"), batch.getMrp() == null ? 0 : batch.getMrp()));
                LocalDate expiry = parseExpiry(row.get("expiry"));
                if (expiry != null) {
                    batch.setExpiryDate(expiry);
                }
                batchRepo.save(batch);
                item.setBatch(batch);

                totalAmount += item.getTotalAmount();
                totalGst += item.getGstAmount();
                purchaseItemRepo.save(item);
            }
        }

        p.setTotalAmount(totalAmount);
        p.setTotalGst(totalGst);
        purchaseRepo.saveAndFlush(p);
        entityManager.refresh(p);
        return getPurchaseDetails(id);
    }

    @DeleteMapping("/{id:\\d+}")
    @Transactional
    public void deletePurchase(@PathVariable Long id) {
        Purchase p = purchaseRepo.findById(id).orElseThrow(() -> new RuntimeException("Purchase not found"));

        // Revert stock additions linked to this purchase before deleting it.
        List<PurchaseItem> items = purchaseItemRepo.findByPurchaseIdOrderByIdAsc(id);
        for (PurchaseItem item : items) {
            Batch batch = item.getBatch();
            if (batch != null) {
                int itemQty = item.getQuantity() != null ? item.getQuantity() : 0;
                int currentQty = batch.getQuantity() != null ? batch.getQuantity() : 0;
                batch.setQuantity(Math.max(currentQty - itemQty, 0));
                BatchActivePolicy.syncActiveFromQuantity(batch);
                batchRepo.save(batch);
            }
        }

        purchaseRepo.delete(p);
    }

    private Map<String, Object> toItemMap(PurchaseItem item) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", item.getId());
        row.put("medicineId", item.getMedicine() != null ? item.getMedicine().getId() : null);
        row.put("medicineName", item.getMedicine() != null ? item.getMedicine().getName() : "");
        row.put("batchNo", item.getBatchNo());
        row.put("quantity", item.getQuantity() != null ? item.getQuantity() : 0);
        row.put("unitPrice", item.getUnitPrice() != null ? item.getUnitPrice() : 0.0);
        row.put("netUnitPrice", item.getNetUnitPrice() != null ? item.getNetUnitPrice() : 0.0);
        row.put("taxPercent", item.getTaxPercent() != null ? item.getTaxPercent() : 0.0);
        row.put("expiry", item.getExpiry());
        row.put("mrp", item.getBatch() != null && item.getBatch().getMrp() != null ? item.getBatch().getMrp() : 0.0);
        row.put("totalAmount", item.getTotalAmount() != null ? item.getTotalAmount() : 0.0);
        return row;
    }

    private String asString(Object value, String defaultValue) {
        return value == null ? defaultValue : String.valueOf(value);
    }

    private int asInt(Object value, int defaultValue) {
        if (value instanceof Number n) return n.intValue();
        try {
            return value == null ? defaultValue : Integer.parseInt(String.valueOf(value));
        } catch (Exception ex) {
            return defaultValue;
        }
    }

    private Long asLong(Object value, Long defaultValue) {
        if (value instanceof Number n) return n.longValue();
        try {
            return value == null ? defaultValue : Long.parseLong(String.valueOf(value));
        } catch (Exception ex) {
            return defaultValue;
        }
    }

    private double asDouble(Object value, double defaultValue) {
        if (value instanceof Number n) return n.doubleValue();
        try {
            return value == null ? defaultValue : Double.parseDouble(String.valueOf(value));
        } catch (Exception ex) {
            return defaultValue;
        }
    }

    private LocalDate parseDate(Object value, LocalDate defaultValue) {
        try {
            return value == null ? defaultValue : LocalDate.parse(String.valueOf(value));
        } catch (Exception ex) {
            return defaultValue;
        }
    }

    private LocalDate parseExpiry(Object value) {
        if (value == null) return null;
        String s = String.valueOf(value).trim();
        if (s.isEmpty()) return null;
        try {
            // ISO format yyyy-MM-dd
            return LocalDate.parse(s);
        } catch (Exception ignored) {
        }
        // DDMMYYYY format
        if (s.length() == 8 && s.chars().allMatch(Character::isDigit)) {
            int day = Integer.parseInt(s.substring(0, 2));
            int month = Integer.parseInt(s.substring(2, 4));
            int year = Integer.parseInt(s.substring(4, 8));
            try {
                return LocalDate.of(year, month, day);
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private Object firstPresent(Map<String, Object> payload, String... keys) {
        for (String key : keys) {
            if (payload.containsKey(key) && payload.get(key) != null) {
                return payload.get(key);
            }
        }
        return null;
    }

    private Medicine resolveMedicine(Long medicineId, String medicineName) {
        if (medicineId != null) {
            return medicineRepo.findById(medicineId)
                    .orElseThrow(() -> new RuntimeException("Medicine not found: " + medicineId));
        }
        Medicine med = new Medicine();
        med.setName(medicineName == null || medicineName.isBlank() ? "Unnamed Medicine" : medicineName);
        med.setBrand(null);
        med.setSku(null);
        return medicineRepo.save(med);
    }
}
