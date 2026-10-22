import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { QuizOption } from './types';

export interface OrderListProps {
  /** The blocks, by id, in their current order. */
  order: readonly string[];
  options: readonly QuizOption[];
  labelledBy: string;
  onChange: (order: string[]) => void;
}

type Direction = 'up' | 'down';

/**
 * Order blocks (PRD-UI §7b, C6) with buttons, not drag: every move is one keyboard press, and a
 * live region says where the block landed. Focus stays on the moved block's button (or its other
 * button once it reaches an end), so a run of moves needs no hunting.
 */
export default function OrderList({ order, options, labelledBy, onChange }: OrderListProps) {
  const [announcement, setAnnouncement] = useState('');
  const [moved, setMoved] = useState<{ id: string; direction: Direction } | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const label = (id: string) => options.find((o) => o.id === id)?.label ?? id;

  useEffect(() => {
    if (!moved) return;
    const at = order.indexOf(moved.id);
    const atEnd = moved.direction === 'up' ? at === 0 : at === order.length - 1;
    const direction = atEnd ? (moved.direction === 'up' ? 'down' : 'up') : moved.direction;
    buttons.current.get(`${moved.id}:${direction}`)?.focus();
  }, [moved, order]);

  const move = (id: string, direction: Direction) => {
    const from = order.indexOf(id);
    const to = direction === 'up' ? from - 1 : from + 1;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, id);
    onChange(next);
    setMoved({ id, direction });
    setAnnouncement(`${label(id)} moved to position ${String(to + 1)} of ${String(order.length)}.`);
  };

  const ref = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) buttons.current.set(key, el);
    else buttons.current.delete(key);
  };

  return (
    <div>
      <ol aria-labelledby={labelledBy} className="space-y-2">
        {order.map((id, i) => (
          <li key={id} className="quiz-field flex min-h-11 items-center gap-2 p-2 pl-3">
            <span className="w-6 shrink-0 text-sm font-bold text-text-muted" aria-hidden="true">
              {i + 1}
            </span>
            <span className="flex-1 text-base text-text">{label(id)}</span>
            <button
              type="button"
              ref={ref(`${id}:up`)}
              disabled={i === 0}
              aria-label={`Move “${label(id)}” up`}
              onClick={() => {
                move(id, 'up');
              }}
              className="sk-btn sk-btn-ghost h-11 w-11 px-0 text-text disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              ref={ref(`${id}:down`)}
              disabled={i === order.length - 1}
              aria-label={`Move “${label(id)}” down`}
              onClick={() => {
                move(id, 'down');
              }}
              className="sk-btn sk-btn-ghost h-11 w-11 px-0 text-text disabled:opacity-40"
            >
              <ArrowDown className="h-5 w-5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
