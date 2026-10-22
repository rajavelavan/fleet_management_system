import asyncio
import json
import logging

from fastapi import WebSocket

logger = logging.getLogger("tracking.ws")


class ConnectionManager:
    """Manages active WebSocket connections and their vehicle & alert topic subscriptions."""

    def __init__(self):
        # Maps vehicle_id (str) -> Set of WebSocket connections subscribed
        self.vehicle_subscriptions: dict[str, set[WebSocket]] = {}
        # Set of WebSockets subscribed to ALL vehicles ("*" wildcard / firehose)
        self.all_subscriptions: set[WebSocket] = set()
        # Maps user_id (str) -> Set of WebSocket connections subscribed to alerts
        self.user_alert_subscriptions: dict[str, set[WebSocket]] = {}
        # Set of WebSockets subscribed to broadcast alerts
        self.broadcast_alert_subscriptions: set[WebSocket] = set()
        # Set of all currently active connections
        self.active_connections: set[WebSocket] = set()
        # Per-websocket tracking of vehicle topics for clean unsubscriptions
        self.client_subscriptions: dict[WebSocket, set[str]] = {}
        # Per-websocket tracking of user alert subscriptions
        self.client_user_alerts: dict[WebSocket, set[str]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
            self.client_subscriptions[websocket] = set()
            self.client_user_alerts[websocket] = set()
            # By default, connect to broadcast alerts as well
            self.broadcast_alert_subscriptions.add(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
            self.all_subscriptions.discard(websocket)
            self.broadcast_alert_subscriptions.discard(websocket)

            subscribed_topics = self.client_subscriptions.pop(websocket, set())
            for topic in subscribed_topics:
                if topic in self.vehicle_subscriptions:
                    self.vehicle_subscriptions[topic].discard(websocket)
                    if not self.vehicle_subscriptions[topic]:
                        del self.vehicle_subscriptions[topic]

            user_alert_topics = self.client_user_alerts.pop(websocket, set())
            for u_id in user_alert_topics:
                if u_id in self.user_alert_subscriptions:
                    self.user_alert_subscriptions[u_id].discard(websocket)
                    if not self.user_alert_subscriptions[u_id]:
                        del self.user_alert_subscriptions[u_id]
        logger.info(f"WebSocket client disconnected. Total active: {len(self.active_connections)}")

    async def subscribe(self, websocket: WebSocket, vehicle_id: str):
        async with self._lock:
            if websocket not in self.active_connections:
                return
            if vehicle_id == "*":
                self.all_subscriptions.add(websocket)
                self.client_subscriptions[websocket].add("*")
            else:
                if vehicle_id not in self.vehicle_subscriptions:
                    self.vehicle_subscriptions[vehicle_id] = set()
                self.vehicle_subscriptions[vehicle_id].add(websocket)
                self.client_subscriptions[websocket].add(vehicle_id)
        logger.info(f"Client subscribed to vehicle: {vehicle_id}")

    async def unsubscribe(self, websocket: WebSocket, vehicle_id: str):
        async with self._lock:
            if vehicle_id == "*":
                self.all_subscriptions.discard(websocket)
                if websocket in self.client_subscriptions:
                    self.client_subscriptions[websocket].discard("*")
            else:
                if vehicle_id in self.vehicle_subscriptions:
                    self.vehicle_subscriptions[vehicle_id].discard(websocket)
                    if not self.vehicle_subscriptions[vehicle_id]:
                        del self.vehicle_subscriptions[vehicle_id]
                if websocket in self.client_subscriptions:
                    self.client_subscriptions[websocket].discard(vehicle_id)
        logger.info(f"Client unsubscribed from vehicle: {vehicle_id}")

    async def subscribe_user_alerts(self, websocket: WebSocket, user_id: str):
        async with self._lock:
            if websocket not in self.active_connections:
                return
            if user_id not in self.user_alert_subscriptions:
                self.user_alert_subscriptions[user_id] = set()
            self.user_alert_subscriptions[user_id].add(websocket)
            if websocket in self.client_user_alerts:
                self.client_user_alerts[websocket].add(user_id)
        logger.info(f"Client subscribed to user alerts: {user_id}")

    async def broadcast_to_vehicle(self, vehicle_id: str, data: dict):
        """Broadcast payload to all clients subscribed to vehicle_id or all ('*')."""
        payload = json.dumps(data)
        async with self._lock:
            target_sockets = set()
            if vehicle_id in self.vehicle_subscriptions:
                target_sockets.update(self.vehicle_subscriptions[vehicle_id])
            target_sockets.update(self.all_subscriptions)

        if not target_sockets:
            return

        dead_sockets = []
        for ws in target_sockets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead_sockets.append(ws)

        if dead_sockets:
            for ws in dead_sockets:
                await self.disconnect(ws)

    async def broadcast_alert(self, user_id: str | None, data: dict):
        """Broadcast alert payload to user-specific channel or all connected clients."""
        payload = json.dumps(data)
        async with self._lock:
            target_sockets = set(self.broadcast_alert_subscriptions)
            if user_id and user_id in self.user_alert_subscriptions:
                target_sockets.update(self.user_alert_subscriptions[user_id])
            # If user_id is None, it targets broadcast_alert_subscriptions (all)

        if not target_sockets:
            return

        dead_sockets = []
        for ws in target_sockets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead_sockets.append(ws)

        if dead_sockets:
            for ws in dead_sockets:
                await self.disconnect(ws)


ws_manager = ConnectionManager()
