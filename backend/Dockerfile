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
WORKDIR /app
COPY --from=build /workspace/target/*.jar app.jar
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["sh","-c","mkdir -p /secrets && \
  if [ -n \"$FIREBASE_CREDENTIALS_JSON\" ]; then printf '%s' \"$FIREBASE_CREDENTIALS_JSON\" > /secrets/firebase-service-account.json; fi && \
  exec java -Dserver.port=${PORT} $JAVA_OPTS -jar /app/app.jar"]