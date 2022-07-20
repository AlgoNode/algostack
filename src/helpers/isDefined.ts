

//
// Check if "window" is currently defined
// ----------------------------------------------
export function windowIsDefined(message?:string) {
  if (typeof window === 'undefined') {
    console.error(message || 'This feature requires "window" (aka, only available from a browser)');
    return false;
  }
  return true;
};
