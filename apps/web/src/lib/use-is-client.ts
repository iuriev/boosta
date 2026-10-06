import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * False while rendering on the server and during hydration, true afterwards.
 * Lets a component tell "browser state not read yet" from "browser state is empty".
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
