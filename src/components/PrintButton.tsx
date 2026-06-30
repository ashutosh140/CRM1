"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary mb-6 print:hidden"
    >
      <Printer size={16} /> Print / Save as PDF
    </button>
  );
}
