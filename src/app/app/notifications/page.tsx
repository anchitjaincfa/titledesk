"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store-context";
import { Empty, PageHeader, btnGhost, fmtDateTime } from "@/components/app/kit";

export default function NotificationsPage() {
  const { store, markRead } = useStore();
  const [tab, setTab] = useState<"in_app" | "email">("in_app");
  const list = store.notifications.filter((n) => n.channel === tab).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <PageHeader title="Notifications" sub="In-app alerts and the outbound email outbox (simulated, nothing is sent)." />
      <div role="tablist" aria-label="Channel" className="mb-3 flex gap-1">
        {(["in_app", "email"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-indigo-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-300"}`}>
            {t === "in_app" ? "In-app" : "Email outbox"} ({store.notifications.filter((n) => n.channel === t).length})
          </button>
        ))}
      </div>
      {list.length === 0 ? <Empty>Nothing here yet.</Empty> : (
        <ul className="space-y-2">
          {list.map((n) => (
            <li key={n.id} className={`rounded-lg border bg-white p-3 text-sm shadow-sm ${n.read ? "border-slate-200" : "border-indigo-300"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{!n.read && <span className="mr-1.5 inline-block size-2 rounded-full bg-indigo-600" aria-label="unread" />}{n.subject}</div>
                  <div className="text-xs text-slate-500">{fmtDateTime(n.at)}{n.dealId && <> · <Link className="text-indigo-700 underline" href={`/app/deals/${n.dealId}`}>Open deal</Link></>}</div>
                </div>
                {!n.read && <button className={`${btnGhost} !py-1 text-xs`} onClick={() => markRead(n.id)}>Mark read</button>}
              </div>
              <p className="mt-1 whitespace-pre-line text-slate-700">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
