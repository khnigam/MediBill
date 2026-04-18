package com.ujjwalMedical.service;

import com.ujjwalMedical.dto.PurchaseItemRequest;
import com.ujjwalMedical.dto.PurchaseRequest;
import com.ujjwalMedical.entity.*;
import com.ujjwalMedical.repository.BatchRepository;
import com.ujjwalMedical.repository.MedicineRepository;
import com.ujjwalMedical.repository.PurchaseRepository;
import com.ujjwalMedical.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository purchaseRepo;
    private final MedicineRepository medicineRepo;
    private final SupplierRepository supplierRepo;
    private final BatchRepository batchRepo;
    private Medicine createNewMedicine(String name) {
        Medicine m = new Medicine();
        m.setName(name);
        m.setSku(null);
        m.setBrand(null);
        return medicineRepo.save(m);
    }

    /**
     * Accepts common bill / CSV / UI shapes so expiry is not dropped silently.
     * Order: ISO {@code yyyy-MM-dd}, 8-digit {@code DDMMYYYY}, then {@code dd/MM/yyyy} or {@code dd-MM-yyyy}.
     */
    private LocalDate parseExpiry(String raw) {
        if (raw == null) {
            return null;
        }
        String d = raw.trim();
        if (d.isEmpty()) {
            return null;
        }

        // yyyy-MM-dd (CSV exports, HTML date, APIs)
        if (d.length() >= 10 && d.charAt(4) == '-') {
            try {
                return LocalDate.parse(d.substring(0, 10));
            } catch (DateTimeParseException ignored) {
                // fall through
            }
        }

        // DDMMYYYY — matches purchase form placeholder
        if (d.length() == 8 && d.chars().allMatch(Character::isDigit)) {
            try {
                int day = Integer.parseInt(d.substring(0, 2));
                int month = Integer.parseInt(d.substring(2, 4));
                int year = Integer.parseInt(d.substring(4, 8));
                return LocalDate.of(year, month, day);
            } catch (Exception ignored) {
                return null;
            }
        }

        // dd/MM/yyyy or dd-MM-yyyy (invoice printouts)
        char sep = d.indexOf('/') >= 0 ? '/' : (d.indexOf('-') >= 0 ? '-' : '\0');
        if (sep != '\0') {
            String[] parts = d.split("[/-]");
            if (parts.length == 3) {
                try {
                    if (parts[0].length() == 4) {
                        return LocalDate.of(
                                Integer.parseInt(parts[0]),
                                Integer.parseInt(parts[1]),
                                Integer.parseInt(parts[2]));
                    }
                    int day = Integer.parseInt(parts[0]);
                    int month = Integer.parseInt(parts[1]);
                    int year = Integer.parseInt(parts[2]);
                    return LocalDate.of(year, month, day);
                } catch (Exception ignored) {
                    return null;
                }
            }
        }

        return null;
    }


    public Purchase createPurchase(PurchaseRequest req) {
        if (req.getDistributor_id() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "distributor_id is required: choose a supplier from the list before saving.");
        }

        Supplier supplier = supplierRepo.findById(req.getDistributor_id())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Supplier not found for id: " + req.getDistributor_id()));

        Purchase purchase = new Purchase();
        purchase.setInvoiceNo(req.getInvoice_number());
        purchase.setSupplier(supplier);
        purchase.setPurchaseDate(req.getPurchase_date());
        purchase.setPurchaseType(req.getPurchase_type());
        purchase.setPaymentType(req.getPayment_type());
        purchase.setRateType(req.getRate_type());
        purchase.setTaxType(req.getTax_type());
        Boolean onBill = req.getPurchase_type().equals("stock_update");

        List<PurchaseItem> items = new ArrayList<>();

        double totalGst = 0;
        double totalAmount = 0;

        for (PurchaseItemRequest itemReq : req.getMedicines()) {

            Medicine medicine;
            Double netRate;
            if (("dummy".equals(req.getRate_type()) || "actual".equals(req.getRate_type()))
                    && itemReq.getActual_price() != null && itemReq.getActual_price() > 0) {
                netRate = itemReq.getActual_price();
            }else {
                netRate = itemReq.getNet_unit_price();
            }

            if (itemReq.getMedicine_id() != null) {
                medicine = medicineRepo.findById(itemReq.getMedicine_id())
                        .orElseThrow(() -> new RuntimeException("Medicine not found"));
            } else {
                // create new medicine with setters
                medicine = new Medicine();
                medicine.setName(itemReq.getMedicine_name());
                medicine.setSku(null);
                medicine.setBrand(null);
                medicine = medicineRepo.save(medicine);
            }


            Batch batch = batchRepo
                    .findByMedicineIdAndBatchNo(medicine.getId(), itemReq.getBatch() ,onBill)
                    .orElse(null);

            if (batch == null) {
                batch = new Batch();
                batch.setBatchNo(itemReq.getBatch());
                batch.setMedicine(medicine);
                batch.setExpiryDate(parseExpiry(itemReq.getExpiry()));
                batch.setOnBill(onBill);
                batchRepo.save(batch);
            }

            PurchaseItem item = new PurchaseItem();
            item.setPurchase(purchase);
            item.setMedicine(medicine);
            item.setBatch(batch);
            item.setBatchNo(itemReq.getBatch());
            item.setQuantity(itemReq.getQty());
            item.setUnitPrice(itemReq.getUnit_price());
            item.setNetUnitPrice(itemReq.getNet_unit_price());
            item.setTaxPercent(itemReq.getTax());
            item.setExpiry(parseExpiry(itemReq.getExpiry()));
            Integer updatedQuantity = (batch.getQuantity() != null ? batch.getQuantity() : 0) + itemReq.getQty() ;
            batch.setQuantity(updatedQuantity);
            BatchActivePolicy.syncActiveFromQuantity(batch);
            batch.setExpiryDate(parseExpiry(itemReq.getExpiry()));
            batch.setPurchaseRate(netRate);
            batch.setMrp(itemReq.getMrp());
            if (batch.getGst() == null){
                batch.setGst(itemReq.getTax());
            }
            double gst = ((netRate/(1+(batch.getGst()/100)))*(batch.getGst()/100)) * itemReq.getQty();
            double amount = netRate * itemReq.getQty();

            item.setGstAmount(gst);
            item.setTotalAmount(amount);
            totalGst += gst;
            totalAmount += amount;
            items.add(item);
        }

        purchase.setTotalGst(totalGst);
        purchase.setTotalAmount(totalAmount);
        purchase.setItems(items);

        return purchaseRepo.save(purchase);
    }
}


