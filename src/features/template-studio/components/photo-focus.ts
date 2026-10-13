import { createContext } from "react";

export type PhotoFocus = { nodeId: string; index: number } | null;
export const PhotoFocusContext = createContext<{
  focus: PhotoFocus;
  select: (nodeId: string, index: number) => void;
}>({ focus: null, select: () => {} });
