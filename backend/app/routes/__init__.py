"""
backend/app/routes package
==========================
REST and WebSocket API route definitions for CarbonMesh v2.
"""

from .ingest import router as ingest_router
from .emissions import router as emissions_router
from .samputa import router as samputa_router
from .yagna import router as yagna_router

__all__ = [
    "ingest_router",
    "emissions_router",
    "samputa_router",
    "yagna_router",
]
