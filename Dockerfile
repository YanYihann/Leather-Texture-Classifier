FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

# CPU-only PyTorch for server-side inference.
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHON_EXECUTABLE="/opt/venv/bin/python"
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch torchvision pillow

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start"]
