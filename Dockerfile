# Use the official Deno image (latest at the moment of creation)
FROM denoland/deno:alpine-2.3.6

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Install dependencies
RUN deno install

# Expose the port Deno will use
EXPOSE 4000

# Command to run the Deno app
# CMD ["run", "--allow-net", "main.ts"]
CMD ["deno", "run", "prod"]
