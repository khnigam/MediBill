package com.ujjwalMedical.service;

import com.ujjwalMedical.dto.PurchaseItemRequest;
import com.ujjwalMedical.dto.PurchaseRequest;
import com.ujjwalMedical.entity.*;
import com.ujjwalMedical.repository.BatchRepository;
import com.ujjwalMedical.repository.MedicineRepository;
import com.ujjwalMedical.repository.PurchaseRepository;
import com.ujjwalMedical.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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

    private LocalDate parseExpiry(String d) {
        if (d == null || d.length() != 8) return null;
        int day = Integer.parseInt(d.substring(0, 2));
        int month = Integer.parseInt(d.substring(2, 4));
        int year = Integer.parseInt(d.substring(4, 8));
        return LocalDate.of(year, month, day);
    }


    public Purchase createPurchase(PurchaseRequest req) {

        Supplier supplier = supplierRepo.findById(req.getDistributor_id())
                .orElseThrow(() -> new RuntimeException("Supplier not found"));

        Purchase purchase = new Purchase();
        purchase.setInvoiceNo(req.getInvoice_number());
        purchase.setSupplier(supplier);
        purchase.setPurchaseDate(req.getPurchase_date());
        purchase.setPurchaseType(req.getPurchase_type());
        purchase.setPaymentType(req.getPayment_type());
        purchase.setRateType(req.getRate_type());
        purchase.setTaxType(req.getTax_type());

        List<PurchaseItem> items = new ArrayList<>();

        double totalGst = 0;
        double totalAmount = 0;

        for (PurchaseItemRequest itemReq : req.getMedicines()) {

            Medicine medicine;

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
                    .findByMedicineIdAndBatchNo(medicine.getId(), itemReq.getBatch())
                    .orElse(null);

            if (batch == null) {
                batch = new Batch();
                batch.setBatchNo(itemReq.getBatch());
                batch.setMedicine(medicine);
                batch.setExpiryDate(parseExpiry(itemReq.getExpiry()));

                batch.setPurchaseRate(itemReq.getNet_unit_price());
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

            double gst = (itemReq.getNet_unit_price() - itemReq.getUnit_price()) * itemReq.getQty();
            double amount = itemReq.getNet_unit_price() * itemReq.getQty();

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
