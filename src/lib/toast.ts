export type ToastType = "success" | "error" | "info";
export interface ToastItem { id: number; message: string; type: ToastType; }

type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();
let counter = 0;

/** Fire a toast from any client component: toast("Saved", "success"). */
export function toast(message: string, type: ToastType = "info") {
  const item: ToastItem = { id: ++counter, message, type };
  listeners.forEach((l) => l(item));
}

export function subscribeToasts(l: Listener) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
