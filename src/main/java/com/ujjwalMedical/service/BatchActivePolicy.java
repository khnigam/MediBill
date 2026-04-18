package com.ujjwalMedical.service;

import com.ujjwalMedical.entity.Batch;

/**
 * Keeps {@link Batch#getActive()} aligned with on-hand quantity so empty batches
 * are not offered for sale and restocked batches become selectable again.
 */
public final class BatchActivePolicy {

    private BatchActivePolicy() {
    }

    public static void syncActiveFromQuantity(Batch batch) {
        if (batch == null) {
            return;
        }
        int n = batch.getQuantity() == null ? 0 : batch.getQuantity();
        if (n <= 0) {
            batch.setQuantity(0);
            batch.setActive(Boolean.FALSE);
        } else {
            batch.setActive(Boolean.TRUE);
        }
    }
}
