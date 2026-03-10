# Frontend

## Development server

Install dependencies and start the local development server:

```bash
npm ci
ng serve
```

Windows PowerShell:

```powershell
npm ci
npm start
```

Open `http://localhost:4200/` once the dev server is running.

## Runtime config

The app reads its API base URL from:

- `public/assets/config/config.json`
- `src/assets/config/config.json`

Example:

```json
{
  "apiBaseUrl": "http://127.0.0.1:8002/api/v1"
}
```

## Building

```bash
ng build
```

## Running unit tests

```bash
npm test -- --watch=false
```

## Recommended backend pairing

Run the API locally on port `8002` so the default config works:

```bash
cd ../backend
source .venv/bin/activate
.venv/bin/uvicorn app.main:app --reload --port 8002
```

Windows PowerShell:

```powershell
cd ..\backend
.venv\Scripts\Activate.ps1
.venv\Scripts\uvicorn app.main:app --reload --port 8002
```
