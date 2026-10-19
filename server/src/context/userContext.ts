import { AsyncLocalStorage } from "async_hooks";

export interface CurrentUserContext {
  id: string;
  fullName: string;
  role: string;
  roleTitle?: string;
  displayName: string;
}

export const userStorage = new AsyncLocalStorage<CurrentUserContext>();

export function getCurrentUser(): CurrentUserContext | undefined {
  return userStorage.getStore();
}
