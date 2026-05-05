"use client";

import { useActionState } from "react";
import { manualCreditAction, manualDebitAction, setUserStatusAction, type AdminActionResult } from "../actions";

function ResultBanner({ result }: { result: AdminActionResult | null }) {
  if (!result) return null;
  return (
    <div className={`rounded px-3 py-2 text-sm ${result.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      {result.ok ? result.message : `Error: ${result.error}`}
    </div>
  );
}

export function ManualCreditForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState<AdminActionResult | null, FormData>(
    manualCreditAction,
    null,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex gap-2">
        <input
          name="amount"
          type="number"
          min="1"
          placeholder="Amount"
          required
          className="w-28 rounded border px-2 py-1 text-sm"
        />
        <input
          name="reason"
          type="text"
          placeholder="Reason (required)"
          required
          className="flex-1 rounded border px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-green-700 px-3 py-1 text-sm text-white hover:bg-green-800 disabled:opacity-50"
        >
          {pending ? "…" : "Credit"}
        </button>
      </div>
      <ResultBanner result={state} />
    </form>
  );
}

export function ManualDebitForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState<AdminActionResult | null, FormData>(
    manualDebitAction,
    null,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex gap-2">
        <input
          name="amount"
          type="number"
          min="1"
          placeholder="Amount"
          required
          className="w-28 rounded border px-2 py-1 text-sm"
        />
        <input
          name="reason"
          type="text"
          placeholder="Reason (required)"
          required
          className="flex-1 rounded border px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-red-700 px-3 py-1 text-sm text-white hover:bg-red-800 disabled:opacity-50"
        >
          {pending ? "…" : "Debit"}
        </button>
      </div>
      <ResultBanner result={state} />
    </form>
  );
}

export function UserStatusForm({
  userId,
  currentStatus,
}: {
  userId: number;
  currentStatus: string;
}) {
  const [state, action, pending] = useActionState<AdminActionResult | null, FormData>(
    setUserStatusAction,
    null,
  );

  const targets =
    currentStatus === "active"
      ? [
          { value: "blocked", label: "Block", cls: "bg-red-700 hover:bg-red-800" },
          { value: "under_review", label: "Mark review", cls: "bg-orange-600 hover:bg-orange-700" },
        ]
      : currentStatus === "blocked"
      ? [{ value: "active", label: "Unblock", cls: "bg-green-700 hover:bg-green-800" }]
      : [
          { value: "active", label: "Restore active", cls: "bg-green-700 hover:bg-green-800" },
          { value: "blocked", label: "Block", cls: "bg-red-700 hover:bg-red-800" },
        ];

  return (
    <div className="space-y-2">
      {targets.map((t) => (
        <form key={t.value} action={action} className="flex gap-2">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="status" value={t.value} />
          <input
            name="reason"
            type="text"
            placeholder={`Reason for ${t.label.toLowerCase()} (required)`}
            required
            className="flex-1 rounded border px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className={`rounded px-3 py-1 text-sm text-white disabled:opacity-50 ${t.cls}`}
          >
            {pending ? "…" : t.label}
          </button>
        </form>
      ))}
      <ResultBanner result={state} />
    </div>
  );
}
