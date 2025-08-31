// src/api/captcha.js
import { httpGet, httpPost } from "./http";

/**
 * GET /api/captcha/new -> { id, image, ttlSeconds }
 */
export async function getNewCaptcha() {
  return httpGet("/captcha/new");
}

/**
 * POST /api/captcha/verify { id, answer } -> { ok: boolean }
 */
export async function verifyCaptcha({ id, answer }) {
  return httpPost("/captcha/verify", { id, answer });
}
