"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * A boolean backed by `localStorage`, read with `useSyncExternalStore` so there
 * is no hydration mismatch (server snapshot is the provided default) and no
 * `setState`-in-effect. Updates are same-tab only, which is all we need for UI
 * preferences like a collapsed sidebar.
 */
export function usePersistentBoolean(
  key: string,
  defaultValue: boolean
): [boolean, (next: boolean) => void, () => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      function handler(event: StorageEvent) {
        if (event.key === key) onChange()
      }
      window.addEventListener("storage", handler)
      return () => window.removeEventListener("storage", handler)
    },
    [key]
  )

  const getSnapshot = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw === null ? defaultValue : raw === "true"
    } catch {
      return defaultValue
    }
  }, [key, defaultValue])

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => defaultValue
  )

  const setValue = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, String(next))
        window.dispatchEvent(new StorageEvent("storage", { key }))
      } catch {
        // Ignore storage access errors (private mode, blocked cookies).
      }
    },
    [key]
  )

  const toggle = useCallback(() => setValue(!getSnapshot()), [getSnapshot, setValue])

  return [value, setValue, toggle]
}
