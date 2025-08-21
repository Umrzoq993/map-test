// src/api/sheepfold.js
import { listByType, createWithType, putOne, removeOne } from "./facilityBase";

const TYPE = "FIELD"; // ⚠️ Enumda SHEEPFOLD yo'q. Kerak bo'lsa backendga qo'shing.
// Vaqtinchalik FIELD sifatida ishlatyapmiz.

export const list = (params) => listByType(TYPE, params);
export const create = (payload) => createWithType(TYPE, payload);
export const update = (id, payload) => putOne(id, payload);
export const remove = (id) => removeOne(id);
