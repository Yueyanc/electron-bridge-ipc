export function isFunction(obj: unknown): obj is Function {
  return (typeof obj === 'function')
}
