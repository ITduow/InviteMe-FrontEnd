"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type WorkspaceWedding = {
  id: string;
  name: string;
  status: string;
  href?: string;
};

type WorkspaceContextValue = {
  wedding: WorkspaceWedding | null;
  setWedding: (
    value:
      WorkspaceWedding | null | ((current: WorkspaceWedding | null) => WorkspaceWedding | null),
  ) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceContextProvider({ children }: { children: ReactNode }) {
  const [wedding, setWeddingState] = useState<WorkspaceWedding | null>(null);
  const setWedding = useCallback<WorkspaceContextValue["setWedding"]>((value) => {
    setWeddingState((current) => (typeof value === "function" ? value(current) : value));
  }, []);

  return (
    <WorkspaceContext.Provider value={{ wedding, setWedding }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspaceContext must be used inside DashboardShell.");
  return context;
}
