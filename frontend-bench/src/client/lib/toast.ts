import { toast as sonner } from "sonner";

/** One toast style for the whole app: a title plus an optional factual description. */
export function toast(title: string, description?: string, error = false): void {
  (error ? sonner.error : sonner)(title, description ? { description } : undefined);
}
