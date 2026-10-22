import type { Page, WebSocketRoute } from '@playwright/test';

// A minimal Socket.IO v4 server for the `/realtime` namespace, speaking Engine.IO v4 frames over the
// routed WebSocket: "0" open, "40/realtime," connect, "42/realtime,[name, payload]" event.
const NAMESPACE = '/realtime';

export interface FakeRealtime {
  /** Sends a server event to every connected tab of this page. */
  emit: (name: string, payload: unknown) => void;
  /** Resolves once the app has joined the namespace. */
  connected: Promise<void>;
}

export async function mockRealtime(page: Page): Promise<FakeRealtime> {
  const sockets: WebSocketRoute[] = [];
  let markConnected: () => void = () => undefined;
  const connected = new Promise<void>((resolve) => {
    markConnected = resolve;
  });

  await page.routeWebSocket(/\/socket\.io\//, (ws) => {
    const open = { sid: 'e2e', upgrades: [], pingInterval: 25_000, pingTimeout: 20_000, maxPayload: 1_000_000 };
    ws.send(`0${JSON.stringify(open)}`);
    ws.onMessage((message) => {
      const text = typeof message === 'string' ? message : message.toString();
      if (text.startsWith(`40${NAMESPACE}`)) {
        ws.send(`40${NAMESPACE},${JSON.stringify({ sid: `ns-${sockets.length}` })}`);
        sockets.push(ws);
        markConnected();
      } else if (text === '2') {
        ws.send('3');
      }
    });
  });

  return {
    connected,
    emit: (name, payload) => {
      for (const ws of sockets) ws.send(`42${NAMESPACE},${JSON.stringify([name, payload])}`);
    },
  };
}
