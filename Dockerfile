# The app is one process: a Go/PocketBase binary that also serves the built
# frontend out of pb_public (see publicDir() in main.go — pb_public must sit
# next to the binary). Building it needs both Node and Go, which is why this
# is a Docker service rather than one of Render's single-language runtimes.

# --- build the frontend (vite outDir is pb_public) ---
FROM node:22-alpine AS web
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- build the server ---
FROM golang:1.27-alpine AS server
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/app .

# --- runtime ---
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=server /out/app ./app
COPY --from=web /src/pb_public ./pb_public

# pb_data holds the database and uploaded call recordings. Mount a Render
# persistent disk here, or every deploy wipes accounts, content and uploads.
VOLUME ["/app/pb_data"]

# Render provides $PORT; PocketBase must listen on 0.0.0.0, not localhost.
CMD ["sh", "-c", "./app serve --http=0.0.0.0:${PORT:-10000}"]
