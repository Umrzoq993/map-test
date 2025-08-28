// src/utils/deviceId.js
import { v4 as uuidv4 } from "uuid";

const KEY = "deviceId";

export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // SSR yoki private rejimda
    return "unknown-device";
  }
}
