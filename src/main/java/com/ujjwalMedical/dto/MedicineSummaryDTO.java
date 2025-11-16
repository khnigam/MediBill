package com.ujjwalMedical.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MedicineSummaryDTO {

    private Long id;
    private String name;
    private String brand;

    private Long totalQuantity;          // FIX: MUST BE LONG
    private LocalDate earliestExpiry;
    private Double highestNetRate;
    private Double highestMrp;
}
