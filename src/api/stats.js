import { httpGet } from "./http";

export function getOverview(params) {
  // params: { year?: number, types?: "COWSHED,POULTRY" }
  return httpGet("/stats/overview", params);
}
