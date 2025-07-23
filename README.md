# MindGuide Deno API

## Overview

MindGuide Deno API provides backend logic for a psychology web app, enabling prompt and instruction passing to the Gemini API for psychological feedback. It integrates with a Python-based anonymizer API to ensure privacy before sending user text to the LLM. Database and authentication are handled externally.

- **Self-hosted:** Designed to run in Docker containers.
- **Microservices:** Each route can be deployed as an edge function (provided that the required minimal changes are made).
- **File-based routing:** Dynamic routes use `[parameterName].ts` naming.
- **No framework:** Built with Deno APIs for learning and portability.

## Features

- Connects to Gemini API for feedback.
- Anonymizes user input via a Python API.
- File-based routing system.
- Easily deployable as microservices or edge functions.

## Setup

### Prerequisites

- [Deno](https://deno.com/)
- Docker

### Environment Variables

Create a `.env` file with:

```properties
API_KEY=your-gemini-api-key
ANONYMIZER_SERVER=http://your-anonymizer-api/anonymize
```

### Docker

To run both APIs together, create a Docker network and add both containers, or use `docker-compose`.

### Install & Run

**Development:**
```sh
deno run dev
```

**Production:**
```sh
deno run prod
```

## Routing

- Routes are defined in the `routes/` directory.
- Dynamic parameters use `[param].ts` (e.g., `ai_chat/[model].ts`).
- See [router.ts](router.ts) for routing logic.

## Author

Sergio Ruiz Sánchez

## License

No license specified. Do not use for commercial purposes or claim credit.
