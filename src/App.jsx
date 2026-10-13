import { useEffect, useRef, useState } from 'react';
import {
  Anchor,
  Coins,
  Fish,
  Package,
  Compass,
  ShipWheel,
  TreePine,
  Anvil,
  Users,
  Wheat,
  ChevronRight,
  X,
  Plus,
  Minus,
  Swords,
  Crosshair,
  Map,
  Footprints,
  ShoppingBasket,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Flag,
  Hammer,
  Wind,
  Pause,
  Play,
  Check,
  Volume2,
  VolumeX,
  Scroll,
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine
} from 'lucide-react';
import { GameWorld } from './world/engine.js';
import { ISLANDS, GOODS, BUILDINGS, FISH_TYPES, CONTRACT_TEMPLATES } from './world/content.js';
import { marketPrice, maxHull, cargo, cargoLimit, shipName } from './world/rules.js';
import { sound } from './world/audio.js';

const icons = { bait: Fish, food: Wheat, timber: TreePine, iron: Anvil, rum: Package };

function Counter({ icon: Icon, value, label, highlight = false }) {
  return (
    <div className={`counter ${highlight ? 'gold' : ''}`} title={label}>
      <Icon size={17} />
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}

function CreelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="4" y="8" width="16" height="12" rx="3" fill="#8c6239" stroke="#5d4122" />
      <path d="M6 12 h12 M6 16 h12" stroke="#e0c7a2" strokeWidth="1.2" />
      <path d="M8 8 V5 a4 4 0 0 1 8 0 v3" stroke="#5d4122" strokeWidth="1.6" />
    </svg>
  );
}

function RodIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 20 L20 4" stroke="#5d432b" strokeWidth="2.2" />
      <path d="M20 4 C19 8, 14 15, 11 19" stroke="#8b7355" strokeWidth="1.2" strokeDasharray="2 1.5" />
      <circle cx="7" cy="17" r="1.6" fill="#5d432b" />
    </svg>
  );
}

function Panel({ title, subtitle, onClose, children, className = '' }) {
  return (
    <section className={`game-panel ${className}`} role="dialog" aria-label={title}>
      <button className="panel-close" aria-label="Close panel" onClick={onClose}>
        <X size={18} />
      </button>
      <h2>{title}</h2>
      {subtitle && <p className="panel-subtitle">{subtitle}</p>}
      {children}
    </section>
  );
}

function Chart({ state: s, engine, large = false }) {
  return (
    <div className={`sea-chart ${large ? 'large' : ''}`}>
      <svg viewBox="-360 -360 720 720" aria-label="The seven shores and your position">
        <defs>
          <pattern id={large ? 'grid-large' : 'grid-small'} width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0H0V60" fill="none" stroke="#a6b399" strokeWidth="1" opacity="0.2" />
          </pattern>
        </defs>
        <rect x="-360" y="-360" width="720" height="720" fill={large ? '#e7e8ce' : '#284e49'} />
        <rect x="-360" y="-360" width="720" height="720" fill={`url(#${large ? 'grid-large' : 'grid-small'})`} />
        {ISLANDS.map(i => (
          <g
            key={i.id}
            className="chart-island"
            role="button"
            tabIndex={large ? 0 : -1}
            aria-label={`Set course for ${i.name}`}
            onClick={() => engine.plotCourse(i)}
            onKeyDown={e => e.key === 'Enter' && engine.plotCourse(i)}
          >
            <ellipse cx={i.x} cy={i.z} rx={i.rx + 6} ry={i.rz + 6} fill={large ? '#c7c19c' : '#526b59'} />
            <ellipse
              cx={i.x}
              cy={i.z}
              rx={i.rx - 2}
              ry={i.rz - 2}
              fill={s.captured.includes(i.id) ? '#7a986b' : i.type === 'hostile' ? '#988366' : '#93a57b'}
            />
            <circle
              cx={i.x + 8}
              cy={i.z + i.rz + 10}
              r="6"
              fill={s.captured.includes(i.id) ? '#3f775d' : i.type === 'hostile' ? '#a7644d' : '#efddae'}
            />
            {large && (
              <text x={i.x} y={i.z - i.rz - 11} textAnchor="middle" fontSize="13" fill="#54644c">
                {i.name}
              </text>
            )}
          </g>
        ))}
        <g transform={`translate(${s.x} ${s.z}) rotate(${(-s.heading * 180) / Math.PI})`}>
          <path d="M0 -11L7 8L0 5L-7 8Z" fill={large ? '#426853' : '#fff0c8'} stroke={large ? '#edf0d6' : '#284c41'} strokeWidth="2" />
        </g>
        <text x="-330" y="-325" fill={large ? '#788260' : '#dfe7c5'} fontSize="24">
          N
        </text>
      </svg>
      {!large && (
        <button
          className="chart-open"
          onClick={() => {
            engine.panel = 'chart';
            engine.emit();
          }}
        >
          <Map size={12} />
          Sea chart <kbd>M</kbd>
        </button>
      )}
    </div>
  );
}

function WindCompass({ wind, heading, mode }) {
  const windAngleDeg = (wind.angle * 180) / Math.PI;
  const shipAngleDeg = (heading * 180) / Math.PI;
  const isWithWind = mode === 'ship' && Math.abs(Math.atan2(Math.sin(heading - wind.angle), Math.cos(heading - wind.angle))) < 1.0;

  return (
    <div className={`wind-compass ${isWithWind ? 'with-wind' : ''}`} title={`Wind blowing at ${wind.speed} knots`}>
      <div className="wind-dial">
        <Wind
          size={16}
          style={{
            transform: `rotate(${windAngleDeg}deg)`,
            transition: 'transform 0.4s ease'
          }}
        />
      </div>
      <div>
        <span className="wind-label">WIND</span>
        <strong>{wind.speed} kts</strong>
      </div>
      {mode === 'ship' && (
        <span className={`wind-status ${isWithWind ? 'boost' : 'tack'}`}>
          {isWithWind ? 'Tailwind' : 'Tacking'}
        </span>
      )}
    </div>
  );
}

function Market({ view: v, engine: e }) {
  const s = v.state;
  const i = v.island;
  return (
    <Panel
      title={i.id === 'haven' ? 'Mara’s harbor market' : 'The local trading post'}
      subtitle={`${i.name} · Stock replenishes gradually.`}
      onClose={() => e.closePanel()}
    >
      <div className="trade-catch">
        <div>
          <Fish size={28} />
          <span>
            <strong>Your fresh catch</strong>
            <small>{s.fish.length}/8 fish in your basket</small>
          </span>
        </div>
        <button className="solid-button" disabled={!s.fish.length} onClick={() => e.sellCatch()}>
          Sell catch · {s.fish.reduce((n, f) => n + Math.round(f.value * (i.id === 'copper' ? 1.2 : 1)), 0)}
          <Coins size={13} />
        </button>
      </div>

      <div className="market-table">
        <div className="table-heading">
          <span>GOODS</span>
          <span>STOCK / HELD</span>
          <span>TRADE</span>
        </div>
        {Object.entries(GOODS).map(([id, g]) => {
          const Icon = icons[id] || Package;
          return (
            <div className="good-row" key={id}>
              <div className="good-name">
                <Icon size={20} />
                {g.name}
              </div>
              <span className="good-stock">
                {s.marketStocks[i.id]?.[id] ?? 0}
                <small> / {s[id] ?? 0}</small>
              </span>
              <div className="trade-actions">
                <button aria-label={`Sell ${g.name}`} disabled={!s[id]} onClick={() => e.trade(id, false)}>
                  <Minus size={12} />
                  {marketPrice(i, id, true)}
                </button>
                <button
                  aria-label={`Buy ${g.name}`}
                  disabled={s.gold < marketPrice(i, id) || !s.marketStocks[i.id]?.[id]}
                  onClick={() => e.trade(id, true)}
                >
                  <Plus size={12} />
                  {marketPrice(i, id)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="panel-tip">
        Timber is cheaper at Crescent Cay. Copperlight pays more for it. Rum fetches top coin at Crescent. Plan trade
        routes for big profit!
      </p>

      <div className="panel-foot">
        <Package size={14} />
        Cargo {cargo(s)}/{cargoLimit(s)}
        <span>
          <Coins size={14} />
          {s.gold} gold
        </span>
      </div>
    </Panel>
  );
}

function Shipyard({ view: v, engine: e }) {
  const s = v.state;
  const options = [
    {
      id: 'cannon',
      icon: Crosshair,
      name: s.cannon ? 'Improve deck cannons' : 'Install deck cannon',
      copy: s.cannon ? `Level ${s.cannon}/3 · Multi-shot broadside salvos.` : 'Your skiff starts unarmed. Add naval guns.',
      gold: 80,
      timber: 4,
      iron: 0,
      done: s.cannon >= 3
    },
    {
      id: 'sails',
      icon: Wind,
      name: 'Upgrade sails & rigging',
      copy: `Level ${s.sails}/2 · Faster voyages and better wind handling.`,
      gold: 65,
      timber: 3,
      iron: 0,
      done: s.sails >= 2
    },
    {
      id: 'cutter',
      icon: Anchor,
      name: 'Commission a coastal cutter',
      copy: '105 hull, twin masts, bowsprit, and 40 cargo capacity.',
      gold: 170,
      timber: 12,
      iron: 4,
      done: !!s.tier
    },
    {
      id: 'crew',
      icon: Users,
      name: 'Recruit a stalwart sailor',
      copy: `${s.crew}/4 crew · Two sailors needed to establish a settlement.`,
      gold: 40,
      timber: 0,
      iron: 0,
      done: s.crew >= 4
    }
  ];

  return (
    <Panel
      title="The shipwright’s workshop"
      subtitle={`${v.island.name} · Earn your vessel, one voyage at a time.`}
      onClose={() => e.closePanel()}
    >
      <div className="workshop-ship">
        <Anchor size={32} />
        <div>
          <span>YOUR VESSEL</span>
          <h3>{shipName(s)}</h3>
          <p>
            {s.hull}/{maxHull(s)} hull · {s.cannon ? `${14 + s.cannon * 7} cannon damage (${s.cannon} guns)` : 'Unarmed'} ·{' '}
            {s.crew} crew
          </p>
        </div>
      </div>
      {options.map(o => (
        <div className="workshop-row" key={o.id}>
          <o.icon size={24} />
          <div>
            <strong>{o.name}</strong>
            <small>{o.copy}</small>
            <p className="material-cost">
              <Coins size={12} />
              {o.gold}
              {o.timber > 0 && (
                <>
                  <TreePine size={12} />
                  {o.timber}
                </>
              )}
              {o.iron > 0 && (
                <>
                  <Anvil size={12} />
                  {o.iron}
                </>
              )}
            </p>
          </div>
          <button
            className="square-button"
            aria-label={o.name}
            disabled={o.done || s.gold < o.gold || s.timber < o.timber || s.iron < o.iron}
            onClick={() => e.upgrade(o.id)}
          >
            {o.done ? <Check size={17} /> : <Plus size={17} />}
          </button>
        </div>
      ))}
      <button
        className="outline-button full"
        disabled={s.hull === maxHull(s) || s.gold < Math.ceil((maxHull(s) - s.hull) * 0.65)}
        onClick={() => e.upgrade('repair')}
      >
        <Hammer size={16} />
        Repair hull · {Math.ceil((maxHull(s) - s.hull) * 0.65)} gold
      </button>
    </Panel>
  );
}

function Fishing({ view: v, engine: e }) {
  const f = v.fishing;
  const s = v.state;
  if (!f) return null;
  return (
    <Panel
      title={f.spot.name}
      subtitle={`${s.stocks[f.spot.id]} fish here · ${s.bait} bait remaining`}
      onClose={() => e.closePanel()}
      className="fishing-panel"
    >
      {f.phase === 'casting' && (
        <>
          <div className="fishing-title">
            <Fish size={30} />
            <h3>The line is in the water.</h3>
          </div>
          <p className="panel-tip">Watch for the bite. Each cast consumes one bait.</p>
          <div className="waiting-dots">
            <i />
            <i />
            <i />
          </div>
        </>
      )}
      {f.phase === 'bite' && (
        <>
          <h3>A bite! Hook it in the green!</h3>
          <p className="panel-tip">Press Space or the button when the bobber strikes.</p>
          <div className="skill-track hook-track">
            <span className="hook-zone" />
            <i style={{ left: `${f.marker}%` }} />
          </div>
          <button className="solid-button full" onClick={() => e.hookFish()}>
            Hook the fish <kbd>SPACE</kbd>
          </button>
        </>
      )}
      {f.phase === 'reeling' && (
        <>
          <h3>{f.surge ? 'It’s pulling hard! Give it slack!' : 'Steady. Reel it closer.'}</h3>
          <div className="meter-caption">
            <span>LANDING PROGRESS</span>
            <strong>{Math.round(f.progress)}%</strong>
          </div>
          <div className="skill-track">
            <span className="progress-fill" style={{ width: `${f.progress}%` }} />
          </div>
          <div className="meter-caption">
            <span>LINE TENSION</span>
            <strong className={f.tension > 80 ? 'warning' : ''}>{Math.round(f.tension)}%</strong>
          </div>
          <div className="skill-track tension">
            <span style={{ width: `${f.tension}%` }} />
          </div>
          <p className="panel-tip">Hold Space / Button to reel in. Release when tension spikes near red!</p>
          <button
            className="solid-button full hold-button"
            onPointerDown={event => {
              event.preventDefault();
              e.reel(true);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={() => e.reel(false)}
            onPointerCancel={() => e.reel(false)}
          >
            Hold to reel <kbd>SPACE</kbd>
          </button>
        </>
      )}
      {f.phase === 'caught' && (
        <>
          <div className="fishing-title">
            <Fish size={34} />
            <span>LANDED IT</span>
            <h3>{f.catch.name}</h3>
            <p>
              {f.catch.rarity} · Worth {f.catch.value} gold at market
            </p>
          </div>
          <button className="solid-button full" disabled={!s.bait || !s.stocks[f.spot.id]} onClick={() => e.castAgain()}>
            Cast again · 1 bait
          </button>
          <p className="panel-tip">
            {s.stocks[f.spot.id] ? 'Stored safely in your basket.' : 'School depleted. Move to another coastal or deep school.'}
          </p>
        </>
      )}
      {f.phase === 'missed' && (
        <>
          <h3>This one got away!</h3>
          <p className="panel-tip">Hook inside the green zone, then balance reeling with releasing line tension.</p>
          <button className="solid-button full" disabled={!s.bait} onClick={() => e.castAgain()}>
            Try again · 1 bait
          </button>
        </>
      )}
    </Panel>
  );
}

function Settlement({ view: v, engine: e }) {
  const s = v.state;
  const i = v.island;
  const owned = s.captured.includes(i.id);
  const hostile = i.type === 'hostile' && s.garrisons[i.id] > 0;
  const wh = s.warehouses?.[i.id] || { timber: 0, iron: 0, food: 0, rum: 0 };

  return (
    <Panel
      title={i.name}
      subtitle={owned ? 'Your growing island colony' : 'A strategic port in the archipelago'}
      onClose={() => e.closePanel()}
    >
      {!owned ? (
        <>
          <div className="settlement-emblem">
            <Flag size={39} />
          </div>
          <h3>{hostile ? 'The enemy battery still commands this harbor.' : 'A new flag on the horizon.'}</h3>
          <p className="panel-tip">
            {hostile
              ? `The coastal battery has ${s.garrisons[i.id]} strength. Bombard it with ship cannons, or land and take it with cutlasses.`
              : 'You need two crew members and two provisions to establish a settlement.'}
          </p>
          {i.type === 'wild' && <p className="panel-tip">An empty shore also requires 100 gold and 10 timber to found.</p>}
          <button className="solid-button full" disabled={hostile || s.crew < 2 || s.food < 2} onClick={() => e.claim()}>
            Raise your flag
          </button>
        </>
      ) : (
        <>
          <div className="settlement-stats">
            <span>
              <Users size={18} />
              {i.population || 25} settlers
            </span>
            <span>
              <Coins size={18} />
              {s.buildings[i.id]?.includes('warehouse') ? 16 : 8} gold/min tax
            </span>
          </div>

          <div className="warehouse-section">
            <h4>
              <Package size={15} /> ISLAND WAREHOUSE STORAGE
            </h4>
            <div className="warehouse-grid">
              {['timber', 'iron', 'food', 'rum'].map(good => (
                <div className="warehouse-row" key={good}>
                  <span className="good-title">
                    {good.toUpperCase()}: <strong>{wh[good] || 0}</strong> in depot
                  </span>
                  <div className="warehouse-actions">
                    <button
                      title="Load 1 into ship"
                      disabled={!wh[good] || cargo(s) >= cargoLimit(s)}
                      onClick={() => e.takeWarehouse(good, 1)}
                    >
                      <ArrowUpFromLine size={13} /> Load
                    </button>
                    <button
                      title="Unload 1 into warehouse"
                      disabled={!s[good]}
                      onClick={() => e.storeWarehouse(good, 1)}
                    >
                      <ArrowDownToLine size={13} /> Unload
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="panel-tip">Workshops produce goods each minute into your warehouse and ship hold:</p>
          {BUILDINGS.map(b => {
            const built = s.buildings[i.id]?.includes(b.id);
            return (
              <div className="workshop-row" key={b.id}>
                <Hammer size={22} />
                <div>
                  <strong>{b.name}</strong>
                  <small>{b.description}</small>
                  <p className="material-cost">
                    <Coins size={12} />
                    {b.gold}
                    <TreePine size={12} />
                    {b.timber}
                    {b.iron > 0 && (
                      <>
                        <Anvil size={12} />
                        {b.iron}
                      </>
                    )}
                  </p>
                </div>
                <button
                  className="square-button"
                  aria-label={`Build ${b.name}`}
                  disabled={built || s.gold < b.gold || s.timber < b.timber || s.iron < b.iron}
                  onClick={() => e.build(b.id)}
                >
                  {built ? <Check size={17} /> : <Plus size={17} />}
                </button>
              </div>
            );
          })}
        </>
      )}
    </Panel>
  );
}

function ContractsPanel({ view: v, engine: e }) {
  const s = v.state;
  return (
    <Panel
      title="Archipelago Notices & Contracts"
      subtitle="Bounties and mercantile opportunities across the seven shores."
      onClose={() => e.closePanel()}
      className="contracts-panel"
    >
      <div className="contracts-list">
        {CONTRACT_TEMPLATES.map(c => {
          let progressText = '';
          let canComplete = false;
          if (c.type === 'trade') {
            const hasGoods = (s[c.good] || 0) >= c.amount;
            const atTarget = v.island?.id === c.target;
            progressText = `${s[c.good] || 0}/${c.amount} ${c.good} aboard`;
            canComplete = hasGoods && atTarget;
          } else if (c.type === 'bounty') {
            progressText = `${s.seaKills} corsairs defeated`;
            canComplete = s.seaKills >= c.amount;
          } else if (c.type === 'fish') {
            const caught = s.fish.filter(f => f.id === c.target).length;
            progressText = `${caught}/${c.amount} in basket`;
            canComplete = caught >= c.amount;
          }

          return (
            <div className="contract-card" key={c.id}>
              <div className="contract-head">
                <strong>{c.title}</strong>
                <span className="reward">
                  +{c.rewardGold} <Coins size={12} />
                </span>
              </div>
              <p>{c.desc}</p>
              <div className="contract-foot">
                <small>{progressText}</small>
                {canComplete ? (
                  <span className="ready-badge">Ready for claim</span>
                ) : (
                  <small className="giver">Issuer: {c.giver}</small>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="panel-tip">
        Fulfill cargo requirements and sail to the destination harbor, or sink corsairs to claim rewards!
      </p>
    </Panel>
  );
}

function Quest({ state: s, engine: e }) {
  const [closed, setClosed] = useState(() => window.innerWidth < 600);
  const tasks = s.fishSold
    ? [
        ['Install a deck cannon', s.cannon > 0],
        ['Discover a new trading port', s.visited.length > 1],
        ['Recruit a second sailor', s.crew >= 2],
        ['Establish your own settlement', s.captured.length > 0]
      ]
    : [
        ['Walk down to the harbor', s.travelled > 16],
        ['Board your little skiff', s.boarded],
        ['Land your first fish', s.fishCaught > 0],
        ['Sell your catch to Mara', s.fishSold > 0]
      ];

  function follow(text) {
    const items = e.interactions();
    let target;
    if (text.includes('harbor') || text.includes('skiff')) target = items.find(i => i.kind === 'boat');
    else if (text.includes('fish')) target = items.find(i => i.id === 'haven-shore');
    else if (text.includes('Mara')) target = items.find(i => i.id === 'market-haven');
    else if (text.includes('cannon') || text.includes('sailor')) target = items.find(i => i.kind === 'shipyard');
    if (target) e.approach(target);
    else {
      e.panel = 'chart';
      e.emit();
    }
  }

  return (
    <aside className={`voyage-guide ${closed ? 'collapsed' : ''}`}>
      <button onClick={() => setClosed(!closed)}>
        <Compass size={16} />
        <span>{s.fishSold ? 'A Captain in the Making' : 'Your First Voyage'}</span>
        <ChevronRight size={14} />
      </button>
      {!closed && (
        <>
          <p>{s.fishSold ? 'Trade goods, upgrade your vessel, and raise your flag on distant shores.' : 'Every legendary voyage begins at a quiet pier.'}</p>
          {tasks.map(([text, done]) => (
            <button disabled={done} onClick={() => follow(text)} className={`quest-line ${done ? 'done' : ''}`} key={text}>
              {done ? <Check size={13} /> : <span className="task-circle" />}
              {text}
            </button>
          ))}
        </>
      )}
    </aside>
  );
}

export default function App() {
  const root = useRef(null);
  const ref = useRef(null);
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);
  const [reset, setReset] = useState(false);
  const [muted, setMuted] = useState(() => sound.muted);

  useEffect(() => {
    try {
      const e = new GameWorld(root.current, setView);
      ref.current = e;
      window.__engine = e;
      return () => {
        e.dispose();
        ref.current = null;
        window.__engine = null;
      };
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }, []);

  const e = ref.current;
  const s = view?.state;

  const pause = () => {
    setPaused(!paused);
    if (e) {
      e.paused = !paused;
      e.keys.clear();
    }
  };

  const show = panel => {
    sound.ensureContext();
    e.panel = e.panel === panel ? null : panel;
    e.emit();
  };

  const toggleSound = () => {
    sound.ensureContext();
    const newMuted = sound.toggleMute();
    setMuted(newMuted);
  };

  return (
    <main className={`world-game ${view?.hit ? 'hit' : ''}`}>
      <div className="world-canvas" ref={root} />
      {!s && (
        <div className="world-loading">
          <ShipWheel size={42} />
          <h1>{error ? 'Unable to start 3D World' : 'Salt & Sail'}</h1>
          <p>{error || 'Preparing your little corner of the sea…'}</p>
          {error && <p>This game requires WebGL 2.</p>}
        </div>
      )}
      {s && (
        <>
          <div className="cozy-top-actions">
            <button className="cozy-pill-btn" onClick={() => show('inventory')} title="Captain's Sea Chest (I)">
              <ShoppingBasket size={15} />
              <span>Chest</span>
            </button>
            <button className="cozy-pill-btn" onClick={() => show('chart')} title="Archipelago Sea Chart (M)">
              <Map size={15} />
              <span>Chart</span>
            </button>
            <button className="cozy-pill-btn icon-only" onClick={toggleSound} title={muted ? 'Unmute' : 'Mute'}>
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button className="cozy-pill-btn icon-only" onClick={pause} title="Pause">
              {paused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          </div>

          <div className="creel-pill">
            <span className="creel-icon">
              <CreelIcon />
            </span>
            <span>Into the creel · {s.fish.length} / 8</span>
          </div>

          {s.mode === 'ship' && (
            <>
              <div className="captain-status">
                <div className="captain-avatar">
                  <ShipWheel size={24} />
                </div>
                <div>
                  <strong>{shipName(s)}</strong>
                  <div className="status-meter">
                    <span style={{ width: `${(s.hull / maxHull(s)) * 100}%` }} />
                  </div>
                  <small>
                    {Math.ceil(s.hull)} / {maxHull(s)} hull
                    <span>{cargo(s)}/{cargoLimit(s)} cargo</span>
                  </small>
                </div>
              </div>

              <WindCompass wind={s.wind} heading={s.heading} mode={s.mode} />

              <div className="minimap-wrap">
                <Chart state={s} engine={e} />
                <span className="map-caption">THE SEVEN SHORES</span>
              </div>
            </>
          )}

          <div className="cozy-bait-indicator">
            <div className="bait-disk" title={`Bait provisions: ${s.bait} remaining`}>
              <svg viewBox="0 0 32 32" className="bait-svg">
                <path d="M16 6 v12 a4 4 0 0 1 -4 4 a4 4 0 0 1 -4 -4" fill="none" stroke="#4a3725" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="16" cy="6" r="2" fill="none" stroke="#4a3725" strokeWidth="1.8" />
                <ellipse cx="20" cy="21" rx="5" ry="4" fill="#edd6a8" stroke="#8c704a" strokeWidth="1.6" />
              </svg>
            </div>
            <div className="bait-pill">Bread</div>
          </div>

          <div className="bottom-controls">
            <button
              className="cozy-action-btn"
              onClick={() => e.interact()}
              title="Press E or click to interact"
            >
              <span className="action-key">E</span>
              <span className="action-icon">
                {view.fishing || view.near?.kind === 'fish' ? <RodIcon /> : <Anchor size={14} />}
              </span>
              <span className="action-label">
                {view.fishing
                  ? 'Put the rod away'
                  : view.near?.kind === 'fish'
                  ? 'Cast fishing rod'
                  : view.near?.kind === 'boat'
                  ? `Board ${shipName(s).toLowerCase()}`
                  : view.near?.kind === 'dock'
                  ? `Go ashore · ${view.near.island.name}`
                  : view.near?.name || 'Cast fishing rod'}
              </span>
            </button>
          </div>

          <div className="touch-movement">
            {[
              ['KeyW', 'up', ArrowUp],
              ['KeyA', 'left', ArrowLeft],
              ['KeyD', 'right', ArrowRight],
              ['KeyS', 'down', ArrowDown]
            ].map(([code, cls, Icon]) => (
              <button
                key={code}
                className={cls}
                aria-label={`Move ${cls}`}
                onPointerDown={event => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  e.keys.add(code);
                }}
                onPointerUp={() => e.keys.delete(code)}
                onPointerCancel={() => e.keys.delete(code)}
              >
                <Icon size={17} />
              </button>
            ))}
          </div>

          {view.toast && (
            <div className="world-toast" role="status">
              <Compass size={16} />
              {view.toast}
            </div>
          )}

          {view.panel === 'market' && <Market view={view} engine={e} />}
          {view.panel === 'shipyard' && <Shipyard view={view} engine={e} />}
          {view.panel === 'fish' && <Fishing view={view} engine={e} />}
          {view.panel === 'settlement' && <Settlement view={view} engine={e} />}
          {view.panel === 'contracts' && <ContractsPanel view={view} engine={e} />}

          {view.panel === 'chart' && (
            <Panel
              title="The Seven Shores"
              subtitle="An archipelago ripe for discovery. Select any island to set course."
              className="chart-panel"
              onClose={() => e.closePanel()}
            >
              <Chart state={s} engine={e} large />
              <div className="chart-legend">
                <span>
                  <i /> Friendly port
                </span>
                <span>
                  <i /> Corsair territory
                </span>
                <span>
                  <i /> Your settlement
                </span>
              </div>
              <p className="panel-tip">
                {s.mode === 'foot' ? 'Board your vessel before setting course.' : 'Courses automatically avoid obstacles.'} First
                visits award 15 gold. Different ports feature unique goods and prices!
              </p>
            </Panel>
          )}

          {view.panel === 'inventory' && (
            <Panel
              title="Captain’s Sea Chest & Log"
              subtitle="Hold capacity, trade goods, and cataloged discoveries."
              onClose={() => e.closePanel()}
            >
              <div className="inventory-summary">
                <Package size={31} />
                <span>
                  {cargo(s)}/{cargoLimit(s)} cargo in hold
                  <strong>{s.fish.length}/8 fresh fish in basket</strong>
                </span>
              </div>

              <h4>FRESH FISH CATCH</h4>
              {s.fish.length ? (
                <div className="fish-inventory">
                  {s.fish.map((f, n) => (
                    <div key={`${f.id}-${n}`}>
                      <Fish size={19} />
                      <div>
                        <strong>{f.name}</strong>
                        <small>{f.rarity}</small>
                      </div>
                      <span>
                        {f.value} <Coins size={12} />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="panel-tip">Your basket is empty. Cast a line at any coastal or offshore fishing school.</p>
              )}

              <h4>ARCHIPELAGO LOGBOOK</h4>
              <div className="logbook-stats">
                <div>
                  <span>Discovered Islands</span>
                  <strong>{s.visited.length} / 7</strong>
                </div>
                <div>
                  <span>Colonies Claimed</span>
                  <strong>{s.captured.length}</strong>
                </div>
                <div>
                  <span>Corsairs Defeated</span>
                  <strong>{s.seaKills}</strong>
                </div>
                <div>
                  <span>Boardings Won</span>
                  <strong>{s.boardingsWon || 0}</strong>
                </div>
                <div>
                  <span>Salvage Scooped</span>
                  <strong>{s.salvageCollected || 0}</strong>
                </div>
              </div>

              <h4>FISH COMPENDIUM</h4>
              <div className="compendium-list">
                {FISH_TYPES.map(ft => (
                  <div className="compendium-item" key={ft.id}>
                    <Fish size={16} />
                    <div>
                      <strong>{ft.name}</strong>
                      <small>{ft.desc}</small>
                    </div>
                    <span>
                      {ft.value} <Coins size={11} />
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {paused && (
            <div className="pause-overlay">
              <Panel title="A Moment Ashore" subtitle="Adventure paused." onClose={pause}>
                <div className="field-guide">
                  <p>
                    <kbd>WASD / ARROWS</kbd>Move on foot or steer your ship. Click to set waypoints.
                  </p>
                  <p>
                    <kbd>E</kbd>Board, go ashore, fish, talk to merchants, or board crippled corsairs.
                  </p>
                  <p>
                    <kbd>SHIFT</kbd>Sprint on foot. <kbd>SPACE</kbd>Dodge roll on foot, or fire cannons at sea.
                  </p>
                  <p>
                    <kbd>F</kbd>Cutlass strike. At sea, right-click to direct cannon fire.
                  </p>
                  <p>
                    <kbd>M</kbd>Sea chart. <kbd>I</kbd>Logbook & chest. <kbd>R</kbd>Reset camera.
                  </p>
                </div>
                <p className="panel-tip">
                  Catch fish, transport goods between islands with price differences, build up your colonies, and upgrade
                  your ship into a feared naval vessel!
                </p>
                <button className="solid-button full" onClick={pause}>
                  Back to the adventure
                </button>
                {reset ? (
                  <div className="reset-options">
                    <p>Clear all progress and start fresh?</p>
                    <button onClick={() => setReset(false)}>Keep it</button>
                    <button
                      onClick={() => {
                        e.reset();
                        setReset(false);
                        pause();
                      }}
                    >
                      Start fresh
                    </button>
                  </div>
                ) : (
                  <button className="text-button" onClick={() => setReset(true)}>
                    Start a new captain
                  </button>
                )}
              </Panel>
            </div>
          )}

          <output
            className="sr-only"
            data-testid="world-state"
            data-x={s.x.toFixed(2)}
            data-z={s.z.toFixed(2)}
            data-mode={s.mode}
            data-gold={s.gold}
            data-bait={s.bait}
            data-caught={s.fishCaught}
          >
            {s.mode} at {view.location}
          </output>
        </>
      )}
    </main>
  );
}
