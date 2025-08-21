// src/api/auxLands.js
import { listByType, createWithType, putOne, removeOne } from "./facilityBase";

const TYPE = "ORCHARD"; // ⚠️ Enumga AUX_LAND qo'shsak zo'r bo'ladi; hozircha ORCHARD.

export const list = (params) => listByType(TYPE, params);
export const create = (payload) => createWithType(TYPE, payload);
export const update = (id, payload) => putOne(id, payload);
export const remove = (id) => removeOne(id);
