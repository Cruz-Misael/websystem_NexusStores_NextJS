"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { useStockAlerts, StockAlert } from "@/src/hooks/useStockAlerts";

interface SidebarContextType {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
  // Alertas de estoque — única instância do hook em toda a app
  alerts: StockAlert[];
  criticalCount: number;
  lowCount: number;
  totalCount: number;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  mobileOpen: false,
  toggleCollapsed: () => {},
  toggleMobile: () => {},
  closeMobile: () => {},
  alerts: [],
  criticalCount: 0,
  lowCount: 0,
  totalCount: 0,
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { alerts, criticalCount, lowCount, totalCount } = useStockAlerts();

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        mobileOpen,
        toggleCollapsed: () => setCollapsed((v) => !v),
        toggleMobile: () => setMobileOpen((v) => !v),
        closeMobile: () => setMobileOpen(false),
        alerts,
        criticalCount,
        lowCount,
        totalCount,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
