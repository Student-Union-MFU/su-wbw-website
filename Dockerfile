# web-next (Next.js 16, ต้อง node >=20.9) — build standalone แล้วรันด้วย node server.js
FROM node:20-alpine AS build
WORKDIR /app
# rewrites ถูก serialize ตอน build → ต้องตั้ง upstream เป็น build ARG (runtime env ไม่มีผลกับ rewrites)
ARG API_UPSTREAM=http://localhost:4000
ENV API_UPSTREAM=$API_UPSTREAM
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
# standalone = server.js + deps ที่จำเป็นเท่านั้น + static/public แยก copy
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3001
CMD ["node", "server.js"]
