package com.escritoresnogueira.backend.controller;

import com.escritoresnogueira.backend.dto.CreatePaymentRequest;
import com.escritoresnogueira.backend.dto.PaymentItemDTO;
import com.escritoresnogueira.backend.model.Book;
import com.escritoresnogueira.backend.model.Order;
import com.escritoresnogueira.backend.model.OrderItem;
import com.escritoresnogueira.backend.model.User;
import com.escritoresnogueira.backend.model.UserSession;
import com.escritoresnogueira.backend.repository.BookRepository;
import com.escritoresnogueira.backend.repository.OrderRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.model.Price;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Charge;
import com.stripe.model.Product;
import com.stripe.model.Account;
import com.stripe.model.PriceCollection;
import com.stripe.model.Invoice;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import com.stripe.param.PriceListParams;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.escritoresnogueira.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/payments")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:4200", "http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:5501", "http://127.0.0.1:5501"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
@RequiredArgsConstructor
public class PaymentController {

    private final BookRepository bookRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final com.escritoresnogueira.backend.service.UserSessionService sessionService;
    private final com.escritoresnogueira.backend.service.EmailService emailService;

    @Value("${stripe.publishable-key:}")
    private String publishableKey;
    @Value("${app.frontend.url:http://127.0.0.1:5501/frontend/conta.html#orders}")
    private String frontendUrl;
    


    @GetMapping("/config")
    public ResponseEntity<?> getConfig() {
        return ResponseEntity.ok(Map.of("publishableKey", publishableKey));
    }

    @PostMapping("/create-checkout-session")
    public ResponseEntity<?> createCheckoutSession(@RequestHeader(value = "X-Session-Token", required = false) String sessionToken,
                                                   @RequestBody CreatePaymentRequest req) {
        try {
            log.info("createCheckoutSession called - sessionTokenPresent={}", sessionToken != null && !sessionToken.isBlank());
            if (req.getItems() == null || req.getItems().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No items provided"));
            }

            List<SessionCreateParams.LineItem> lineItems = new ArrayList<>();
            Map<Long, ResolvedPrice> resolved = new HashMap<>();

            for (PaymentItemDTO it : req.getItems()) {
                Optional<Book> bookOpt = bookRepository.findById(it.getBookId());
                if (bookOpt.isEmpty()) continue;
                Book b = bookOpt.get();

                if (b.getStripeProductId() == null || b.getStripeProductId().isBlank()) {
                    log.error("Book {} missing stripeProductId", b.getId());
                    return ResponseEntity.status(400).body(Map.of("error", "Missing stripeProductId for book " + b.getId()));
                }

                // Resolve authoritative Price from Stripe product
                String priceId = null;
                Long unitAmount = null;
                String productName = null;
                try {
                    Product prod = Product.retrieve(b.getStripeProductId());
                    productName = prod != null ? prod.getName() : null;

                    // try default_price first
                    try {
                        Object def = prod != null ? prod.getDefaultPrice() : null;
                        if (def != null) {
                            if (def instanceof String) {
                                String defId = (String) def;
                                Price defPrice = Price.retrieve(defId);
                                if (defPrice != null && defPrice.getUnitAmount() != null) {
                                    priceId = defPrice.getId();
                                    unitAmount = defPrice.getUnitAmount();
                                }
                            } else if (def instanceof Price) {
                                Price defPrice = (Price) def;
                                if (defPrice.getUnitAmount() != null) {
                                    priceId = defPrice.getId();
                                    unitAmount = defPrice.getUnitAmount();
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Error retrieving default_price for product {}: {}", b.getStripeProductId(), e.getMessage());
                    }

                    if (priceId == null) {
                        PriceListParams listParams = PriceListParams.builder()
                                .setProduct(b.getStripeProductId())
                                .setLimit(1L)
                                .build();
                        PriceCollection pc = Price.list(listParams);
                        if (pc != null && pc.getData() != null && !pc.getData().isEmpty()) {
                            Price found = pc.getData().get(0);
                            if (found != null && found.getUnitAmount() != null) {
                                priceId = found.getId();
                                unitAmount = found.getUnitAmount();
                            }
                        }
                    }
                } catch (StripeException se) {
                    log.error("Error retrieving Stripe product/price for book {}: {}", b.getId(), se.getMessage(), se);
                    return ResponseEntity.status(500).body(Map.of("error", "Stripe error retrieving price for book " + b.getId()));
                }

                if (priceId == null || unitAmount == null) {
                    log.error("No Stripe price with unit amount found for product {} (book {})", b.getStripeProductId(), b.getId());
                    return ResponseEntity.status(400).body(Map.of("error", "Missing Stripe price for book " + b.getId()));
                }

                lineItems.add(SessionCreateParams.LineItem.builder()
                        .setPrice(priceId)
                        .setQuantity(Long.valueOf(it.getQuantity()))
                        .build());
                resolved.put(b.getId(), new ResolvedPrice(priceId, unitAmount, productName));
                log.info("Resolved Stripe product->price for book {} -> price={} amount={} name={}", b.getId(), priceId, unitAmount, productName);
            }

            if (lineItems.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No valid line items"));
            }

            String successUrl = req.getSuccessUrl() != null ? req.getSuccessUrl() : "http://127.0.0.1:5501/frontend/conta.html#orders";
            String cancelUrl = req.getCancelUrl() != null ? req.getCancelUrl() : "http://127.0.0.1:5501/frontend/pagamento.html?canceled=true";

            Optional<User> userOpt = sessionService.validateSession(sessionToken).map(UserSession::getUser);
            String customerEmail = req.getCustomerEmail();
            if ((customerEmail == null || customerEmail.isBlank()) && userOpt.isPresent()) {
                customerEmail = userOpt.get().getEmail();
            }

            Order order = Order.builder()
                    .orderNumber(generateOrderNumber())
                    .customerEmail(customerEmail != null ? customerEmail : "")
                    .paymentMethod("stripe_checkout")
                    .paymentStatus(Order.PaymentStatus.PENDING)
                    .status(Order.OrderStatus.PENDING)
                    .build();
            order.setTotal(BigDecimal.ZERO);
            if (userOpt.isPresent()) order.setUser(userOpt.get());
            order = orderRepository.save(order);

            SessionCreateParams.Builder scBuilder = SessionCreateParams.builder()
                    .addAllLineItem(lineItems)
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(successUrl)
                    .setCancelUrl(cancelUrl);
            // Leave `payment_method_types` unset so Stripe Checkout shows
            // the payment methods enabled in your Stripe Dashboard.

            if (customerEmail != null && !customerEmail.isBlank()) scBuilder.setCustomerEmail(customerEmail);
            scBuilder.putMetadata("orderNumber", order.getOrderNumber());
            scBuilder.putMetadata("orderId", String.valueOf(order.getId()));

            // Create Checkout Session and let Stripe Checkout display the
            // payment methods enabled in your Stripe Dashboard for this
            // account / currency / region. We do not set
            // `payment_method_types` here so Dashboard settings are authoritative.
            Session session = Session.create(scBuilder.build());
            try {
                List<String> pmts = session.getPaymentMethodTypes();
                log.info("Created Checkout Session id={} url={} payment_method_types={}", session.getId(), session.getUrl(), pmts);
            } catch (Exception _e) {
                log.info("Created Checkout Session id={} url={} (could not read payment_method_types)", session.getId(), session.getUrl());
            }

            // persist order items using Stripe unit amounts
            for (PaymentItemDTO it : req.getItems()) {
                Optional<Book> bookOpt = bookRepository.findById(it.getBookId());
                if (bookOpt.isEmpty()) continue;
                Book b = bookOpt.get();
                ResolvedPrice rp = resolved.get(b.getId());
                BigDecimal itemPrice = BigDecimal.ZERO;
                if (rp != null && rp.unitAmount != null) itemPrice = BigDecimal.valueOf(rp.unitAmount).divide(BigDecimal.valueOf(100));

                OrderItem oi = OrderItem.builder()
                        .book(b)
                        .quantity(it.getQuantity())
                        .price(itemPrice)
                        .build();
                order.addItem(oi);
            }

            order.setPaymentId(session.getId());
            order.setTotal(order.calculateTotal());
            orderRepository.save(order);

            List<Map<String, Object>> resolvedItemsList = resolved.entrySet().stream().map(en -> {
                Map<String, Object> m = new HashMap<>();
                m.put("bookId", en.getKey());
                m.put("priceId", en.getValue().priceId);
                m.put("unitAmount", en.getValue().unitAmount);
                m.put("productName", en.getValue().productName);
                return m;
            }).collect(Collectors.toList());

            Map<String, Object> resp = new HashMap<>();
            resp.put("url", session.getUrl());
            resp.put("sessionId", session.getId());
            resp.put("orderId", order.getId());
            resp.put("resolvedItems", resolvedItemsList);

            return ResponseEntity.ok(resp);
        } catch (StripeException e) {
            log.error("Stripe error creating checkout session: {}", e.getMessage(), e);
            Map<String, Object> body = new HashMap<>();
            body.put("error", e.getMessage());
            return ResponseEntity.status(500).body(body);
        } catch (Exception ex) {
            log.error("Error creating checkout session", ex);
            return ResponseEntity.status(500).body(Map.of("error", ex.getMessage()));
        }
    }

    // small helper to carry resolved price info
    private static class ResolvedPrice {
        public final String priceId;
        public final Long unitAmount; // in cents
        public final String productName;

        public ResolvedPrice(String priceId, Long unitAmount, String productName) {
            this.priceId = priceId;
            this.unitAmount = unitAmount;
            this.productName = productName;
        }
    }

    @PostMapping("/confirm-session")
public ResponseEntity<?> confirmSession(@RequestHeader("X-Session-Token") String sessionToken,
                                        @RequestBody Map<String, Object> body) {
        try {
            Optional<UserSession> userSessionOpt = sessionService.validateSession(sessionToken);
            if (userSessionOpt.isEmpty()) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid session"));
            }

            User user = userSessionOpt.get().getUser();
            if (body == null || !body.containsKey("sessionId") || body.get("sessionId") == null || String.valueOf(body.get("sessionId")).isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing sessionId"));
            }
            String sessionId = String.valueOf(body.get("sessionId"));
            Session stripeSession = Session.retrieve(sessionId);
            if (stripeSession == null) return ResponseEntity.status(404).body(Map.of("error", "Session not found"));

            // ensure the session is paid
            if (!"paid".equalsIgnoreCase(stripeSession.getPaymentStatus())) {
                return ResponseEntity.status(400).body(Map.of("error", "Payment not completed"));
            }

            // locate order by metadata or by paymentId
            String orderIdMeta = stripeSession.getMetadata() != null ? stripeSession.getMetadata().get("orderId") : null;
            Optional<Order> orderOpt = Optional.empty();
            if (orderIdMeta != null) {
                try { orderOpt = orderRepository.findById(Long.valueOf(orderIdMeta)); } catch (Exception ignore) {}
            }
            if (orderOpt.isEmpty()) {
                orderOpt = orderRepository.findByPaymentId(sessionId);
            }
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Order not found for session"));
            }

            Order order = orderOpt.get();

            // Associate to current logged-in user if present
            sessionService.validateSession(sessionToken).ifPresent(us -> {
                try {
                    User u = us.getUser();
                    if (u != null && (order.getUser() == null || !u.getId().equals(order.getUser().getId()))) {
                        order.setUser(u);
                    }
                } catch (Exception e) {
                    log.warn("Failed to associate order to session user: {}", e.getMessage());
                }
            });

            // attempt to determine customer email from Stripe (session, payment intent or charge)
            String determinedCustomerEmail = null;
            try {
                if (stripeSession.getCustomerDetails() != null && stripeSession.getCustomerDetails().getEmail() != null) {
                    determinedCustomerEmail = stripeSession.getCustomerDetails().getEmail();
                }
            } catch (Exception ignore) {}

            try {
                String piId = stripeSession.getPaymentIntent();
                if ((determinedCustomerEmail == null || determinedCustomerEmail.isBlank()) && piId != null) {
                    try {
                        PaymentIntent pi = PaymentIntent.retrieve(piId);
                        if (pi != null && pi.getReceiptEmail() != null) {
                            determinedCustomerEmail = pi.getReceiptEmail();
                        }
                    } catch (Exception ignore) {}

                    try {
                        com.stripe.param.ChargeListParams clp = com.stripe.param.ChargeListParams.builder().setPaymentIntent(piId).setLimit(1L).build();
                        com.stripe.model.ChargeCollection cc = com.stripe.model.Charge.list(clp);
                        if (cc != null && cc.getData() != null && !cc.getData().isEmpty()) {
                            com.stripe.model.Charge ch = cc.getData().get(0);
                            if (ch.getBillingDetails() != null && ch.getBillingDetails().getEmail() != null) {
                                determinedCustomerEmail = ch.getBillingDetails().getEmail();
                            }
                        }
                    } catch (Exception ignore) {}
                }
            } catch (Exception ignore) {}

            // ensure essential non-nullable fields are set before persisting
                if ((order.getCustomerEmail() == null || order.getCustomerEmail().isBlank()) && determinedCustomerEmail != null && !determinedCustomerEmail.isBlank()) {
                    order.setCustomerEmail(determinedCustomerEmail);
                }
                // allow frontend to send shipping/customerEmail in the confirm request
                try {
                    if (body.containsKey("customerEmail")) {
                        Object ce = body.get("customerEmail");
                        if (ce != null && !String.valueOf(ce).isBlank()) order.setCustomerEmail(String.valueOf(ce));
                    }
                } catch (Exception ignore) {}

                try {
                    if (body.containsKey("shipping")) {
                        Object shippingObj = body.get("shipping");
                        if (shippingObj != null) {
                            try {
                                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                                String shippingJson = mapper.writeValueAsString(shippingObj);
                                order.setShippingAddress(shippingJson);
                            } catch (Exception e) {
                                order.setShippingAddress(String.valueOf(shippingObj));
                            }
                        }
                    } else if (body.containsKey("shippingAddress")) {
                        Object sa = body.get("shippingAddress");
                        if (sa != null) order.setShippingAddress(String.valueOf(sa));
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse shipping data from confirm-session body: {}", e.getMessage());
                }
            if (order.getTotal() == null) order.setTotal(order.calculateTotal());

            order.setPaymentStatus(Order.PaymentStatus.PAID);
            // Mark order as PAID when Stripe confirms the payment
            order.setStatus(Order.OrderStatus.PAID);
            order.setPaymentId(sessionId);

            // If the order has no user associated, try to find a user by the determined email
            try {
                if (order.getUser() == null) {
                    String emailToMatch = (order.getCustomerEmail() != null && !order.getCustomerEmail().isBlank()) ? order.getCustomerEmail() : determinedCustomerEmail;
                    if (emailToMatch != null && !emailToMatch.isBlank()) {
                        userRepository.findByEmail(emailToMatch).ifPresent(u -> order.setUser(u));
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to associate order to user by email: {}", e.getMessage());
            }
            try {
                orderRepository.save(order);
            } catch (DataIntegrityViolationException dive) {
                log.error("Data integrity error saving order {}: {}", order.getId(), dive.getMostSpecificCause() != null ? dive.getMostSpecificCause().getMessage() : dive.getMessage());
                return ResponseEntity.status(500).body(Map.of("error", "database constraint violation while saving order", "detail", dive.getMostSpecificCause() != null ? dive.getMostSpecificCause().getMessage() : dive.getMessage()));
            }

            // Try to obtain invoice PDF from Stripe and send a thank-you email with the invoice attached
            try {
                String customerEmail = order.getCustomerEmail();
                if (customerEmail != null && !customerEmail.isBlank()) {
                    String receiptUrl = null;
                    byte[] invoicePdfBytes = null;
                    String invoiceFilename = null;
                    String pdfUrl = null;

                    // Get payment intent ID
                    String piId = stripeSession.getPaymentIntent();
                    if (piId != null) {
                        try {
                            // Try to get receipt URL from charges
                            com.stripe.param.ChargeListParams clp = com.stripe.param.ChargeListParams.builder().setPaymentIntent(piId).setLimit(1L).build();
                            com.stripe.model.ChargeCollection cc = com.stripe.model.Charge.list(clp);
                            if (cc != null && cc.getData() != null && !cc.getData().isEmpty()) {
                                com.stripe.model.Charge ch = cc.getData().get(0);
                                if (ch.getReceiptUrl() != null) {
                                    receiptUrl = ch.getReceiptUrl();
                                    log.info("Found receipt URL for order {}: {}", order.getOrderNumber(), receiptUrl);
                                }
                            }
                        } catch (Exception e) {
                            log.warn("Unable to get receipt URL: {}", e.getMessage());
                        }

                        try {
                            // Try to get invoice PDF
                            PaymentIntent pi = PaymentIntent.retrieve(piId);
                            if (pi != null && pi.getInvoice() != null) {
                                String invId = pi.getInvoice();
                                Invoice inv = Invoice.retrieve(invId);
                                if (inv != null && inv.getInvoicePdf() != null) {
                                    pdfUrl = inv.getInvoicePdf();
                                    invoiceFilename = "invoice-" + order.getOrderNumber() + ".pdf";
                                    HttpClient client = HttpClient.newHttpClient();
                                    HttpRequest req = HttpRequest.newBuilder()
                                                .uri(URI.create(pdfUrl))
                                                .GET()
                                                .build();
                                    HttpResponse<byte[]> resp = client.send(req, HttpResponse.BodyHandlers.ofByteArray());
                                    if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
                                        invoicePdfBytes = resp.body();
                                    } else {
                                        log.warn("Failed to download invoice pdf (status={}) from {}", resp.statusCode(), pdfUrl);
                                    }
                                }
                            }
                        } catch (Exception e) {
                            log.warn("Unable to get invoice PDF: {}", e.getMessage());
                        }
                    }

                    // Persist receipt and invoice URLs on the order so the frontend can show links
                    try {
                        boolean updated = false;
                        if (receiptUrl != null && !receiptUrl.isBlank()) {
                            order.setReceiptUrl(receiptUrl);
                            updated = true;
                        }
                        if (pdfUrl != null && !pdfUrl.isBlank()) {
                            order.setInvoicePdfUrl(pdfUrl);
                            updated = true;
                        }
                        if (updated) {
                            try { orderRepository.save(order); } catch (Exception e) { log.warn("Failed to persist invoice/receipt URLs on order {}: {}", order.getOrderNumber(), e.getMessage()); }
                        }
                    } catch (Exception e) {
                        log.warn("Error persisting invoice/receipt URLs: {}", e.getMessage());
                    }

                    String subject = "Obrigado pela sua compra - Pedido " + order.getOrderNumber();
                    String html = "<p>Olá,</p>" +
                            "<p>Obrigado pelo seu pedido. O pagamento foi processado com sucesso.</p>" +
                            "<p>Número do pedido: <strong>" + order.getOrderNumber() + "</strong></p>" +
                            (receiptUrl != null ? "<p>Pode consultar o recibo em: <a href='" + receiptUrl + "' target='_blank'>Ver Recibo</a></p>" : "") +
                            "<p>Se tiver alguma dúvida, responda a este email.</p>" +
                            "<p>Com os melhores cumprimentos,<br/>Escritores Nogueira</p>";
                    String text = "Olá,\n\nObrigado pelo seu pedido. Número do pedido: " + order.getOrderNumber() + "\n\nCumprimentos,\nEscritores Nogueira";

                    if (invoicePdfBytes != null && invoicePdfBytes.length > 0) {
                        emailService.sendEmailWithAttachment(customerEmail, subject, html, text, invoicePdfBytes, invoiceFilename != null ? invoiceFilename : "invoice.pdf");
                        log.info("Invoice email sent with PDF attachment for order {}", order.getOrderNumber());
                    } else {
                        // Append tracking link to the invoice email and send as transactional (no-reply)
                        String ordersLink = frontendUrl;
                        String htmlWithLink = html + "<p>Pode acompanhar a sua encomenda aqui: <a href='" + ordersLink + "' target='_blank'>Acompanhar Encomenda</a></p>";
                        String textWithLink = text + "\n\nPode acompanhar a sua encomenda aqui: " + ordersLink;
                        emailService.sendTransactionalEmail(customerEmail, subject, htmlWithLink, textWithLink);
                        log.info("Invoice email (no attachment) sent (transactional) for order {}", order.getOrderNumber());
                    }
                }
            } catch (Exception e) {
                log.warn("Error while sending invoice email: {}", e.getMessage());
            }

            return ResponseEntity.ok(Map.of("orderId", order.getId(), "orderNumber", order.getOrderNumber()));
        } catch (Exception e) {
            log.error("Error confirming session", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/stripe-account")
    public ResponseEntity<?> getStripeAccountInfo() {
        try {
            Account acct = Account.retrieve();
            Map<String,Object> m = new HashMap<>();
            m.put("id", acct.getId());
            m.put("country", acct.getCountry());
            m.put("businessType", acct.getBusinessType());
            m.put("email", acct.getEmail());
            m.put("settings", acct.getSettings() != null ? acct.getSettings() : Map.of());
            return ResponseEntity.ok(m);
        } catch (Exception e) {
            log.error("Stripe account info error: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/mbway")
    public ResponseEntity<?> createMbwayOrder(@RequestHeader(value = "X-Session-Token", required = false) String sessionToken,
                                              @RequestBody CreatePaymentRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No items provided"));

        String mbwayCode = String.format("%06d", new Random().nextInt(999999));
        Optional<User> userOpt = sessionService.validateSession(sessionToken).map(UserSession::getUser);
        String customerEmail = req.getCustomerEmail();
        if ((customerEmail == null || customerEmail.isBlank()) && userOpt.isPresent()) customerEmail = userOpt.get().getEmail();

        Order.OrderBuilder mbOrderBuilder = Order.builder()
                .orderNumber(generateOrderNumber())
                .customerEmail(customerEmail != null ? customerEmail : "")
                .paymentMethod("mbway")
                .paymentStatus(Order.PaymentStatus.PENDING)
                .status(Order.OrderStatus.PENDING)
                .paymentId(mbwayCode);
        if (userOpt.isPresent()) mbOrderBuilder.user(userOpt.get());
        Order order = mbOrderBuilder.build();

        for (PaymentItemDTO it : req.getItems()) {
            Optional<Book> bookOpt = bookRepository.findById(it.getBookId());
            if (bookOpt.isEmpty()) continue;
            Book b = bookOpt.get();

            if (b.getStripeProductId() == null || b.getStripeProductId().isBlank()) return ResponseEntity.status(400).body(Map.of("error", "Missing stripeProductId for book " + b.getId()));
            try {
                Product prod = Product.retrieve(b.getStripeProductId());
                Long unitAmount = null;
                try { Object def = prod != null ? prod.getDefaultPrice() : null; String defId = def instanceof String ? (String) def : null; if (defId != null) { Price defPrice = Price.retrieve(defId); if (defPrice != null) unitAmount = defPrice.getUnitAmount(); } } catch (Exception ignore) {}
                if (unitAmount == null) {
                    PriceCollection pc = Price.list(PriceListParams.builder().setProduct(b.getStripeProductId()).setLimit(1L).build());
                    if (pc != null && pc.getData() != null && !pc.getData().isEmpty()) unitAmount = pc.getData().get(0).getUnitAmount();
                }
                if (unitAmount == null) return ResponseEntity.status(400).body(Map.of("error", "Missing Stripe price with unit amount for book " + b.getId()));
                BigDecimal itemPrice = BigDecimal.valueOf(unitAmount).divide(BigDecimal.valueOf(100));
                order.addItem(OrderItem.builder().book(b).quantity(it.getQuantity()).price(itemPrice).build());
            } catch (StripeException se) {
                return ResponseEntity.status(500).body(Map.of("error", "Stripe error retrieving price for book " + b.getId()));
            }
        }
        order.setTotal(order.calculateTotal()); orderRepository.save(order);
        return ResponseEntity.ok(Map.of("orderId", order.getId(), "orderNumber", order.getOrderNumber(), "mbwayCode", mbwayCode));
    }

    @PostMapping("/bank-transfer")
    public ResponseEntity<?> createBankTransferOrder(@RequestHeader(value = "X-Session-Token", required = false) String sessionToken,
                                                    @RequestBody CreatePaymentRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No items provided"));
        String orderNumber = generateOrderNumber();
        String reference = "EN-" + orderNumber.substring(Math.max(0, orderNumber.length() - 5));
        Optional<User> userOpt = sessionService.validateSession(sessionToken).map(UserSession::getUser);
        String customerEmail = req.getCustomerEmail(); if ((customerEmail == null || customerEmail.isBlank()) && userOpt.isPresent()) customerEmail = userOpt.get().getEmail();
        Order.OrderBuilder btBuilder = Order.builder().orderNumber(orderNumber).customerEmail(customerEmail != null ? customerEmail : "").paymentMethod("bank_transfer").paymentStatus(Order.PaymentStatus.PENDING).status(Order.OrderStatus.PENDING).paymentId(reference);
        if (userOpt.isPresent()) btBuilder.user(userOpt.get()); Order order = btBuilder.build();
        for (PaymentItemDTO it : req.getItems()) {
            Optional<Book> bookOpt = bookRepository.findById(it.getBookId()); if (bookOpt.isEmpty()) continue; Book b = bookOpt.get();
            if (b.getStripeProductId() == null || b.getStripeProductId().isBlank()) return ResponseEntity.status(400).body(Map.of("error", "Missing stripeProductId for book " + b.getId()));
            try {
                Product prod = Product.retrieve(b.getStripeProductId()); Long unitAmount = null; try { Object def = prod != null ? prod.getDefaultPrice() : null; String defId = def instanceof String ? (String) def : null; if (defId != null) { Price defPrice = Price.retrieve(defId); if (defPrice != null) unitAmount = defPrice.getUnitAmount(); } } catch (Exception ignore) {}
                if (unitAmount == null) { PriceCollection pc = Price.list(PriceListParams.builder().setProduct(b.getStripeProductId()).setLimit(1L).build()); if (pc != null && pc.getData() != null && !pc.getData().isEmpty()) unitAmount = pc.getData().get(0).getUnitAmount(); }
                if (unitAmount == null) return ResponseEntity.status(400).body(Map.of("error", "Missing Stripe price with unit amount for book " + b.getId()));
                BigDecimal itemPrice = BigDecimal.valueOf(unitAmount).divide(BigDecimal.valueOf(100)); order.addItem(OrderItem.builder().book(b).quantity(it.getQuantity()).price(itemPrice).build());
            } catch (StripeException se) { return ResponseEntity.status(500).body(Map.of("error", "Stripe error retrieving price for book " + b.getId())); }
        }
        order.setTotal(order.calculateTotal()); orderRepository.save(order);
        return ResponseEntity.ok(Map.of("orderId", order.getId(), "orderNumber", order.getOrderNumber(), "reference", reference));
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirmPayment(@RequestBody Map<String, Object> body) {
        try {
            if (body == null) return ResponseEntity.badRequest().body(Map.of("error", "Missing body"));
            Optional<Order> orderOpt = Optional.empty();
            if (body.containsKey("orderId")) orderOpt = orderRepository.findById(Long.valueOf(String.valueOf(body.get("orderId"))));
            else if (body.containsKey("orderNumber")) orderOpt = orderRepository.findByOrderNumber(String.valueOf(body.get("orderNumber")));
            if (orderOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Order not found"));
            Order order = orderOpt.get();
            order.setPaymentStatus(Order.PaymentStatus.PAID);
            order.setStatus(Order.OrderStatus.PROCESSING);
            orderRepository.save(order);
            return ResponseEntity.ok(Map.of("orderId", order.getId(), "status", order.getStatus().name()));
        } catch (Exception e) { log.error("Error confirming payment: {}", e.getMessage(), e); return ResponseEntity.status(500).body(Map.of("error", e.getMessage())); }
    }

    private String generateOrderNumber() { long timestamp = System.currentTimeMillis(); int random = new Random().nextInt(900) + 100; return "EN" + timestamp + random; }
}
