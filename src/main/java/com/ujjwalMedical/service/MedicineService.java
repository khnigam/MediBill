package com.ujjwalMedical.service;
import com.ujjwalMedical.dto.MedicineSummaryDTO;
import com.ujjwalMedical.repository.MedicineRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class MedicineService {

    private final MedicineRepository repo;

    public MedicineService(MedicineRepository repo) {
        this.repo = repo;
    }

    public List<MedicineSummaryDTO> getSummary() {
        return repo.getMedicineSummary();
    }
}
