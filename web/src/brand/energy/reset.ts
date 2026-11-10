/** Build a reset from controls owned by the active view; other tabs retain their state. */
export function viewReset<T extends object>(
  current: T,
  defaults: T,
  keys: readonly (keyof T)[],
): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of keys) {
    if (current[key] !== defaults[key]) patch[key] = defaults[key];
  }
  return patch;
}
