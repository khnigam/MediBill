package com.ujjwalMedical.controller;

import com.ujjwalMedical.entity.Sale;
import com.ujjwalMedical.entity.SaleItem;
import com.ujjwalMedical.entity.Batch;
import com.ujjwalMedical.entity.Customer;
import com.ujjwalMedical.entity.Medicine;
import com.ujjwalMedical.repository.BatchRepository;
import com.ujjwalMedical.repository.CustomerRepository;
import com.ujjwalMedical.repository.MedicineRepository;
import com.ujjwalMedical.repository.SaleItemRepository;
import com.ujjwalMedical.repository.SaleRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sales")
@CrossOrigin(origins = "*")
public class SaleController {

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final BatchRepository batchRepository;
    private final MedicineRepository medicineRepository;
    private final CustomerRepository customerRepository;

    public SaleController(
            SaleRepository saleRepository,
            SaleItemRepository saleItemRepository,
            BatchRepository batchRepository,
            MedicineRepository medicineRepository,
            CustomerRepository customerRepository
    ) {
        this.saleRepository = saleRepository;
        this.saleItemRepository = saleItemRepository;
        this.batchRepository = batchRepository;
        this.medicineRepository = medicineRepository;
        this.customerRepository = customerRepository;
    }

    @GetMapping
    public List<Map<String, Object>> getSalesList() {
        return saleRepository.findAllByOrderBySaleDateDescIdDesc().stream().map(this::toRow).toList();
    }

    @GetMapping("/{id:\\d+}/details")
    public Map<String, Object> getSaleDetails(@PathVariable Long id) {
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
        List<SaleItem> items = saleItemRepository.findBySaleIdOrderByIdAsc(id);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", sale.getId());
        body.put("invoiceNumber", sale.getInvoiceNumber());
        body.put("date", sale.getSaleDate());
        body.put("customerId", sale.getCustomer() != null ? sale.getCustomer().getId() : null);
        body.put("customerName", getSaleCustomerName(sale));
        body.put("saleType", sale.getSaleType() != null ? sale.getSaleType() : "sale");
        body.put("totalAmount", sale.getTotalAmount() != null ? sale.getTotalAmount() : 0.0);
        body.put("items", items.stream().map(this::toItemRow).toList());
        return body;
    }

    @PostMapping
    @Transactional
    public Map<String, Object> createSale(@RequestBody Map<String, Object> payload) {
        Sale sale = new Sale();
        sale.setInvoiceNumber(asString(payload.get("invoiceNumber"), ""));
        sale.setSaleDate(parseDate(payload.get("date"), LocalDate.now()));
        sale.setTotalAmount(0.0);
        sale.setSaleType(asString(payload.get("saleType"), "sale"));

        Long customerId = asLong(payload.get("customerId"), null);
        String customerName = asString(payload.get("customerName"), "").trim();
        if (customerId != null) {
            Customer customer = customerRepository.findById(customerId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer not found"));
            sale.setCustomer(customer);
            sale.setCustomerName(customer.getOwnerName() != null && !customer.getOwnerName().isBlank()
                    ? customer.getOwnerName()
                    : customer.getName());
        } else if (!customerName.isBlank()) {
            sale.setCustomerName(customerName);
        }

        Sale savedSale = saleRepository.save(sale);

        double total = applySaleItemsFromPayload(savedSale, payload);
        savedSale.setTotalAmount(total);
        saleRepository.save(savedSale);
        return toRow(savedSale);
    }

    @PutMapping("/{id:\\d+}")
    @Transactional
    public Map<String, Object> updateSale(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));

        // Revert stock reductions done by existing sale items.
        List<SaleItem> oldItems = saleItemRepository.findBySaleIdOrderByIdAsc(id);
        for (SaleItem old : oldItems) {
            Batch oldBatch = old.getBatch();
            if (oldBatch == null) continue;
            int oldQty = old.getQuantity() != null ? old.getQuantity() : 0;
            int currentQty = oldBatch.getQuantity() != null ? oldBatch.getQuantity() : 0;
            oldBatch.setQuantity(currentQty + oldQty);
            batchRepository.save(oldBatch);
        }
        saleItemRepository.deleteBySaleId(id);

        sale.setInvoiceNumber(asString(payload.get("invoiceNumber"), sale.getInvoiceNumber()));
        sale.setSaleDate(parseDate(payload.get("date"), sale.getSaleDate()));
        sale.setSaleType(asString(payload.get("saleType"), sale.getSaleType() == null ? "sale" : sale.getSaleType()));
        sale.setTotalAmount(0.0);

        Long customerId = asLong(payload.get("customerId"), null);
        String customerName = asString(payload.get("customerName"), "").trim();
        if (customerId != null) {
            Customer customer = customerRepository.findById(customerId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer not found"));
            sale.setCustomer(customer);
            sale.setCustomerName(customer.getOwnerName() != null && !customer.getOwnerName().isBlank()
                    ? customer.getOwnerName()
                    : customer.getName());
        } else {
            sale.setCustomer(null);
            sale.setCustomerName(customerName);
        }

        double total = applySaleItemsFromPayload(sale, payload);
        sale.setTotalAmount(total);
        saleRepository.save(sale);
        return getSaleDetails(id);
    }

    @DeleteMapping("/{id:\\d+}")
    @Transactional
    public void deleteSale(@PathVariable Long id) {
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
        List<SaleItem> items = saleItemRepository.findBySaleIdOrderByIdAsc(id);
        for (SaleItem item : items) {
            Batch batch = item.getBatch();
            if (batch == null) continue;
            int itemQty = item.getQuantity() != null ? item.getQuantity() : 0;
            int currentQty = batch.getQuantity() != null ? batch.getQuantity() : 0;
            batch.setQuantity(currentQty + itemQty);
            batchRepository.save(batch);
        }
        saleRepository.delete(sale);
    }

    private Map<String, Object> toRow(Sale sale) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", sale.getId());
        row.put("invoiceNumber", sale.getInvoiceNumber());
        row.put("date", sale.getSaleDate());
        row.put("customer", getSaleCustomerName(sale));
        row.put("totalAmount", sale.getTotalAmount() != null ? sale.getTotalAmount() : 0.0);
        row.put("saleType", sale.getSaleType() != null ? sale.getSaleType() : "sale");
        row.put("status", "Completed");
        return row;
    }

    @SuppressWarnings("unchecked")
    private double applySaleItemsFromPayload(Sale savedSale, Map<String, Object> payload) {
        List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
        boolean hideBatchField = asBoolean(payload.get("hideBatchField"), false);
        String discountMode = asString(payload.get("discountMode"), "tax").toLowerCase();
        double total = 0.0;
        List<SaleItem> toPersist = new ArrayList<>();

        if (items != null) {
            for (Map<String, Object> row : items) {
                int requestedQty = Math.max(0, asInt(row.get("quantity"), 0));
                if (requestedQty == 0) continue;
                Long medicineId = asLong(row.get("medicineId"), null);
                String medicineName = asString(row.get("medicineName"), "");
                double unitPrice = asDouble(row.get("unitPrice"), 0.0);
                double discountPercent = asDouble(row.get("discountPercent"), 0.0);
                double taxPercent = asDouble(row.get("taxPercent"), 5.0);

                if (medicineId == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "medicineId is required for sale save");
                }

                if (hideBatchField) {
                    total += allocateAcrossBatches(
                            savedSale, toPersist, medicineId, medicineName, requestedQty, unitPrice, discountPercent, taxPercent, discountMode
                    );
                } else {
                    Long batchId = asLong(row.get("batchId"), null);
                    String batchNo = asString(row.get("batch"), "");
                    Batch batch;
                    if (batchId != null) {
                        batch = batchRepository.findById(batchId)
                                .filter(b -> b.getMedicine() != null && medicineId.equals(b.getMedicine().getId()))
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Batch not found"));
                    } else {
                        if (batchNo.isBlank()) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "batch is required when batch field is visible");
                        }
                        batch = batchRepository
                                .findByMedicineIdAndBatchNo(medicineId, batchNo, true)
                                .orElseGet(() -> batchRepository
                                        .findByMedicineIdAndBatchNo(medicineId, batchNo, false)
                                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Batch not found")));
                    }

                    int currentQty = batch.getQuantity() == null ? 0 : batch.getQuantity();
                    batch.setQuantity(currentQty - requestedQty);
                    batchRepository.save(batch);

                    LinePricing pricing = computeLinePricing(unitPrice, requestedQty, discountPercent, taxPercent, discountMode);
                    SaleItem item = new SaleItem();
                    item.setSale(savedSale);
                    item.setBatch(batch);
                    item.setMedicineId(medicineId);
                    item.setMedicineName(!medicineName.isBlank() ? medicineName : batch.getMedicine().getName());
                    item.setBatchName(batch.getBatchNo());
                    item.setQuantity(requestedQty);
                    item.setMrp(batch.getMrp());
                    item.setExpiryDate(batch.getExpiryDate());
                    item.setPrice(unitPrice);
                    item.setTaxPercent(taxPercent);
                    item.setDiscountPercent(discountPercent);
                    item.setNetPrice(pricing.netAmount);
                    item.setTotalAmount(pricing.totalAmount);
                    toPersist.add(item);
                    total += pricing.totalAmount;
                }
            }
        }

        saleItemRepository.saveAll(toPersist);
        return total;
    }

    private Map<String, Object> toItemRow(SaleItem item) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", item.getId());
        row.put("medicineId", item.getMedicineId());
        row.put("medicineName", item.getMedicineName() == null ? "" : item.getMedicineName());
        row.put("batchId", item.getBatch() != null ? item.getBatch().getId() : null);
        row.put("batchName", item.getBatchName() == null ? "" : item.getBatchName());
        row.put("quantity", item.getQuantity() == null ? 0 : item.getQuantity());
        row.put("mrp", item.getMrp() == null ? 0.0 : item.getMrp());
        row.put("expiryDate", item.getExpiryDate());
        row.put("price", item.getPrice() == null ? 0.0 : item.getPrice());
        row.put("taxPercent", item.getTaxPercent() == null ? 0.0 : item.getTaxPercent());
        row.put("discountPercent", item.getDiscountPercent() == null ? 0.0 : item.getDiscountPercent());
        row.put("netPrice", item.getNetPrice() == null ? 0.0 : item.getNetPrice());
        row.put("lineTotal", item.getTotalAmount() == null ? 0.0 : item.getTotalAmount());
        return row;
    }

    private double allocateAcrossBatches(
            Sale sale,
            List<SaleItem> outItems,
            Long medicineId,
            String medicineName,
            int requestedQty,
            double unitPrice,
            double discountPercent,
            double taxPercent,
            String discountMode
    ) {
        Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Medicine not found"));

        List<Batch> all = batchRepository.findByMedicineId(medicineId).stream()
                .filter(b -> b.getActive() == null || b.getActive())
                .toList();

        if (all.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active batches found for medicine " + medicine.getName());
        }

        List<Batch> byAvailableQty = all.stream()
                .sorted(Comparator.comparingInt((Batch b) -> b.getQuantity() == null ? 0 : b.getQuantity()).reversed())
                .toList();
        Batch latestBatch = all.stream()
                .max(Comparator.comparingLong(b -> b.getId() == null ? 0L : b.getId()))
                .orElse(byAvailableQty.get(0));

        int remaining = requestedQty;
        double total = 0.0;

        for (Batch batch : byAvailableQty) {
            if (remaining <= 0) break;
            int available = Math.max(0, batch.getQuantity() == null ? 0 : batch.getQuantity());
            if (available <= 0) continue;

            int taken = Math.min(remaining, available);
            batch.setQuantity(available - taken);
            batchRepository.save(batch);

            LinePricing pricing = computeLinePricing(unitPrice, taken, discountPercent, taxPercent, discountMode);
            SaleItem item = new SaleItem();
            item.setSale(sale);
            item.setBatch(batch);
            item.setMedicineId(medicineId);
            item.setMedicineName(!medicineName.isBlank() ? medicineName : medicine.getName());
            item.setBatchName(batch.getBatchNo());
            item.setQuantity(taken);
            item.setMrp(batch.getMrp());
            item.setExpiryDate(batch.getExpiryDate());
            item.setPrice(unitPrice);
            item.setTaxPercent(taxPercent);
            item.setDiscountPercent(discountPercent);
            item.setNetPrice(pricing.netAmount);
            item.setTotalAmount(pricing.totalAmount);
            outItems.add(item);
            total += pricing.totalAmount;
            remaining -= taken;
        }

        if (remaining > 0) {
            int currentQty = latestBatch.getQuantity() == null ? 0 : latestBatch.getQuantity();
            latestBatch.setQuantity(currentQty - remaining);
            batchRepository.save(latestBatch);

            LinePricing pricing = computeLinePricing(unitPrice, remaining, discountPercent, taxPercent, discountMode);
            SaleItem overflow = new SaleItem();
            overflow.setSale(sale);
            overflow.setBatch(latestBatch);
            overflow.setMedicineId(medicineId);
            overflow.setMedicineName(!medicineName.isBlank() ? medicineName : medicine.getName());
            overflow.setBatchName(latestBatch.getBatchNo());
            overflow.setQuantity(remaining);
            overflow.setMrp(latestBatch.getMrp());
            overflow.setExpiryDate(latestBatch.getExpiryDate());
            overflow.setPrice(unitPrice);
            overflow.setTaxPercent(taxPercent);
            overflow.setDiscountPercent(discountPercent);
            overflow.setNetPrice(pricing.netAmount);
            overflow.setTotalAmount(pricing.totalAmount);
            outItems.add(overflow);
            total += pricing.totalAmount;
        }

        return total;
    }

    private LinePricing computeLinePricing(double unitPrice, int qty, double discountPercent, double taxPercent, String discountMode) {
        double gross = unitPrice * qty;
        if ("custom".equals(discountMode)) {
            double discounted = gross - (gross * (discountPercent / 100.0));
            double taxAmount = discounted * (taxPercent / 100.0);
            return new LinePricing(discounted, taxAmount, discounted + taxAmount);
        }
        if ("tax".equals(discountMode)) {
            double includedTax = taxPercent > 0 ? gross * (taxPercent / (100.0 + taxPercent)) : 0.0;
            return new LinePricing(gross - includedTax, includedTax, gross);
        }
        double includedTax = taxPercent > 0 ? gross * (taxPercent / (100.0 + taxPercent)) : 0.0;
        return new LinePricing(gross - includedTax, includedTax, gross);
    }

    private String getSaleCustomerName(Sale sale) {
        if (sale.getCustomerName() != null && !sale.getCustomerName().isBlank()) {
            return sale.getCustomerName();
        }
        if (sale.getCustomer() != null) {
            String owner = sale.getCustomer().getOwnerName();
            if (owner != null && !owner.isBlank()) return owner;
            String name = sale.getCustomer().getName();
            if (name != null && !name.isBlank()) return name;
        }
        return "Walk-in Customer";
    }

    private static class LinePricing {
        final double netAmount;
        final double taxAmount;
        final double totalAmount;

        private LinePricing(double netAmount, double taxAmount, double totalAmount) {
            this.netAmount = netAmount;
            this.taxAmount = taxAmount;
            this.totalAmount = totalAmount;
        }
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

    private boolean asBoolean(Object value, boolean defaultValue) {
        if (value instanceof Boolean b) return b;
        if (value == null) return defaultValue;
        return "true".equalsIgnoreCase(String.valueOf(value));
    }

    private LocalDate parseDate(Object value, LocalDate defaultValue) {
        try {
            return value == null ? defaultValue : LocalDate.parse(String.valueOf(value));
        } catch (Exception ex) {
            return defaultValue;
        }
    }
}

