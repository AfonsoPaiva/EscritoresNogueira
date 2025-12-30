FROM eclipse-temurin:21-jre
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} /app.jar
ENTRYPOINT ["sh", "-c", "java -jar /app.jar --server.port=${PORT:-8080}"]