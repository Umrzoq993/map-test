// src/boot/heartbeat.js
import { heartbeat, isAuthenticated } from "../api/auth";

let started = false;
let timer = null;

export function startHeartbeat(intervalMs = 40000) {
  if (started) return;
  started = true;

  let pendingImmediate = false;

  const tick = () => {
    if (!isAuthenticated()) return;
    heartbeat().catch(() => {});
  };

  // Token o'zgarganda (login / refresh) tezkor heartbeat
  const onToken = (e) => {
    if (!isAuthenticated()) return; // token tozalangan bo'lishi mumkin
    if (pendingImmediate) return;
    pendingImmediate = true;
    // kichik debounce (100ms) – ketma-ket ikki marta setAccessToken bo'lsa ham 1 marta jo'natish
    setTimeout(() => {
      pendingImmediate = false;
      tick();
    }, 100);
  };
  window.addEventListener("auth:token-changed", onToken);

  // darhol bir marta
  setTimeout(tick, 2000);
  // keyin interval
  timer = setInterval(tick, intervalMs);
  return () => {
    if (timer) clearInterval(timer);
    timer = null;
    started = false;
    window.removeEventListener("auth:token-changed", onToken);
  };
}
