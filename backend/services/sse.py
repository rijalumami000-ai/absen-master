import asyncio
import json
from typing import AsyncGenerator


class SSEManager:
    """Manages Server-Sent Events connections for real-time scan notifications."""

    def __init__(self):
        self._queues: list[asyncio.Queue] = []

    async def subscribe(self) -> AsyncGenerator[str, None]:
        """Subscribe to SSE events. Yields formatted SSE strings."""
        queue: asyncio.Queue = asyncio.Queue()
        self._queues.append(queue)
        try:
            while True:
                data = await queue.get()
                yield json.dumps(data)
        except asyncio.CancelledError:
            pass
        finally:
            self._queues.remove(queue)

    async def broadcast(self, event_type: str, payload: dict):
        """Broadcast an event to all connected SSE clients."""
        message = {"type": event_type, **payload}
        for queue in self._queues:
            await queue.put(message)


# Singleton instance
sse_manager = SSEManager()
