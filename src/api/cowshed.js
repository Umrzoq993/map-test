// src/api/cowshed.js
import { listByType, createWithType, putOne, removeOne } from "./facilityBase";

const TYPE = "COWSHED";

/**
 * attributes:
 *  - areaM2, capacity, available, productKg, revenueAmount, netProfit
 */

export const list = (params) => listByType(TYPE, params);
export const create = (payload) => createWithType(TYPE, payload);
export const update = (id, payload) => putOne(id, payload);
export const remove = (id) => removeOne(id);
