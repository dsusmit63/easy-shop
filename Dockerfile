# BASE IMAGE - BUILD STAGE
FROM node:20-alpine AS builder

# METADATA
LABEL maintainer="Susmit Das"
LABEL description="Application container"

# SET WORKDIR
WORKDIR /app

# INSTALL BUILD DEPENDENCIES
RUN apk add --no-cache python3 make g++

# COPY PACKAGE FILES
COPY package*.json ./

# INSTALL DEPENDENCIES
RUN npm ci

# COPY PROJECT FILES
COPY . .

# BUILD NEXTJS APPLICATION
RUN npm run build

# BASE IMAGE - RUNTIME STAGE
FROM node:20-alpine AS runner

# CREATE NON-ROOT USER
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# SET WORKDIR
WORKDIR /app

# COPY NECESSARY FILES FROM BUILD STAGE
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# CHANGE OWNERSHIP
RUN chown -R appuser:appgroup /app

# SWITCH TO NON-ROOT USER
USER appuser

# ENVIRONMENT VARIABLES
ENV NODE_ENV=production

# EXPOSE PORT
EXPOSE 3000

# RUN & SERVE APPLICATION
CMD ["node","server.js"]
