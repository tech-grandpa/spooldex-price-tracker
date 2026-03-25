FROM mcr.microsoft.com/playwright:v1.58.2-noble AS deps
WORKDIR /app

ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.58.2-noble AS runner
WORKDIR /app

ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY --from=deps /app ./

EXPOSE 3000

CMD ["npm", "run", "start"]
