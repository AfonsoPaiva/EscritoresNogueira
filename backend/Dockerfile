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
ENV PORT=8080
EXPOSE 8080
# Optimize JVM for Cloud Run with faster startup and memory limits
ENTRYPOINT ["java", \
    "-Xmx256m", \
    "-Xms128m", \
    "-XX:MaxMetaspaceSize=128m", \
    "-XX:+UseG1GC", \
    "-XX:MaxGCPauseMillis=200", \
    "-XX:+UseStringDeduplication", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", \
    "/opt/app/app.jar"]