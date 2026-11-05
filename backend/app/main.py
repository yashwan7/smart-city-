"""
backend/app/main.py
===================
CarbonMesh v2 FastAPI Hub Server.
Verifiable net-carbon accounting hub, append-only hash-chained ledger,
and real-time WebSocket live stream for Hack Fest 2026 S1.
"""

import asyncio
from contextlib import asynccontextmanager
import json
import time
from typing import List, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config
from .database import init_db
from .routes import emissions_router, ingest_router, samputa_router, yagna_router
from .routes.ingest import set_broadcaster
from .yagna import YagnaEngine


class WebSocketConnectionManager:
    """Manages active live WebSocket subscribers."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.active_connections.discard(websocket)

    async def broadcast(self, message: str) -> None:
        async with self._lock:
            dead_connections = set()
            for connection in self.active_connections:
                try:
                    await connection.send_text(message)
                except Exception:
                    dead_connections.add(connection)
            for dead in dead_connections:
                self.active_connections.discard(dead)


ws_manager = WebSocketConnectionManager()
yagna_engine = YagnaEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes SQLite schema, WAL mode, factors seed, and demo devices on startup."""
    init_db()
    # Inject WebSocket broadcaster into ingest route
    set_broadcaster(ws_manager.broadcast)
    yield


app = FastAPI(
    title="CarbonMesh v2 Hub API",
    version="2.0.0",
    description=(
        "Verifiable Net-Carbon Accounting Platform for Hack Fest 2026 S1, SalT Bengaluru, PS-01. "
        "Provides HMAC-authenticated ingest, append-only hash-chained reading ledger, "
        "Samputa carbon bank, and real-time Yagna net-carbon calculations."
    ),
    lifespan=lifespan,
)

# Enable CORS for local React / Vite dashboards and kiosks
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular routers under /api
app.include_router(ingest_router, prefix="/api")
app.include_router(emissions_router, prefix="/api")
app.include_router(samputa_router, prefix="/api")
app.include_router(yagna_router, prefix="/api")


@app.get("/health", tags=["System"])
def health_check():
    """Liveness probe and service verification."""
    return {
        "status": "healthy",
        "service": "carbonmesh-v2-hub",
        "version": "2.0.0",
        "timestamp": time.time(),
        "database": str(config.DATABASE_PATH.name),
        "docs_url": "/docs",
    }


@app.get("/", tags=["System"])
def root_info():
    """Root info pointing to OpenAPI docs and system summary."""
    return {
        "name": "CarbonMesh v2 Hub",
        "description": "Verifiable net-carbon platform with hash-chained ledger and Samputa carbon bank",
        "docs": "/docs",
        "health": "/health",
        "api_endpoints": [
            "/api/ingest",
            "/api/ledger/verify",
            "/api/ledger/tamper-demo",
            "/api/commute",
            "/api/fuel",
            "/api/summary",
            "/api/breakdown",
            "/api/timeseries",
            "/api/samputa/batch",
            "/api/samputa/seal",
            "/api/samputa/verify",
            "/api/traditional",
            "/api/net",
            "/api/recommendations",
            "/api/time",
            "/api/control/relay",
            "/ws/live",
        ],
    }


@app.websocket("/ws/live")
async def live_telemetry_stream(websocket: WebSocket):
    """
    WebSocket streaming real-time power, carbon rate, and Yagna net-carbon status.
    """
    await ws_manager.connect(websocket)
    try:
        # Send initial state snapshot on connect
        initial_net = yagna_engine.calculate_net_carbon()
        await websocket.send_text(
            json.dumps({
                "type": "INITIAL_SNAPSHOT",
                "net_carbon": initial_net.model_dump(),
                "timestamp": time.time(),
            })
        )

        while True:
            # Keep-alive ping/pong
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=15.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Periodic heartbeat with live net-carbon stats
                current_net = yagna_engine.calculate_net_carbon()
                await websocket.send_text(
                    json.dumps({
                        "type": "HEARTBEAT",
                        "net_carbon_kg_co2e": current_net.net_carbon_kg_co2e,
                        "bad_emissions_kg_co2e": current_net.bad_emissions_kg_co2e,
                        "good_sequestration_kg_co2e": current_net.good_sequestration_kg_co2e,
                        "yagna_ratio": current_net.yagna_ratio,
                        "is_net_negative": current_net.is_net_negative,
                        "timestamp": time.time(),
                    })
                )
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception:
        await ws_manager.disconnect(websocket)
