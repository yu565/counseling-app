'use client';

type Slot = { id: string; time: string; durationMin: number };

export default function SlotsClient({ slots }: { slots: Slot[] }) {
  return (
    <section className="grid gap-3">
      {slots.map((s) => (
        <div
          key={s.id}
          className="rounded-2xl border p-4 flex items-center justify-between"
        >
          <div>
            <div className="font-medium">{s.time}</div>
            <div className="text-sm text-gray-500">{s.durationMin}分</div>
          </div>
          <button
            className="px-4 py-2 rounded-xl border hover:shadow"
            onClick={() => alert(`まだ未実装: slot=${s.id}`)}
          >
            予約する
          </button>
        </div>
      ))}
    </section>
  );
}
