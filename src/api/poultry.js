// src/api/poultry.js
import { listByType, createWithType, putOne, removeOne } from "./facilityBase";

const TYPE = "POULTRY";

/**
 * attributes:
 *  - areaM2           (number)  Umumiy yer maydoni (m2)
 *  - capacity         (number)  Umumiy sig'imi (son)
 *  - available        (number)  Hozirda mavjud (son)
 *  - productAmount    (number)  Olinadigan mahsulot (kg yoki dona)
 *  - revenueAmount    (number)  Olinadigan daromad
 *  - netProfit        (number)  Olingan sof foyda
 */

export const list = (params) => listByType(TYPE, params);
export const create = (payload) => createWithType(TYPE, payload);
export const update = (id, payload) => putOne(id, payload);
export const remove = (id) => removeOne(id);
