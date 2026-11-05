from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from hub.database import init_db
from hub.engine.emission_engine import load_factors_from_yaml
from hub.api.websocket import ws_manager
from hub.api.routes_ingest import router as ingest_router
from hub.api.routes_emissions import router as emissions_router
from hub.api.routes_runs import router as runs_router
from hub.api.routes_ledger import router as ledger_router
from hub.api.routes_advisor import router as advisor_router
from hub.api.routes_scheduler import router as scheduler_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database with WAL mode and load authoritative emission factors
    conn = init_db()
    load_factors_from_yaml(conn)
    conn.close()
    yield

app = FastAPI(
    title="CarbonMesh Hub API",
    description="Offline-first carbon tracking, cryptographic HMAC ledger, and emission reduction engine",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for dashboard local development & edge deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all domain routers
app.include_router(ingest_router)
app.include_router(emissions_router)
app.include_router(runs_router)
app.include_router(ledger_router)
app.include_router(advisor_router)
app.include_router(scheduler_router)

@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive receiving ping or messages from dashboard
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

@app.get("/health")
@app.get("/")
async def health_check():
    return {
        "status": "healthy",
        "service": "CarbonMesh Hub Core Processing Engine",
        "version": "1.0.0",
        "mode": "offline-first edge hub"
    }

if __name__ == "__main__":
    import uvicorn
    from hub.config import settings
    uvicorn.run("hub.main:app", host=settings.HOST, port=settings.PORT, reload=True)
