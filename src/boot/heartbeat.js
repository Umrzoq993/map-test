// src/boot/heartbeat.js
import { heartbeat, isAuthenticated } from "../api/auth";

let started = false;
let timer = null;

export function startHeartbeat(intervalMs = 40000) {
  if (started) return;
  started = true;

  const tick = () => {
    if (!isAuthenticated()) return;
    heartbeat().catch(() => {});
  };

  // darhol bir marta
  setTimeout(tick, 2000);
  // keyin interval
  timer = setInterval(tick, intervalMs);
  return () => {
    if (timer) clearInterval(timer);
    timer = null;
    started = false;
  };
}
