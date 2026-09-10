interface HeaderProps {
  calledCount: number;
}

export function Header({ calledCount }: HeaderProps) {
  return (
    <header>
      <div>
        <h1>Bingo caller's board</h1>
        <p className="tagline">Tap a number as you call it</p>
      </div>
      <div className="session-count">
        called
        <strong id="countVal">{calledCount}</strong>
      </div>
    </header>
  );
}
