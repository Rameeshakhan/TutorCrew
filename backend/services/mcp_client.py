"""
services/mcp_client.py
MCP Client — unified interface for all three MCP servers.

Agents call this module instead of importing ChromaDB, Google
Calendar SDK, or Twilio directly. This is the bridge that makes
the MCP architecture real.

Architecture
------------
Agent code             MCP Client          MCP Server
-----------            ----------          ----------
gap_detector.py  ──►  call_tool()  ──►   chromadb_server.py
scheduler.py     ──►  call_tool()  ──►   calendar_server.py
integrations.py  ──►  call_tool()  ──►   whatsapp_server.py

Usage
-----
from services.mcp_client import mcp

# Call a ChromaDB tool
result = await mcp.chromadb("upsert_gap", subtopic="Mitosis", ...)

# Call a Calendar tool
result = await mcp.calendar("generate_study_plan", weak_areas=[...], ...)

# Call a WhatsApp tool
result = await mcp.whatsapp("send_reminder", phone="+92...", topic="Photosynthesis")

Sync wrappers (call_chromadb / call_calendar / call_whatsapp) are
provided for use from synchronous FastAPI route handlers.
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Any

from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters

# Path to the mcp_servers directory
_SERVERS_DIR = Path(__file__).parent.parent / "mcp_servers"
_PYTHON = sys.executable


# ── Low-level: launch a server process and call one tool ──────────────────────

async def _call_server_tool(server_script: str, tool_name: str, arguments: dict) -> dict:
    """
    Spawn an MCP server as a subprocess, call one tool, return the result dict.
    The subprocess is torn down after the call (stateless per-call model).
    """
    params = StdioServerParameters(
        command=_PYTHON,
        args=[str(_SERVERS_DIR / server_script)],
        env=None,  # inherits from parent process (so .env vars are available)
    )

    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # Log the MCP call for visibility
            print(f"[MCPClient] → {server_script}:{tool_name}  args={list(arguments.keys())}")

            result = await session.call_tool(tool_name, arguments=arguments)

            # MCP returns TextContent list; parse our JSON payload
            if result.content and hasattr(result.content[0], "text"):
                payload = json.loads(result.content[0].text)
                print(f"[MCPClient] ← {server_script}:{tool_name}  ok")
                return payload

            return {"error": "Empty response from MCP server"}


# ── Public async API ──────────────────────────────────────────────────────────

class MCPClient:
    """Async interface. Use `await mcp.chromadb(...)` etc."""

    async def chromadb(self, tool: str, **kwargs) -> dict:
        return await _call_server_tool("chromadb_server.py", tool, kwargs)

    async def calendar(self, tool: str, **kwargs) -> dict:
        return await _call_server_tool("calendar_server.py", tool, kwargs)

    async def whatsapp(self, tool: str, **kwargs) -> dict:
        return await _call_server_tool("whatsapp_server.py", tool, kwargs)


mcp = MCPClient()


# ── Sync wrappers (for use from synchronous code) ─────────────────────────────

def _run(coro) -> Any:
    """Run an async coroutine from synchronous code."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're inside an existing event loop (e.g. FastAPI with uvicorn)
            # Use a new thread-based approach
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result(timeout=120)
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def call_chromadb(tool: str, **kwargs) -> dict:
    """Synchronous wrapper — safe to call from FastAPI route handlers."""
    return _run(mcp.chromadb(tool, **kwargs))


def call_calendar(tool: str, **kwargs) -> dict:
    """Synchronous wrapper — safe to call from FastAPI route handlers."""
    return _run(mcp.calendar(tool, **kwargs))


def call_whatsapp(tool: str, **kwargs) -> dict:
    """Synchronous wrapper — safe to call from FastAPI route handlers."""
    return _run(mcp.whatsapp(tool, **kwargs))
