FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs services.mjs radio.mjs ./
COPY public ./public
RUN mkdir /app/data && chown -R node:node /app
USER node
ENV HOST=0.0.0.0 PORT=3000 DATA_DIR=/app/data
EXPOSE 3000
CMD ["node", "server.mjs"]
