"use client";
import { create } from "zustand";
type UiState = { sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void };
// UI state only. No tokens, users, guests, weddings, or other server data.
export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
