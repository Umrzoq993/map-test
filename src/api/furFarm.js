// src/api/furFarm.js
import { listByType, createWithType, putOne, removeOne } from "./facilityBase";

// Agar backendda alohida TYPE bo'lmasa, mavjud eng yaqin turdan foydalanish kerak.
// Sizda enumda "STABLE" yo "WAREHOUSE" bor. Bu joyda "STABLE" o'rnini "FUR_FARM" kabi kengaytirishni tavsiya qilaman.
// Hozircha STABLE sifatida vaqtinchalik belgilaymiz:
const TYPE = "STABLE";

/**
 * attributes:
 *  - areaM2, capacity, available, productKg, revenueAmount, netProfit
 */

export const list = (params) => listByType(TYPE, params);
export const create = (payload) => createWithType(TYPE, payload);
export const update = (id, payload) => putOne(id, payload);
export const remove = (id) => removeOne(id);
