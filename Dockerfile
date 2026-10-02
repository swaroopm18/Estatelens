FROM eclipse-temurin:17-jdk-jammy

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY src/ /app/

RUN mkdir -p out \
    && javac -d out src/*.java \
    && rm -f out/*.java

ENV PYTHON_CMD=python3
ENV ESTATE_DATA_DIR=/var/data
ENV PORT=10000

EXPOSE 10000

WORKDIR /app
CMD ["java", "-cp", "out", "Main"]
