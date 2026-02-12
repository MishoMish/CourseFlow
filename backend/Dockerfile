FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cacheable layer)
COPY package.json ./
RUN npm install --production

# Copy source code
COPY src/ ./src/

# Create upload directories (volume will be mounted here)
RUN mkdir -p ./uploads/pdfs ./uploads/images ./uploads/files

EXPOSE 3001

CMD ["node", "src/index.js"]
