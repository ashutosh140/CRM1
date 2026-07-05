"use client";

import { FileSpreadsheet } from "lucide-react";

interface Row {
  number: string; customer: string; status: string;
  total: number; paid: number; due: number; dueDate: string;
}

export function ExportInvoicesButton({ rows }: { rows: Row[] }) {
  function exportCsv() {
    const headers = ["Invoice Number", "Customer", "Status", "Total", "Paid", "Due", "Due Date"];
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(","),
      ...rows.map((r) => [r.number, r.customer, r.status, r.total, r.paid, r.due, r.dueDate].map(esc).join(",")),
    ];
    // BOM so Excel reads UTF-8 (₹ etc.) correctly
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `invoices-${stamp}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <button onClick={exportCsv} className="btn-ghost">
      <FileSpreadsheet size={16} /> Export to Excel
    </button>
  );
}
