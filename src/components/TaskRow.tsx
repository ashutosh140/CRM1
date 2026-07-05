"use client";

import { useRouter } from "next/navigation";
import { Eye, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export interface TaskRowData {
  id: string; code: string | null; title: string;
  personLabel: string; priority: string; status: string;
  seen: boolean; msgCount: number; createdAt: string;
}

export function TaskRow({ task }: { task: TaskRowData }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(`/tasks/${task.id}`)}
      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/50"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {task.code && <span className="badge bg-slate-100 font-mono text-[10px] text-slate-500">{task.code}</span>}
          <span className="font-medium text-slate-800">{task.title}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-600">{task.personLabel}</td>
      <td className="px-4 py-3"><Badge value={task.priority} /></td>
      <td className="px-4 py-3"><Badge value={task.status} /></td>
      <td className="px-4 py-3">
        {task.seen
          ? <span className="flex items-center gap-1 text-xs text-blue-500"><Eye size={13} /> Seen</span>
          : <span className="text-xs text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3">
        {task.msgCount > 0
          ? <span className="flex items-center gap-1 text-xs text-slate-500"><MessageSquare size={12} /> {task.msgCount}</span>
          : <span className="text-xs text-slate-300">0</span>}
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(task.createdAt)}</td>
    </tr>
  );
}
