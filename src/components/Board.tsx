import { COL_CLASSES, LETTERS, RANGES } from '../lib/bingo';

interface BoardProps {
  calledSet: Set<number>;
  latest: number | undefined;
  onToggle: (n: number) => void;
}

export function Board({ calledSet, latest, onToggle }: BoardProps) {
  return (
    <div className="board">
      <div className="col-headers">
        {LETTERS.map((letter) => (
          <span key={letter}>{letter}</span>
        ))}
      </div>
      <div className="grid" id="grid">
        {/* Column-major order (columns outer, numbers inner) so the DOM order
            matches grid-auto-flow: column without needing an imperative
            reflow step, unlike the legacy buildGrid()/reflow() pair. */}
        {RANGES.map(([start, end], col) => {
          const numbers = [];
          for (let n = start; n <= end; n++) numbers.push(n);
          return numbers.map((n) => {
            const isCalled = calledSet.has(n);
            const classes = ['cell', COL_CLASSES[col]];
            if (isCalled) classes.push('called');
            if (isCalled && n === latest) classes.push('latest');
            return (
              <div key={n} className={classes.join(' ')} data-num={n} onClick={() => onToggle(n)}>
                {n}
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}
