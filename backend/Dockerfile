# backend/Dockerfile
# build stage
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN ./mvnw -B -ntp -DskipTests dependency:go-offline
COPY src ./src
RUN ./mvnw -B -ntp -DskipTests package

# runtime stage
FROM eclipse-temurin:21-jdk-jammy
WORKDIR /opt/app
COPY --from=build /workspace/target/*.jar app.jar

# Create startup script that loads .env file if it exists
RUN echo '#!/bin/bash' > /opt/app/start.sh && \
    echo 'if [ -f /app/.env ]; then' >> /opt/app/start.sh && \
    echo '  export $(grep -v "^#" /app/.env | xargs)' >> /opt/app/start.sh && \
    echo 'fi' >> /opt/app/start.sh && \
    echo 'exec java -jar /opt/app/app.jar' >> /opt/app/start.sh && \
    chmod +x /opt/app/start.sh

ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/opt/app/start.sh"]