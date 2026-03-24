FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

# CPU-only PyTorch for server-side inference.
RUN pip3 install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch torchvision pillow

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start"]
