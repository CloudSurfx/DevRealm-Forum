# ---------- Stap 1: de site bouwen met Node ----------
FROM node:22-alpine AS build
WORKDIR /app

# Eerst alleen package-bestanden kopiëren: dan cachet Docker de npm install.
COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

# Vite bakt deze waarden tijdens het bouwen in de JavaScript.
# Geef ze mee via docker compose (leest .env) of: docker build --build-arg ...
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_DONATE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_DONATE_URL=$VITE_DONATE_URL

RUN npm run build

# ---------- Stap 2: alleen de gebouwde bestanden serveren met nginx ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
