"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv, leadsToTsv } from "@/lib/csv";
import type { Lead } from "@/lib/types";

interface ExportButtonsProps {
  leads: Lead[];
}

export function ExportButtons({ leads }: ExportButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function copyForSheets() {
    const tsv = leadsToTsv(leads);
    await navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => downloadCsv(leads)}
        disabled={leads.length === 0}
      >
        <Download className="h-4 w-4" />
        Exportar CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={copyForSheets}
        disabled={leads.length === 0}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-emerald-600" />
            Copiado
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-4 w-4" />
            Copiar para Google Sheets
          </>
        )}
      </Button>
    </div>
  );
}
