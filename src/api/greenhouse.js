// src/api/greenhouse.js
import { listByType, createWithType, putOne, removeOne } from "./facilityBase";

const TYPE = "GREENHOUSE";

/**
 * attributes:
 *  - areaHa                 (number)  Umumiy yer maydoni (gektar)
 *  - heatingType            (string)  Isitish tizimi turi
 *  - yieldAmount            (number)  Olinadigan hosildorlik miqdori
 *  - revenueAmount          (number)  Olinadigan daromad miqdori
 *  - netProfit              (number)  Olingan sof foyda
 */

export const list = (params) => listByType(TYPE, params);

export const create = (payload) => createWithType(TYPE, payload);

export const update = (id, payload) => putOne(id, payload);

export const remove = (id) => removeOne(id);
