package main.java.com.escritoresnogueira.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.ContentNegotiationConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.ArrayList;
import java.util.List;

/**
 * Web MVC configuration to handle flexible Content-Type headers.
 * This allows the API to accept requests with various Content-Types
 * and still parse them as JSON.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    /**
     * Configure content negotiation to default to JSON
     */
    @Override
    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
        configurer
            .favorParameter(false)
            .ignoreAcceptHeader(false)
            .defaultContentType(MediaType.APPLICATION_JSON)
            .mediaType("json", MediaType.APPLICATION_JSON);
    }

    /**
     * Extend message converters to accept more media types as JSON
     */
    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        for (HttpMessageConverter<?> converter : converters) {
            if (converter instanceof MappingJackson2HttpMessageConverter jacksonConverter) {
                List<MediaType> supportedMediaTypes = new ArrayList<>(jacksonConverter.getSupportedMediaTypes());
                // Add additional media types that should be treated as JSON
                supportedMediaTypes.add(MediaType.APPLICATION_OCTET_STREAM);
                supportedMediaTypes.add(MediaType.ALL);
                jacksonConverter.setSupportedMediaTypes(supportedMediaTypes);
            }
        }
    }
}
