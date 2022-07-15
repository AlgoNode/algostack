import { StringObj } from '../types'; 


export function stringifyObjectValues(params: object) {
  const obj: StringObj = {};
  Object.entries(params)
    .forEach(([key, value]) => {
      obj[key] = String(value);
    });
  return obj;
}