# Vienkiemis Online - backend'o konteineris. Vienas etapas užtenka - tai grynas Node.js/Express
# serveris be jokio "build" žingsnio (klientas - vienas statinis public/index.html failas,
# React/Babel transpiliuojamas TIESIOGIAI naršyklėje, ne build metu).
FROM node:20-slim

WORKDIR /app

# Pirma nukopijuojame TIK priklausomybių aprašus, kad Docker galėtų talpinti (cache) `npm ci`
# sluoksnį atskirai nuo kodo - kodo pakeitimai neverčia iš naujo diegti visų paketų.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

# Pirma paleidžiama idempotentiška DB migracija (žr. db/migrate.js), tada pats serveris - žr.
# package.json "start" skriptą. Saugu paleisti kiekvieno deploy'aus/restart'o metu.
CMD ["npm", "start"]
