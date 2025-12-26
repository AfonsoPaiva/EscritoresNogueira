package com.escritoresnogueira.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.StringJoiner;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.core.io.ByteArrayResource;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.nio.file.StandardOpenOption;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.from:no-reply@escritoresnogueira.com}")
    private String fromAddress;

    @Value("${app.newsletter.from:}")
    private String newsletterFrom;

    @Value("${mailgun.api-key:}")
    private String mailgunApiKey;

    @Value("${mailgun.domain:}")
    private String mailgunDomain;

    private static HttpRequest.BodyPublisher ofFormData(Map<String, String> data) {
        StringJoiner sj = new StringJoiner("&");
        try {
            for (Map.Entry<String, String> entry : data.entrySet()) {
                sj.add(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8.name())
                        + "=" + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8.name()));
            }
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }
        return HttpRequest.BodyPublishers.ofString(sj.toString());
    }

    private void sendViaMailgun(String to, String subject, String html, String text) {
        if (mailgunApiKey == null || mailgunApiKey.isBlank() || mailgunDomain == null || mailgunDomain.isBlank()) {
            throw new IllegalStateException("Mailgun not configured");
        }

        try {
            String url = "https://api.mailgun.net/v3/" + mailgunDomain + "/messages";
            HttpClient client = HttpClient.newHttpClient();
            // Ensure 'from' uses the Mailgun domain (Mailgun often requires a sender from a verified domain)
            String effectiveFrom = fromAddress != null ? fromAddress : "postmaster@" + mailgunDomain;
            if (!effectiveFrom.toLowerCase().contains("@" + mailgunDomain.toLowerCase())) {
                log.warn("Configured from address '{}' does not match Mailgun domain '{}'. Using postmaster@{} as sender.", fromAddress, mailgunDomain, mailgunDomain);
                effectiveFrom = "postmaster@" + mailgunDomain;
            }

            Map<String, String> form = Map.of(
                    "from", effectiveFrom,
                    "to", to,
                    "subject", subject,
                    "html", html,
                    "text", text == null ? "" : text,
                    "h:Reply-To", "contacto@escritoresnogueira.com",
                    "h:X-Mailgun-Tag", "transactional",
                    "h:X-Auto-Response-Suppress", "All"
            );

            String auth = Base64.getEncoder().encodeToString(("api:" + mailgunApiKey).getBytes(StandardCharsets.UTF_8));

            log.debug("Mailgun request URL={}, domain={}, from={}, to={}, apiKeyPresent={}", url, mailgunDomain, effectiveFrom, to, mailgunApiKey != null && !mailgunApiKey.isBlank());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(ofFormData(form))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            String body = response.body();
            if (status >= 400) {
                log.error("Mailgun send failed (status={}): {}", status, body);
                throw new RuntimeException("Mailgun send failed: status=" + status + " body=" + (body == null ? "" : body));
            }
            log.info("✉️ Email sent via Mailgun to {} (status={})", to, status);
        } catch (Exception e) {
            log.error("Erro ao enviar email via Mailgun: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao enviar email via Mailgun: " + e.getMessage());
        }
    }

    /**
     * Mailgun send variant that allows specifying a different sender (used for newsletters).
     */
    private void sendViaMailgunFrom(String from, String to, String subject, String html, String text) {
        if (mailgunApiKey == null || mailgunApiKey.isBlank() || mailgunDomain == null || mailgunDomain.isBlank()) {
            throw new IllegalStateException("Mailgun not configured");
        }

        try {
            String url = "https://api.mailgun.net/v3/" + mailgunDomain + "/messages";
            HttpClient client = HttpClient.newHttpClient();
            // Ensure provided 'from' uses the Mailgun domain, otherwise fallback to postmaster
            String effectiveFrom = (from != null && !from.isBlank()) ? from : fromAddress;
            if (effectiveFrom == null) effectiveFrom = "postmaster@" + mailgunDomain;
            if (!effectiveFrom.toLowerCase().contains("@" + mailgunDomain.toLowerCase())) {
                log.warn("Newsletter from address '{}' does not match Mailgun domain '{}'. Using postmaster@{} as sender.", effectiveFrom, mailgunDomain, mailgunDomain);
                effectiveFrom = "postmaster@" + mailgunDomain;
            }

            Map<String, String> form = Map.of(
                    "from", effectiveFrom,
                    "to", to,
                    "subject", subject,
                    "html", html,
                    "text", text == null ? "" : text,
                    "h:Reply-To", "contacto@escritoresnogueira.com",
                    "h:X-Mailgun-Tag", "newsletter",
                    "h:X-Auto-Response-Suppress", "All"
            );

            String auth = Base64.getEncoder().encodeToString(("api:" + mailgunApiKey).getBytes(StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(ofFormData(form))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            String body = response.body();
            if (status >= 400) {
                log.error("Mailgun send failed (status={}): {}", status, body);
                throw new RuntimeException("Mailgun send failed: status=" + status + " body=" + (body == null ? "" : body));
            }
            log.info("✉️ Newsletter email sent via Mailgun to {} (status={})", to, status);
        } catch (Exception e) {
            log.error("Erro ao enviar newsletter via Mailgun: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao enviar newsletter via Mailgun: " + e.getMessage());
        }
    }

    public void sendVerificationLink(String to, String link) {
        log.debug("Sending verification link to {}: {}", to, link);
        String subject = "Verificação de Email - Escritores Nogueira";
        String html = "<!DOCTYPE html>" +
                "<html lang='pt'>" +
                "<head>" +
                "<meta charset='UTF-8'>" +
                "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Verificação de Email - Escritores Nogueira</title>" +
                "<style>" +
                "body { font-family: 'Questrial', Arial, sans-serif; color: #1a1a1a; background-color: #F5F5F5; margin: 0; padding: 20px; }" +
                ".container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; padding: 30px; border-radius: 8px; box-shadow: 0 4px 16px rgba(14, 27, 77, 0.12); }" +
                ".header { text-align: center; margin-bottom: 30px; }" +
                ".logo { font-family: 'EB Garamond', serif; font-size: 28px; color: #0E1B4D; font-weight: bold; }" +
                ".content { line-height: 1.6; margin-bottom: 30px; }" +
                ".button { display: inline-block; background-color: #FFB100; color: #0E1B4D; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-align: center; margin: 10px 0; }" +
                ".button:hover { background-color: #e6a000; }" +
                ".link-text { word-break: break-all; background-color: #F5F5F5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px; color: #666666; margin: 10px 0; }" +
                ".footer { text-align: center; font-size: 14px; color: #666666; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<div class='logo'>Escritores Nogueira</div>" +
                "</div>" +
                "<div class='content'>" +
                "<p>Olá,</p>" +
                "<p>Obrigado por se registar no site Escritores Nogueira. Para ativar a sua conta, verifique o seu endereço de email clicando no botão abaixo:</p>" +
                "<p style='text-align: center;'><a href='" + link + "' class='button'>Verificar Email</a></p>" +
                "<p>Ou copie e cole este link no seu navegador:</p>" +
                "<div class='link-text'>" + link + "</div>" +
                "<p>Este link é válido por 1 hora. Se não se registou, ignore esta mensagem.</p>" +
                "<p style='font-size: 12px; color: #999; margin-top: 20px;'>Se este email foi para a caixa de spam, adicione contacto@escritoresnogueira.com aos seus contactos.</p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>Cumprimentos,<br/>Equipe Escritores Nogueira</p>" +
                "<p>Se tiver dúvidas, contacte-nos através de <a href='mailto:contacto@escritoresnogueira.com' style='color: #0E1B4D;'>contacto@escritoresnogueira.com</a></p>" +
                "<p style='font-size: 12px; color: #999;'>Este é um email automático. Por favor, não responda diretamente.</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
        String text = "Olá,\n\n" +
                "Obrigado por se registar no site Escritores Nogueira.\n\n" +
                "Para ativar a sua conta, verifique o seu endereço de email clicando ou copiando este link:\n" +
                link + "\n\n" +
                "Este link é válido por 1 hora.\n\n" +
                "Se não se registou, ignore esta mensagem.\n\n" +
                "Cumprimentos,\n" +
                "Equipe Escritores Nogueira\n" +
                "contacto@escritoresnogueira.com\n\n" +
                "Este é um email automático. Por favor, não responda diretamente.\n" +
                "Se este email foi para a caixa de spam, adicione contacto@escritoresnogueira.com aos seus contactos.";

        String effectiveNewsletterFrom = (newsletterFrom != null && !newsletterFrom.isBlank()) ? newsletterFrom : fromAddress;
        log.info("[EmailService] effectiveNewsletterFrom='{}' (app.email.from='{}', app.newsletter.from='{}')", effectiveNewsletterFrom, fromAddress, newsletterFrom);
        if (mailgunApiKey != null && !mailgunApiKey.isBlank() && mailgunDomain != null && !mailgunDomain.isBlank()) {
            log.info("[EmailService] Sending newsletter via Mailgun using From='{}'", effectiveNewsletterFrom);
            sendViaMailgunFrom(effectiveNewsletterFrom, to, subject, html, text);
            return;
        }

        // Mailgun not configured: try SMTP fallback, otherwise persist link to local log for development.
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setFrom(effectiveNewsletterFrom != null ? effectiveNewsletterFrom : fromAddress);
            msg.setSubject(subject);
            msg.setText(text);
            mailSender.send(msg);
            log.info("✉️ Verification link sent (SMTP fallback) to {}", to);
            return;
        } catch (Exception e) {
            log.warn("SMTP fallback failed for verification email to {}: {}", to, e.getMessage());
            // As a last resort for local development, write the link to a local log file so developers can copy it.
            try {
                Path logsDir = Path.of("logs");
                if (!Files.exists(logsDir)) {
                    Files.createDirectories(logsDir);
                }
                String file = "logs/verification-links.log";
                String line = String.format("%s | %s | %s | %s%n",
                        LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME), subject, to, link);
                Files.writeString(Path.of(file), line, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
                log.info("🔒 Verification link written to {} for {} (development fallback)", file, to);
            } catch (IOException ex) {
                log.error("Failed to write verification link to local log: {}", ex.getMessage(), ex);
            }
        }
    }

    public void sendPasswordResetLink(String to, String link) {
        log.debug("Sending password reset link to {}: {}", to, link);
        String subject = "Reposição de Password - Escritores Nogueira";
        String html = "<!DOCTYPE html>" +
                "<html lang='pt'>" +
                "<head>" +
                "<meta charset='UTF-8'>" +
                "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Repor Password - Escritores Nogueira</title>" +
                "<style>" +
                "body { font-family: 'Questrial', Arial, sans-serif; color: #1a1a1a; background-color: #F5F5F5; margin: 0; padding: 20px; }" +
                ".container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; padding: 30px; border-radius: 8px; box-shadow: 0 4px 16px rgba(14, 27, 77, 0.12); }" +
                ".header { text-align: center; margin-bottom: 30px; }" +
                ".logo { font-family: 'EB Garamond', serif; font-size: 28px; color: #0E1B4D; font-weight: bold; }" +
                ".content { line-height: 1.6; margin-bottom: 30px; }" +
                ".button { display: inline-block; background-color: #FFB100; color: #0E1B4D; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-align: center; margin: 10px 0; }" +
                ".button:hover { background-color: #e6a000; }" +
                ".link-text { word-break: break-all; background-color: #F5F5F5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px; color: #666666; margin: 10px 0; }" +
                ".footer { text-align: center; font-size: 14px; color: #666666; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<div class='logo'>Escritores Nogueira</div>" +
                "</div>" +
                "<div class='content'>" +
                "<p>Olá,</p>" +
                "<p>Recebemos um pedido para repor a sua password. Para continuar, clique no botão abaixo:</p>" +
                "<p style='text-align: center;'><a href='" + link + "' class='button'>Repor Password</a></p>" +
                "<p>Ou copie e cole este link no seu navegador:</p>" +
                "<div class='link-text'>" + link + "</div>" +
                "<p>Este link é válido por 1 hora. Se não pediu este email, ignore esta mensagem.</p>" +
                "<p style='font-size: 12px; color: #999; margin-top: 20px;'>Se este email foi para a caixa de spam, adicione contacto@escritoresnogueira.com aos seus contactos.</p>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>Cumprimentos,<br/>Equipe Escritores Nogueira</p>" +
                "<p>Se tiver dúvidas, contacte-nos através de <a href='mailto:contacto@escritoresnogueira.com' style='color: #0E1B4D;'>contacto@escritoresnogueira.com</a></p>" +
                "<p style='font-size: 12px; color: #999;'>Este é um email automático. Por favor, não responda diretamente.</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
        String text = "Olá,\n\n" +
                "Recebemos um pedido para repor a sua password no site Escritores Nogueira.\n\n" +
                "Para repor a sua password, clique ou copie este link:\n" +
                link + "\n\n" +
                "Este link é válido por 1 hora.\n\n" +
                "Se não pediu este email, ignore esta mensagem.\n\n" +
                "Cumprimentos,\n" +
                "Equipe Escritores Nogueira\n" +
                "contacto@escritoresnogueira.com\n\n" +
                "Este é um email automático. Por favor, não responda diretamente.\n" +
                "Se este email foi para a caixa de spam, adicione contacto@escritoresnogueira.com aos seus contactos.";

        if (mailgunApiKey != null && !mailgunApiKey.isBlank() && mailgunDomain != null && !mailgunDomain.isBlank()) {
            sendViaMailgun(to, subject, html, text);
            return;
        }

        // Fallback to SMTP if Mailgun not configured
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setFrom(fromAddress);
            msg.setSubject(subject);
            msg.setText(text);
            mailSender.send(msg);
            log.info("✉️ Password reset link sent (SMTP fallback) to {}", to);
        } catch (Exception e) {
            log.error("Erro ao enviar email de reposição (SMTP) para {}: {}", to, e.getMessage());
            // As last-resort fallback: persist the reset link locally so developer/user in dev can access it.
            try {
                Path logsDir = Path.of("logs");
                if (!Files.exists(logsDir)) {
                    Files.createDirectories(logsDir);
                }
                String file = "logs/password-reset-links.log";
                String line = String.format("%s | %s | %s | %s%n",
                        LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME), subject, to, link);
                Files.writeString(Path.of(file), line, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
                log.info("🔒 Password reset link written to {} for {} (development fallback)", file, to);
            } catch (IOException ex) {
                log.error("Failed to write password reset link to local log: {}", ex.getMessage(), ex);
            }
            // Do not rethrow; callers expect boolean/generic responses
        }
    }

    /**
     * Helper used only for diagnostics: attempt to send a simple test email via Mailgun.
     * Returns a short status message (not exposing secrets).
     */
    public String sendTestMailgun(String to) {
        if (mailgunApiKey == null || mailgunApiKey.isBlank() || mailgunDomain == null || mailgunDomain.isBlank()) {
            return "Mailgun not configured";
        }
        try {
            String subject = "Teste de Email - Escritores Nogueira";
            String text = "Esta é uma mensagem de teste para verificar a configuração do Mailgun.";
            String html = "<!DOCTYPE html>" +
                    "<html lang='pt'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
                    "<style>body{font-family:Arial,Helvetica,sans-serif;background:#F5F5F5;color:#222;margin:0;padding:20px} .card{max-width:600px;margin:0 auto;background:#fff;padding:24px;border-radius:8px;box-shadow:0 6px 18px rgba(14,27,77,0.06)} .title{color:#0E1B4D;font-weight:700;font-size:18px;margin-bottom:8px} .content{line-height:1.6;color:#444}</style></head>" +
                    "<body><div class='card'><div class='title'>Teste de Email</div><div class='content'><p>Esta é uma mensagem de teste para verificar a configuração do Mailgun.</p>" +
                    "<p style='font-size:13px;color:#666'>Se recebeu este email, a integração está a funcionar corretamente.</p></div></div></body></html>";
            sendViaMailgun(to, subject, html, text);
            return "sent";
        } catch (Exception e) {
            log.error("Mailgun test send failed: {}", e.getMessage(), e);
            return "error: " + e.getMessage();
        }
    }

    public void sendWelcomeEmail(String to, String name) {
        // Deprecated: prefer sendWelcomeEmail(to, name, unsubscribeToken)
        sendWelcomeEmail(to, name, null);
    }

    /**
     * Send welcome email including unsubscribe link using the provided token.
     * If token is null, the unsubscribe link will not include a token.
     */
    public void sendWelcomeEmail(String to, String name, String unsubscribeToken) {
        String subject = "Bem-vindo à Newsletter dos Escritores Nogueira!";
        String unsubscribeLink = unsubscribeToken != null ? getUnsubscribeLink(unsubscribeToken) : "";
        String text = "Olá " + (name != null ? name : "") + ",\n\nObrigado por se inscrever na nossa newsletter!\n\nReceberá atualizações sobre novos livros, artigos e novidades." +
            (unsubscribeLink.isEmpty() ? "" : "\n\nSe não quiser receber mais emails, pode cancelar a qualquer momento: " + unsubscribeLink) +
            "\n\nAtenciosamente,\nEscritores Nogueira";

        String html = "<!DOCTYPE html>" +
            "<html lang='pt'>" +
            "<head>" +
            "<meta charset='UTF-8'>" +
            "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
            "<title>Bem-vindo - Escritores Nogueira</title>" +
            "<style>" +
            "body { font-family: 'Questrial', Arial, sans-serif; color: #1a1a1a; background-color: #F5F5F5; margin: 0; padding: 20px; }" +
            ".container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; padding: 28px; border-radius: 8px; box-shadow: 0 6px 20px rgba(14,27,77,0.08); }" +
            ".header { text-align: center; margin-bottom: 20px; }" +
            ".logo { font-family: 'EB Garamond', serif; font-size: 26px; color: #0E1B4D; font-weight: bold; }" +
            ".content { line-height: 1.6; color: #333333; }" +
            ".cta { display: inline-block; background-color: #FFB100; color: #0E1B4D; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 700; margin-top: 16px; }" +
            ".footer { text-align: center; font-size: 13px; color: #777777; margin-top: 26px; border-top: 1px solid #e9e9e9; padding-top: 18px; }" +
            "a { color: #0E1B4D; }" +
            "</style>" +
            "</head>" +
            "<body>" +
            "<div class='container'>" +
            "<div class='header'><div class='logo'>Escritores Nogueira</div></div>" +
            "<div class='content'>" +
            "<p>Olá " + (name != null ? name : "") + ",</p>" +
            "<p>Obrigado por se inscrever na nossa newsletter! Fique atento às novidades sobre novos livros, promoções e artigos exclusivos.</p>" +
            (unsubscribeLink.isEmpty() ? "" : "<p style='text-align:center;'><a href='" + unsubscribeLink + "' class='cta'>Cancelar inscrição</a></p>") +
            "<p style='margin-top:18px;'>Se tiver alguma dúvida, responda para contacto@escritoresnogueira.com</p>" +
            "</div>" +
            "<div class='footer'>" +
            "<p>Cumprimentos,<br/>Equipe Escritores Nogueira</p>" +
            "</div>" +
            "</div>" +
            "</body></html>";

        String effectiveNewsletterFrom = (newsletterFrom != null && !newsletterFrom.isBlank()) ? newsletterFrom : fromAddress;
        boolean mailgunConfigured = mailgunApiKey != null && !mailgunApiKey.isBlank() && mailgunDomain != null && !mailgunDomain.isBlank();
        log.info("[EmailService] sendWelcomeEmail effectiveFrom='{}' (app.email.from='{}', app.newsletter.from='{}'), mailgunConfigured={}", effectiveNewsletterFrom, fromAddress, newsletterFrom, mailgunConfigured);
        if (mailgunConfigured) {
            log.info("[EmailService] Sending welcome/newsletter via Mailgun using From='{}'", effectiveNewsletterFrom);
            sendViaMailgunFrom(effectiveNewsletterFrom, to, subject, html, text);
            return;
        }

        // Mailgun not configured: try SMTP fallback
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setFrom(effectiveNewsletterFrom != null ? effectiveNewsletterFrom : fromAddress);
            msg.setSubject(subject);
            msg.setText(text);
            mailSender.send(msg);
            log.info("✉️ Welcome newsletter sent (SMTP fallback) to {}", to);
            return;
        } catch (Exception e) {
            log.warn("SMTP fallback failed for welcome email to {}: {}", to, e.getMessage());
        }
    }

    public void sendNewsletterEmail(String to, String subject, String content) {
        sendNewsletterEmail(to, subject, content, null, null);
    }

    public void sendNewsletterEmail(String to, String subject, String content, String name, String unsubscribeToken) {
        String unsubscribeLink = unsubscribeToken != null ? getUnsubscribeLink(unsubscribeToken) : "";
        String greeting = name != null ? "Olá " + name + "," : "";
        String text = (greeting.isEmpty() ? "" : greeting + "\n\n") + content + (unsubscribeLink.isEmpty() ? "" : "\n\nPara cancelar a inscrição: " + unsubscribeLink);

        String html = "<!DOCTYPE html><html lang='pt'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
                "<style>body{font-family:Arial,Helvetica,sans-serif;background:#F5F5F5;color:#222;margin:0;padding:20px}.card{max-width:700px;margin:0 auto;background:#fff;padding:28px;border-radius:8px;box-shadow:0 8px 24px rgba(14,27,77,0.06)}.logo{font-weight:700;color:#0E1B4D;font-size:20px;margin-bottom:10px}.content{line-height:1.65;color:#333}.footer{margin-top:20px;font-size:13px;color:#777}.cta{display:inline-block;background:#FFB100;color:#0E1B4D;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:700}</style>" +
                "</head><body><div class='card'><div class='logo'>Escritores Nogueira</div><div class='content'>" +
                (greeting.isEmpty() ? "" : "<p>" + greeting + "</p>") +
                "<div>" + content + "</div>" +
                (unsubscribeLink.isEmpty() ? "" : "<p style='margin-top:18px'><a href='" + unsubscribeLink + "' class='cta'>Cancelar Inscrição</a></p>") +
                "</div><div class='footer'><p>Se tiver dúvidas, contacte-nos em <a href='mailto:contacto@escritoresnogueira.com'>contacto@escritoresnogueira.com</a></p></div></div></body></html>";

        String effectiveNewsletterFrom = (newsletterFrom != null && !newsletterFrom.isBlank()) ? newsletterFrom : fromAddress;
        boolean mailgunConfigured = mailgunApiKey != null && !mailgunApiKey.isBlank() && mailgunDomain != null && !mailgunDomain.isBlank();
        log.info("[EmailService] sendNewsletterEmail effectiveFrom='{}' (app.email.from='{}', app.newsletter.from='{}'), mailgunConfigured={}", effectiveNewsletterFrom, fromAddress, newsletterFrom, mailgunConfigured);
        if (mailgunConfigured) {
            log.info("[EmailService] Sending newsletter via Mailgun using From='{}'", effectiveNewsletterFrom);
            sendViaMailgunFrom(effectiveNewsletterFrom, to, subject, html, text);
            return;
        }

        // SMTP fallback for newsletters
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setFrom(effectiveNewsletterFrom != null ? effectiveNewsletterFrom : fromAddress);
            msg.setSubject(subject);
            msg.setText(text);
            mailSender.send(msg);
            log.info("✉️ Newsletter sent (SMTP fallback) to {} (From={})", to, effectiveNewsletterFrom != null ? effectiveNewsletterFrom : fromAddress);
            return;
        } catch (Exception e) {
            log.error("SMTP fallback failed for newsletter to {}: {}", to, e.getMessage());
            // allow exception to propagate
            throw new RuntimeException("Erro ao enviar newsletter: " + e.getMessage(), e);
        }
    }

    /**
     * Send an email with a single attachment (PDF expected) using Mailgun multipart upload if configured,
     * otherwise falls back to SMTP via JavaMail with attachment.
     */
    public void sendEmailWithAttachment(String to, String subject, String html, String text, byte[] attachmentBytes, String filename) {
        if (attachmentBytes == null || attachmentBytes.length == 0) {
            // nothing to attach - use plain send
            sendNewsletterEmail(to, subject, (html != null ? html : text), null, null);
            return;
        }

        if (mailgunApiKey != null && !mailgunApiKey.isBlank() && mailgunDomain != null && !mailgunDomain.isBlank()) {
            try {
                sendViaMailgunWithAttachment(to, subject, html, text, attachmentBytes, filename);
                return;
            } catch (Exception e) {
                log.error("Mailgun send with attachment failed: {}", e.getMessage(), e);
                // fallthrough to SMTP fallback
            }
        }

        // SMTP fallback using JavaMail (Mime)
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name());
            helper.setTo(to);
            helper.setFrom(fromAddress);
            helper.setSubject(subject);
            helper.setText(html != null ? html : text, html != null);
            helper.addAttachment(filename != null ? filename : "attachment.pdf", new ByteArrayResource(attachmentBytes));
            mailSender.send(mime);
            log.info("✉️ Email with attachment sent (SMTP fallback) to {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send email with attachment via SMTP fallback: {}", e.getMessage(), e);
            // persist attachment to logs for development debugging
            try {
                Path logsDir = Path.of("logs");
                if (!Files.exists(logsDir)) Files.createDirectories(logsDir);
                String file = "logs/last-invoice.pdf";
                Files.write(Path.of(file), attachmentBytes, StandardOpenOption.CREATE, StandardOpenOption.WRITE);
                log.info("Wrote invoice PDF to {} for manual inspection", file);
            } catch (Exception ex) {
                log.error("Failed to persist invoice pdf locally: {}", ex.getMessage(), ex);
            }
        }
    }

    private void sendViaMailgunWithAttachment(String to, String subject, String html, String text, byte[] attachmentBytes, String filename) throws Exception {
        if (mailgunApiKey == null || mailgunApiKey.isBlank() || mailgunDomain == null || mailgunDomain.isBlank()) {
            throw new IllegalStateException("Mailgun not configured");
        }

        String boundary = "----JavaMailBoundary" + System.currentTimeMillis();
        String url = "https://api.mailgun.net/v3/" + mailgunDomain + "/messages";
        String effectiveFrom = fromAddress != null ? fromAddress : "postmaster@" + mailgunDomain;
        if (!effectiveFrom.toLowerCase().contains("@" + mailgunDomain.toLowerCase())) {
            effectiveFrom = "postmaster@" + mailgunDomain;
        }

        // Build multipart body
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        String ln = "\r\n";
        try {
            // fields
            Map<String, String> fields = Map.of(
                    "from", effectiveFrom,
                    "to", to,
                    "subject", subject,
                    "html", html != null ? html : "",
                    "text", text != null ? text : ""
            );
            for (Map.Entry<String, String> e : fields.entrySet()) {
                baos.write(("--" + boundary + ln).getBytes(StandardCharsets.UTF_8));
                baos.write(("Content-Disposition: form-data; name=\"" + e.getKey() + "\"" + ln + ln).getBytes(StandardCharsets.UTF_8));
                baos.write((e.getValue() + ln).getBytes(StandardCharsets.UTF_8));
            }

            // attachment part
            baos.write(("--" + boundary + ln).getBytes(StandardCharsets.UTF_8));
            baos.write(("Content-Disposition: form-data; name=\"attachment\"; filename=\"" + (filename != null ? filename : "invoice.pdf") + "\"" + ln).getBytes(StandardCharsets.UTF_8));
            baos.write(("Content-Type: application/pdf" + ln + ln).getBytes(StandardCharsets.UTF_8));
            baos.write(attachmentBytes);
            baos.write(ln.getBytes(StandardCharsets.UTF_8));

            // final boundary
            baos.write(("--" + boundary + "--" + ln).getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        byte[] body = baos.toByteArray();

        String auth = Base64.getEncoder().encodeToString(("api:" + mailgunApiKey).getBytes(StandardCharsets.UTF_8));
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", "Basic " + auth)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();

        HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            log.error("Mailgun attachment send failed: status={} body={}", resp.statusCode(), resp.body());
            throw new RuntimeException("Mailgun send failed: " + resp.statusCode());
        }
        log.info("✉️ Email with attachment sent via Mailgun to {} (status={})", to, resp.statusCode());
    }

    private String getUnsubscribeLink(String token) {
        return "http://localhost:8080/api/auth/unsubscribe-newsletter?token=" + token;
    }
}


