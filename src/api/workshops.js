// src/api/workshops.js
import { listByType, createWithType, putOne, removeOne } from "./facilityBase";

const TYPE = "WAREHOUSE"; // ⚠️ Enumda WORKSHOP yo'q; omborga yaqin sifatida vaqtinchalik.

export const list = (params) => listByType(TYPE, params);
export const create = (payload) => createWithType(TYPE, payload);
export const update = (id, payload) => putOne(id, payload);
export const remove = (id) => removeOne(id);
