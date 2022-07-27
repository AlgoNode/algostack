import algosdk from 'algosdk';
import { omit, omitBy, isNil } from 'lodash';

//
// Encode object using algosdk
// ----------------------------------------------
export function encodeObj(obj: {[k:string]: any}) {
  obj = {...obj};
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'boolean') obj[key] = value.toString();
  });
  obj = omitBy(obj, (v) => (
    isNil(v) || v === ''
  ));
  console.log(obj)
  return algosdk.encodeObj(obj);
}