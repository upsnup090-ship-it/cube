"use client";

import { useActionState } from "react";
import type { GameOpState } from "../../../actions";
import { recordRollAction, resolveGameAction, settleGameAction } from "../../../actions";

const initialState: GameOpState = { result: null };

export type GameSandboxActionsProps = {
  gameId: number;
  diceCount: number;
  creatorUserId: number;
  opponentUserId: number | null;
};

function ResultBox({ state }: { state: GameOpState }) {
  if (!state.result) return null;
  return (
    <div
      className={`rounded border p-3 text-sm ${
        state.result.ok ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
      }`}
    >
      {state.result.ok ? state.result.data.message : state.result.error}
    </div>
  );
}

export function GameSandboxActions(props: GameSandboxActionsProps) {
  const [creatorRollState, creatorRollAction, creatorRollPending] = useActionState(
    recordRollAction,
    initialState,
  );
  const [opponentRollState, opponentRollAction, opponentRollPending] = useActionState(
    recordRollAction,
    initialState,
  );
  const [resolveState, resolveAction, resolvePending] = useActionState(resolveGameAction, initialState);
  const [settleState, settleAction, settlePending] = useActionState(settleGameAction, initialState);

  const hasOpponent = props.opponentUserId !== null;

  return (
    <section className="space-y-4">
      <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
        Sandbox-only actions. These are manual test operations and do not represent real Telegram dice.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold">Record creator roll</h3>
          <form action={creatorRollAction} className="space-y-3">
            <input type="hidden" name="gameId" value={props.gameId} />
            <input type="hidden" name="userId" value={props.creatorUserId} />
            <input type="hidden" name="diceCount" value={props.diceCount} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium">Value (1-6)</label>
                <select name="diceValue" defaultValue={6} className="w-full rounded border px-3 py-2">
                  {[1, 2, 3, 4, 5, 6].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium">Source</label>
                <select name="source" defaultValue="system_test" className="w-full rounded border px-3 py-2">
                  <option value="system_test">system_test</option>
                  <option value="admin_test">admin_test</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={creatorRollPending}
              className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {creatorRollPending ? "Recording..." : "Record roll"}
            </button>
          </form>
          <ResultBox state={creatorRollState} />
        </div>

        <div className="space-y-3 rounded border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold">Record opponent roll</h3>
          {!hasOpponent ? (
            <div className="text-sm text-gray-600">Opponent not joined yet.</div>
          ) : (
            <form action={opponentRollAction} className="space-y-3">
              <input type="hidden" name="gameId" value={props.gameId} />
              <input type="hidden" name="userId" value={props.opponentUserId ?? 0} />
              <input type="hidden" name="diceCount" value={props.diceCount} />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Value (1-6)</label>
                  <select name="diceValue" defaultValue={1} className="w-full rounded border px-3 py-2">
                    {[1, 2, 3, 4, 5, 6].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Source</label>
                  <select name="source" defaultValue="system_test" className="w-full rounded border px-3 py-2">
                    <option value="system_test">system_test</option>
                    <option value="admin_test">admin_test</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={opponentRollPending}
                className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {opponentRollPending ? "Recording..." : "Record roll"}
              </button>
            </form>
          )}
          <ResultBox state={opponentRollState} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold">Resolve game</h3>
          <form action={resolveAction}>
            <input type="hidden" name="gameId" value={props.gameId} />
            <button
              type="submit"
              disabled={resolvePending}
              className="rounded bg-gray-900 px-3 py-2 text-white hover:bg-black disabled:opacity-60"
            >
              {resolvePending ? "Resolving..." : "Resolve"}
            </button>
          </form>
          <ResultBox state={resolveState} />
        </div>

        <div className="space-y-3 rounded border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold">Settle game</h3>
          <form action={settleAction}>
            <input type="hidden" name="gameId" value={props.gameId} />
            <button
              type="submit"
              disabled={settlePending}
              className="rounded bg-green-700 px-3 py-2 text-white hover:bg-green-800 disabled:opacity-60"
            >
              {settlePending ? "Settling..." : "Settle"}
            </button>
          </form>
          <ResultBox state={settleState} />
          <p className="text-xs text-gray-500">
            Uses stable idempotency key <code className="rounded bg-gray-100 px-1">play:settle:game:&lt;id&gt;</code>{" "}
            to avoid double payout.
          </p>
        </div>
      </div>
    </section>
  );
}

