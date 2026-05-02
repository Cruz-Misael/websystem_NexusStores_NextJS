"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/src/lib/supabase/client";

export interface StockAlert {
  sku: number;
  name: string;
  stock_quantity: number;
  minimum_stock: number;
  level: "critical" | "low";
}

interface StockAlertResult {
  alerts: StockAlert[];
  criticalCount: number;
  lowCount: number;
  totalCount: number;
}

export function useStockAlerts(): StockAlertResult {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);

  const fetchAlerts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("sku, name, stock_quantity, minimum_stock")
      .eq("is_active", true)
      .gt("minimum_stock", 0);

    if (error || !data) return;

    const low = data
      .filter((p) => p.stock_quantity <= p.minimum_stock)
      .map((p) => ({
        sku: p.sku,
        name: p.name,
        stock_quantity: p.stock_quantity,
        minimum_stock: p.minimum_stock,
        level: (p.stock_quantity === 0 ? "critical" : "low") as "critical" | "low",
      }))
      .sort((a, b) => a.stock_quantity - b.stock_quantity);

    setAlerts(low);
  }, []);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel("stock-alerts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        () => { fetchAlerts(); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "products" },
        () => { fetchAlerts(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAlerts]);

  const criticalCount = alerts.filter((a) => a.level === "critical").length;
  const lowCount = alerts.filter((a) => a.level === "low").length;

  return { alerts, criticalCount, lowCount, totalCount: alerts.length };
}
