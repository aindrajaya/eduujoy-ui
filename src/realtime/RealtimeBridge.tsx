import { useRealtimeEvents } from './useRealtimeEvents';

/** Renders nothing; owns the `/realtime` socket for signed-in screens. */
export default function RealtimeBridge() {
  useRealtimeEvents();
  return null;
}
