import { letterFor } from '../lib/bingo';

interface LastCalledProps {
  latest: number | undefined;
}

export function LastCalled({ latest }: LastCalledProps) {
  const hasLatest = latest !== undefined;
  return (
    <div className="last-called">
      <div id="lastBall" className={'ball' + (hasLatest ? '' : ' empty')}>
        {hasLatest ? latest : '—'}
      </div>
      <div className="info">
        <div className="label">Last called</div>
        <div id="lastLabel" className="val">
          {hasLatest ? `${letterFor(latest as number)}-${latest}` : 'Nothing yet — tap a number below'}
        </div>
      </div>
    </div>
  );
}
