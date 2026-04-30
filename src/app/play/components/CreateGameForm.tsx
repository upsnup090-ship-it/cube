"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import type { CreateGameState } from "../actions";
import { createGameAction } from "../actions";

export type DemoUserOption = {
  id: number;
  label: string;
};

const initialState: CreateGameState = { result: null };

function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `play_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function CreateGameForm({ demoUsers }: { demoUsers: DemoUserOption[] }) {
  const [state, formAction, pending] = useActionState(createGameAction, initialState);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => `play:create:${newRequestId()}`);

  useEffect(() => {
    if (state.result?.ok) {
      setIdempotencyKey(`play:create:${newRequestId()}`);
    }
  }, [state.result]);

  const defaultCreatorId = useMemo(() => demoUsers[0]?.id ?? 0, [demoUsers]);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4 rounded border bg-white p-4 shadow-sm">
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        <div className="space-y-1">
          <label className="block text-sm font-medium">Creator demo user</label>
          <select
            name="creatorUserId"
            defaultValue={defaultCreatorId}
            className="w-full rounded border px-3 py-2"
            required
          >
            {demoUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label} (id={u.id})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-1">
            <label className="block text-sm font-medium">Bet amount</label>
            <input
              name="betAmount"
              type="number"
              min={1}
              step={1}
              defaultValue={50}
              className="w-full rounded border px-3 py-2"
              required
            />
            <p className="text-xs text-gray-500">Integer minor units (COIN)</p>
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label className="block text-sm font-medium">Dice count</label>
            <select name="diceCount" defaultValue={1} className="w-full rounded border px-3 py-2" required>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label className="block text-sm font-medium">Submit</label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? "Creating..." : "Create game"}
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Calls <code className="rounded bg-gray-100 px-1">GameService.createGame</code> and locks escrow via
          <code className="rounded bg-gray-100 px-1">WalletService.lockEscrow</code>.
        </div>
      </form>

      {state.result ? (
        <div className={`rounded border p-4 text-sm ${state.result.ok ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
          {state.result.ok ? (
            <div className="space-y-2">
              <div className="font-semibold">Game created</div>
              <div>
                publicCode: <span className="font-mono">{state.result.data.publicCode}</span>
              </div>
              <div className="flex gap-3">
                <Link className="text-blue-700 hover:underline" href={`/play/games/${state.result.data.gameId}`}>
                  Open game page
                </Link>
                <Link className="text-blue-700 hover:underline" href="/play/join">
                  Join game
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="font-semibold">Error</div>
              <div className="mt-1 font-mono text-xs">{state.result.error}</div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
