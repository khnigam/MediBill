package com.ujjwalMedical.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sends invoice images (or PDF pages rendered to PNG) to Google Gemini ({@code generateContent})
 * and normalizes line items for the purchase bill import flow.
 */
@Service
public class PurchaseBillAiService {

    private static final Logger log = LoggerFactory.getLogger(PurchaseBillAiService.class);

    private final ObjectMapper objectMapper;
    private final Environment environment;

    /**
     * Gemini API root (no trailing slash), e.g. {@code https://generativelanguage.googleapis.com/v1beta}
     */
    @Value("${purchase.bill.ai.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String baseUrl;

    /** Model id only (no {@code models/} prefix), e.g. {@code gemini-2.5-flash} */
    @Value("${purchase.bill.ai.model:gemini-2.5-flash}")
    private String model;

    @Value("${purchase.bill.ai.max-pdf-pages:4}")
    private int maxPdfPages;

    @Value("${purchase.bill.ai.max-file-bytes:10485760}")
    private int maxFileBytes;

    /** Optional distributor-specific extraction hints (see application.properties). */
    @Value("${purchase.bill.ai.extra-prompt:}")
    private String extraPrompt;

    public PurchaseBillAiService(ObjectMapper objectMapper, Environment environment) {
        this.objectMapper = objectMapper;
        this.environment = environment;
    }

    /**
     * Resolves the Gemini key from several places so IDE run configs and shell exports both work.
     * Order: {@code purchase.bill.ai.api-key} (after Spring placeholder resolution), then {@code GEMINI_API_KEY}, then {@code GOOGLE_API_KEY}.
     */
    private String resolveGeminiApiKey() {
        String fromProp = environment.getProperty("purchase.bill.ai.api-key");
        if (fromProp != null && !fromProp.isBlank()) {
            return fromProp.trim();
        }
        String gemini = environment.getProperty("GEMINI_API_KEY");
        if (gemini != null && !gemini.isBlank()) {
            return gemini.trim();
        }
        String google = environment.getProperty("GOOGLE_API_KEY");
        if (google != null && !google.isBlank()) {
            return google.trim();
        }
        return "";
    }

    public List<Map<String, Object>> extractLineItems(byte[] fileBytes, String filename, String contentType) {
        String apiKey = resolveGeminiApiKey();
        if (apiKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Purchase bill AI is not configured. Set one of: environment variable GEMINI_API_KEY, "
                            + "environment variable GOOGLE_API_KEY, or property purchase.bill.ai.api-key "
                            + "(e.g. in Run Configuration → Environment, or export before starting the JVM). "
                            + "Frontend .env files do not reach the Java server."
            );
        }
        if (fileBytes.length > maxFileBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File exceeds maximum allowed size.");
        }

        List<EncodedImage> images = buildEncodedImages(fileBytes, filename, contentType);
        if (images.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported file type for AI extraction. Use PDF or a photo (JPEG, PNG, or WebP), or upload CSV."
            );
        }

        return callGemini(images, filename, apiKey);
    }

    /** Raw base64 (no data: prefix) + MIME for Gemini {@code inlineData}. */
    private record EncodedImage(String mimeType, String base64Data) {
    }

    private List<EncodedImage> buildEncodedImages(byte[] fileBytes, String filename, String contentType) {
        String lower = filename == null ? "" : filename.toLowerCase();
        String ct = contentType == null ? "" : contentType.toLowerCase();
        boolean pdf = ct.contains("pdf") || lower.endsWith(".pdf");
        if (pdf) {
            return renderPdfToPngImages(fileBytes);
        }
        if (ct.startsWith("image/") || lower.matches(".*\\.(png|jpe?g|webp)$")) {
            String mime = guessImageMime(ct, lower);
            return List.of(new EncodedImage(mime, Base64.getEncoder().encodeToString(fileBytes)));
        }
        return List.of();
    }

    private static String guessImageMime(String contentType, String lower) {
        if (contentType.contains("png")) {
            return "image/png";
        }
        if (contentType.contains("jpeg") || contentType.contains("jpg")) {
            return "image/jpeg";
        }
        if (contentType.contains("webp")) {
            return "image/webp";
        }
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        return "image/jpeg";
    }

    private List<EncodedImage> renderPdfToPngImages(byte[] pdfBytes) {
        int cap = Math.max(1, maxPdfPages);
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            int pages = Math.min(doc.getNumberOfPages(), cap);
            PDFRenderer renderer = new PDFRenderer(doc);
            List<EncodedImage> out = new ArrayList<>(pages);
            for (int i = 0; i < pages; i++) {
                BufferedImage img = renderer.renderImageWithDPI(i, 132, ImageType.RGB);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(img, "png", baos);
                out.add(new EncodedImage("image/png", Base64.getEncoder().encodeToString(baos.toByteArray())));
            }
            return out;
        } catch (IOException e) {
            log.warn("PDF render failed: {}", e.toString());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read or render PDF.");
        }
    }

    private List<Map<String, Object>> callGemini(List<EncodedImage> images, String sourceFilename, String apiKey) {
        try {
            ObjectNode rootBody = objectMapper.createObjectNode();

            ObjectNode systemInstruction = objectMapper.createObjectNode();
            ArrayNode sysParts = objectMapper.createArrayNode();
            sysParts.add(objectMapper.createObjectNode().put("text", extractionSystemPrompt()));
            systemInstruction.set("parts", sysParts);
            rootBody.set("systemInstruction", systemInstruction);

            ArrayNode userParts = objectMapper.createArrayNode();
            userParts.add(objectMapper.createObjectNode().put("text", extractionUserMessage(images.size(), sourceFilename)));
            for (EncodedImage img : images) {
                ObjectNode inline = objectMapper.createObjectNode();
                inline.put("mimeType", img.mimeType());
                inline.put("data", img.base64Data());
                ObjectNode part = objectMapper.createObjectNode();
                part.set("inlineData", inline);
                userParts.add(part);
            }

            ObjectNode userTurn = objectMapper.createObjectNode();
            userTurn.put("role", "user");
            userTurn.set("parts", userParts);

            ArrayNode contents = objectMapper.createArrayNode();
            contents.add(userTurn);
            rootBody.set("contents", contents);

            ObjectNode genCfg = objectMapper.createObjectNode();
            genCfg.put("temperature", 0.1);
            genCfg.put("maxOutputTokens", 8192);
            genCfg.put("responseMimeType", "application/json");
            rootBody.set("generationConfig", genCfg);

            String jsonBody = objectMapper.writeValueAsString(rootBody);
            String base = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
            String modelId = model.startsWith("models/") ? model.substring("models/".length()) : model;
            String keyParam = URLEncoder.encode(apiKey.trim(), StandardCharsets.UTF_8);
            String endpoint = base + "/models/" + modelId + ":generateContent?key=" + keyParam;

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(60))
                    .build();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofMinutes(3))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                String detail = summarizeUpstreamError(response.statusCode(), response.body());
                log.warn("Gemini HTTP {} — {}", response.statusCode(), detail);
                HttpStatus status = mapUpstreamStatus(response.statusCode());
                throw new ResponseStatusException(status, detail);
            }

            JsonNode root = objectMapper.readTree(response.body());
            String contentStr = extractGeminiTextJson(root);
            if (contentStr.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty Gemini response (check finishReason / safety).");
            }

            contentStr = stripMarkdownJsonFence(contentStr);
            JsonNode parsed = objectMapper.readTree(contentStr);
            JsonNode linesNode = parsed.path("lines");
            if (!linesNode.isArray()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI JSON missing a lines array.");
            }

            List<Map<String, Object>> out = new ArrayList<>();
            for (JsonNode line : linesNode) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("medicine_name", textField(line, "medicine_name", "medicineName", "item", "product"));
                row.put("batch", textField(line, "batch", "batch_no", "lot"));
                row.put("qty", textField(line, "qty", "quantity"));
                row.put("unit_price", textField(line, "unit_price", "rate", "pur_rate", "purchase_rate"));
                row.put("mrp", textField(line, "mrp"));
                row.put("tax_percent", textField(line, "tax_percent", "tax", "gst"));
                row.put("expiry", textField(line, "expiry", "exp"));
                out.add(row);
            }
            return out;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Gemini extract failed: {}", e.toString());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not complete AI extraction.");
        }
    }

    private String extractGeminiTextJson(JsonNode root) {
        JsonNode blockReason = root.path("promptFeedback").path("blockReason");
        if (!blockReason.asText("").isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Gemini blocked the request: " + blockReason.asText()
            );
        }
        JsonNode candidates = root.path("candidates");
        if (!candidates.isArray() || candidates.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini returned no candidates.");
        }
        JsonNode c0 = candidates.get(0);
        String finish = c0.path("finishReason").asText("");
        if (!finish.isEmpty()
                && !"STOP".equals(finish)
                && !"MAX_TOKENS".equals(finish)
                && !"FINISH_REASON_UNSPECIFIED".equals(finish)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Gemini stopped early (finishReason=" + finish + ")."
            );
        }
        JsonNode parts = c0.path("content").path("parts");
        if (!parts.isArray()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (JsonNode p : parts) {
            sb.append(p.path("text").asText(""));
        }
        return sb.toString();
    }

    /** Gemini occasionally wraps JSON in markdown fences despite responseMimeType. */
    private static String stripMarkdownJsonFence(String raw) {
        String s = raw == null ? "" : raw.trim();
        if (s.startsWith("```")) {
            int nl = s.indexOf('\n');
            int end = s.lastIndexOf("```");
            if (nl >= 0 && end > nl) {
                s = s.substring(nl + 1, end).trim();
            }
        }
        return s;
    }

    private static String textField(JsonNode line, String... keys) {
        for (String k : keys) {
            JsonNode n = line.get(k);
            if (n != null && !n.isNull()) {
                if (n.isNumber()) {
                    return n.asText();
                }
                String t = n.asText("").trim();
                if (!t.isEmpty()) {
                    return t;
                }
            }
        }
        return "";
    }

    private String extractionSystemPrompt() {
        StringBuilder sb = new StringBuilder();
        sb.append("""
                You are extracting data for MediBill, a pharmacy purchase-entry app. Output is consumed by software that \
                expects strict JSON — not markdown, not commentary outside JSON.

                TASK
                Read the attached distributor purchase invoice images (Indian pharma B2B bill: table of medicines). \
                Extract one JSON object per the schema below.

                OUTPUT SCHEMA (exact top-level keys)
                {"lines":[{"medicine_name":"","batch":"","qty":"","unit_price":"","mrp":"","tax_percent":"","expiry":""}]}

                FIELD MEANINGS (downstream import maps these names)
                - medicine_name: Full product name as printed (brand + strength + form). Never invent or normalize away \
                strength. If unreadable, best-effort substring; do not leave blank if a name exists on the row.
                - batch: Batch / lot / b.no. If missing, "".
                - qty: Bill quantity for that line (pieces, strips, or packs — whatever the row total qty column means). \
                Integer as string. Ignore "free qty" as separate lines unless the invoice lists them as their own rows; \
                if combined in one row, use the main billed qty column.
                - unit_price: Purchase / cost / PTR / net rate **per unit before tax** (whatever column is the dealer \
                rate for stock valuation). Plain number string, no Rs/₹/commas. If only MRP+margin visible, approximate \
                from printed purchase column, not MRP.
                - mrp: Maximum retail price per unit if printed; else "".
                - tax_percent: GST % or slab (e.g. 5, 12, 18). If not on line or header, use "5".
                - expiry: Expiry / BBD. Prefer yyyy-MM-dd when unambiguous; else keep label (MM/YY, dd/MM/yyyy).

                SKIP
                Invoice title, distributor address, GSTIN blocks, totals-only rows, grand totals, freight/rounding \
                unless clearly a line-item column in the medicine table. HS code-only rows with no product name: skip.

                SYNONYMS (map columns mentally to the schema)
                Item / Product / Drug / Description → medicine_name. B.No / Lot / Batch → batch. Qty / Qnty / Packs → qty. \
                Rate / PR / PTR / Pur.Rate / Net / Cost / CP → unit_price (choose purchase rate, not MRP). \
                GST / SGST+CGST / Tax% → tax_percent (single combined % if shown).

                MULTI-IMAGE
                If multiple images are sent, they are ordered pages of the same or continued invoice — merge all product \
                rows into one "lines" array in reading order; do not duplicate the same printed line.

                EXAMPLE (illustrative only)
                {"lines":[{"medicine_name":"Paracetamol 500mg Tablet","batch":"P500-A01","qty":"120","unit_price":"9.50","mrp":"12.00","tax_percent":"5","expiry":"2026-06-30"}]}
                """);
        if (extraPrompt != null && !extraPrompt.isBlank()) {
            sb.append("\n\nOWNER / SUPPLIER-SPECIFIC RULES (highest priority when they conflict with defaults):\n");
            sb.append(extraPrompt.trim());
        }
        return sb.toString();
    }

    private static String extractionUserMessage(int imageCount, String sourceFilename) {
        String hint = sourceFilename == null || sourceFilename.isBlank() ? "(not provided)" : sourceFilename.trim();
        return String.format(
                "Source upload name (hint only): \"%s\". Attached: %d invoice image(s) in order (page 1 first). "
                        + "Extract every medicine line item into the JSON schema from your instructions.",
                hint,
                imageCount
        );
    }

    private HttpStatus mapUpstreamStatus(int upstream) {
        return switch (upstream) {
            case 401 -> HttpStatus.UNAUTHORIZED;
            case 403 -> HttpStatus.FORBIDDEN;
            case 429 -> HttpStatus.TOO_MANY_REQUESTS;
            case 400, 404, 413, 415 -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.BAD_GATEWAY;
        };
    }

    /** Surfaces provider JSON errors to the client without echoing secrets. */
    private String summarizeUpstreamError(int status, String body) {
        if (body == null || body.isBlank()) {
            return "Gemini HTTP " + status + " (empty body). Check model id, API key, and quota.";
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode err = root.path("error");
            if (err.isObject()) {
                String msg = err.path("message").asText("").trim();
                String st = err.path("status").asText("").trim();
                if (!msg.isEmpty()) {
                    String prefix = !st.isEmpty() ? "[" + st + "] " : "";
                    return sanitizeForClient(prefix + msg);
                }
            }
        } catch (Exception ignored) {
            // fall through
        }
        return sanitizeForClient("Gemini HTTP " + status + ": " + body.replaceAll("\\s+", " ").trim());
    }

    private static String sanitizeForClient(String s) {
        if (s == null) {
            return "";
        }
        String out = s.replaceAll("(?i)Bearer\\s+\\S+", "Bearer [redacted]");
        out = out.replaceAll("sk-[a-zA-Z0-9_-]{10,}", "[api-key-redacted]");
        out = out.replaceAll("AIza[0-9A-Za-z_-]{35}", "[api-key-redacted]");
        if (out.length() > 900) {
            return out.substring(0, 900) + "…";
        }
        return out;
    }
}
