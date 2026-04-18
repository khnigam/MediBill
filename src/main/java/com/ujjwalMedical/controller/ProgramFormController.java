package com.ujjwalMedical.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Serves the program configuration JSON from the classpath so the admin UI can stay schema-driven
 * without shipping a second copy inside the frontend bundle.
 */
@RestController
@RequestMapping("/api/program-form")
@CrossOrigin(origins = "*")
public class ProgramFormController {

    private static final Map<String, List<String>> STATIC_LIST_SOURCES = Map.of(
            "categories", List.of(
                    "Spot Awards", "Peer Recognition", "Long Service", "Innovation", "Market Research"
            ),
            "user_attributes", List.of(
                    "department", "grade", "location", "manager_id", "tenure_months"
            ),
            "user_profile_attributes", List.of(
                    "job_title", "business_unit", "cost_center", "joining_date"
            )
    );

    private static final List<Map<String, String>> MOCK_USERS = List.of(
            Map.of("id", "u1", "label", "Ada Lovelace"),
            Map.of("id", "u2", "label", "Alan Turing"),
            Map.of("id", "u3", "label", "Grace Hopper"),
            Map.of("id", "u4", "label", "Margaret Hamilton"),
            Map.of("id", "u5", "label", "Edsger Dijkstra"),
            Map.of("id", "u6", "label", "Barbara Liskov")
    );

    private final ObjectMapper objectMapper;

    public ProgramFormController(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @GetMapping("/schema")
    public JsonNode schema() throws Exception {
        try (InputStream in = new ClassPathResource("program-form-schema.json").getInputStream()) {
            return objectMapper.readTree(in);
        }
    }

    /**
     * Static option lists referenced by {@code options: { "source": "…" }} in the schema.
     * Whitelisted keys only — avoids turning this into an arbitrary file read.
     */
    @GetMapping("/datasources/{source}")
    public List<String> datasource(@PathVariable String source) {
        String key = source == null ? "" : source.toLowerCase(Locale.ROOT);
        return STATIC_LIST_SOURCES.getOrDefault(key, List.of());
    }

    /**
     * Search endpoint for {@code multi_select_search} fields; replace with a real user directory later.
     */
    @GetMapping("/users/search")
    public List<Map<String, String>> searchUsers(@RequestParam(name = "q", defaultValue = "") String q) {
        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        if (needle.isEmpty()) {
            return new ArrayList<>(MOCK_USERS.subList(0, Math.min(4, MOCK_USERS.size())));
        }
        return MOCK_USERS.stream()
                .filter(u -> {
                    String label = u.getOrDefault("label", "").toLowerCase(Locale.ROOT);
                    String id = u.getOrDefault("id", "").toLowerCase(Locale.ROOT);
                    return label.contains(needle) || id.contains(needle);
                })
                .collect(Collectors.toList());
    }

    /**
     * Convenience bundle for clients that prefer one round trip over many datasource calls.
     */
    @GetMapping("/datasources")
    public Map<String, List<String>> allDatasources() {
        return new LinkedHashMap<>(STATIC_LIST_SOURCES);
    }
}
