import type { InventoryItem, StockMovement } from "./types";

/** Preview data for the Inventory module. See `./types`. */

export const INVENTORY_ITEMS: InventoryItem[] = [
  { id: "itm-1", sku: "SKU-1042", name: "Zycount POS Terminal — Model T3", category: "Hardware", unit: "unit", costMethod: "WEIGHTED_AVERAGE", unitCost: "980.00", sellingPrice: "1850.00", onHand: 148, reserved: 36, available: 112, incoming: 60, reorderLevel: 80, reorderQuantity: 120, location: "Shah Alam DC", value: "145040.00", lastMovement: "2026-09-22", status: "IN_STOCK" },
  { id: "itm-2", sku: "SKU-2210", name: "Thermal receipt printer", category: "Hardware", unit: "unit", costMethod: "WEIGHTED_AVERAGE", unitCost: "185.00", sellingPrice: "420.00", onHand: 62, reserved: 44, available: 18, incoming: 80, reorderLevel: 50, reorderQuantity: 100, location: "Shah Alam DC", value: "11470.00", lastMovement: "2026-09-23", status: "LOW" },
  { id: "itm-3", sku: "SKU-5001", name: "Barcode scanner — wireless", category: "Peripherals", unit: "unit", costMethod: "FIFO", unitCost: "142.00", sellingPrice: "310.00", onHand: 210, reserved: 20, available: 190, incoming: 0, reorderLevel: 60, reorderQuantity: 100, location: "Shah Alam DC", value: "29820.00", lastMovement: "2026-09-18", status: "OVERSTOCKED" },
  { id: "itm-4", sku: "SKU-4110", name: "Fleet tracking device — LTE", category: "IoT", unit: "unit", costMethod: "FIFO", unitCost: "268.00", sellingPrice: "560.00", onHand: 0, reserved: 0, available: 0, incoming: 150, reorderLevel: 40, reorderQuantity: 150, location: "Prai Warehouse", value: "0.00", lastMovement: "2026-09-12", status: "OUT" },
  { id: "itm-5", sku: "SKU-6300", name: "Cash drawer — 5 bill / 8 coin", category: "Hardware", unit: "unit", costMethod: "WEIGHTED_AVERAGE", unitCost: "96.00", sellingPrice: "225.00", onHand: 94, reserved: 12, available: 82, incoming: 0, reorderLevel: 40, reorderQuantity: 80, location: "Shah Alam DC", value: "9024.00", lastMovement: "2026-09-20", status: "IN_STOCK" },
  { id: "itm-6", sku: "SKU-6410", name: "Thermal paper roll 80×80 (box of 50)", category: "Consumables", unit: "box", costMethod: "FIFO", unitCost: "58.00", sellingPrice: "128.00", onHand: 38, reserved: 30, available: 8, incoming: 40, reorderLevel: 35, reorderQuantity: 60, location: "Shah Alam DC", value: "2204.00", lastMovement: "2026-09-24", status: "LOW" },
  { id: "itm-7", sku: "SKU-7220", name: "Customer display — 10 inch", category: "Peripherals", unit: "unit", costMethod: "WEIGHTED_AVERAGE", unitCost: "310.00", sellingPrice: "640.00", onHand: 55, reserved: 6, available: 49, incoming: 0, reorderLevel: 25, reorderQuantity: 50, location: "Prai Warehouse", value: "17050.00", lastMovement: "2026-09-15", status: "IN_STOCK" },
  { id: "itm-8", sku: "SKU-8100", name: "Mounting bracket — universal", category: "Accessories", unit: "unit", costMethod: "FIFO", unitCost: "24.00", sellingPrice: "65.00", onHand: 412, reserved: 48, available: 364, incoming: 0, reorderLevel: 100, reorderQuantity: 200, location: "Shah Alam DC", value: "9888.00", lastMovement: "2026-09-21", status: "OVERSTOCKED" },
  { id: "itm-9", sku: "SKU-9050", name: "Extended warranty — 24 months", category: "Services", unit: "contract", costMethod: "FIFO", unitCost: "0.00", sellingPrice: "290.00", onHand: 0, reserved: 0, available: 0, incoming: 0, reorderLevel: 0, reorderQuantity: 0, location: "—", value: "0.00", lastMovement: "2026-09-19", status: "IN_STOCK" },
];

export const STOCK_MOVEMENTS: StockMovement[] = [
  { id: "mv-1", date: "2026-09-24", sku: "SKU-6410", itemName: "Thermal paper roll 80×80 (box of 50)", type: "SALE", reference: "INV-2026-0150", quantity: -12, unitCost: "58.00", value: "-696.00", balanceAfter: 38, location: "Shah Alam DC" },
  { id: "mv-2", date: "2026-09-23", sku: "SKU-2210", itemName: "Thermal receipt printer", type: "PURCHASE", reference: "BIL-2026-0312", quantity: 80, unitCost: "185.00", value: "14800.00", balanceAfter: 62, location: "Shah Alam DC" },
  { id: "mv-3", date: "2026-09-22", sku: "SKU-1042", itemName: "Zycount POS Terminal — Model T3", type: "SALE", reference: "INV-2026-0148", quantity: -24, unitCost: "980.00", value: "-23520.00", balanceAfter: 148, location: "Shah Alam DC" },
  { id: "mv-4", date: "2026-09-21", sku: "SKU-8100", itemName: "Mounting bracket — universal", type: "ADJUSTMENT", reference: "ADJ-2026-0044", quantity: -6, unitCost: "24.00", value: "-144.00", balanceAfter: 412, location: "Shah Alam DC" },
  { id: "mv-5", date: "2026-09-20", sku: "SKU-6300", itemName: "Cash drawer — 5 bill / 8 coin", type: "TRANSFER", reference: "TRF-2026-0018", quantity: 20, unitCost: "96.00", value: "1920.00", balanceAfter: 94, location: "Shah Alam DC" },
  { id: "mv-6", date: "2026-09-19", sku: "SKU-5001", itemName: "Barcode scanner — wireless", type: "RETURN", reference: "CN-2026-0031", quantity: 4, unitCost: "142.00", value: "568.00", balanceAfter: 210, location: "Shah Alam DC" },
  { id: "mv-7", date: "2026-09-18", sku: "SKU-5001", itemName: "Barcode scanner — wireless", type: "SALE", reference: "INV-2026-0143", quantity: -8, unitCost: "142.00", value: "-1136.00", balanceAfter: 206, location: "Shah Alam DC" },
  { id: "mv-8", date: "2026-09-15", sku: "SKU-7220", itemName: "Customer display — 10 inch", type: "PURCHASE", reference: "BIL-2026-0308", quantity: 30, unitCost: "310.00", value: "9300.00", balanceAfter: 55, location: "Prai Warehouse" },
  { id: "mv-9", date: "2026-09-12", sku: "SKU-4110", itemName: "Fleet tracking device — LTE", type: "SALE", reference: "INV-2026-0146", quantity: -60, unitCost: "268.00", value: "-16080.00", balanceAfter: 0, location: "Prai Warehouse" },
];

export const INVENTORY_VALUATION = [
  { category: "Hardware", items: 3, quantity: 304, value: "165534.00" },
  { category: "Peripherals", items: 2, quantity: 265, value: "46870.00" },
  { category: "IoT", items: 1, quantity: 0, value: "0.00" },
  { category: "Consumables", items: 1, quantity: 38, value: "2204.00" },
  { category: "Accessories", items: 1, quantity: 412, value: "9888.00" },
];
