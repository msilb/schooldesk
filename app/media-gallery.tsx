'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Image as ImageIcon, Play, X } from 'lucide-react';
import { dateLabel } from '@/lib/dates';
import type { Media } from '@/lib/schema';
export function mediaURL(item: Media, demo: boolean) {
  return demo
    ? (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/demo/' + item.assetId + '.svg'
    : '/api/assets/' + item.assetId;
}
export default function MediaGallery({ items, demo }: { items: Media[]; demo: boolean }) {
  const [index, setIndex] = useState(-1),
    [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const visible = items.filter((m) => filter === 'all' || m.kind === filter);
  return (
    <>
      <div className="section-tools">
        <div className="segmented" role="group" aria-label="Media type">
          {(['all', 'image', 'video'] as const).map((type) => (
            <button
              key={type}
              aria-pressed={filter === type}
              className={filter === type ? 'selected' : ''}
              onClick={() => {
                setIndex(-1);
                setFilter(type);
              }}
            >
              {type === 'all' ? 'All memories' : type === 'image' ? 'Photos' : 'Videos'}
            </button>
          ))}
        </div>
        <span className="muted">
          {visible.length} {visible.length === 1 ? 'memory' : 'memories'}
        </span>
      </div>
      {visible.length ? (
        <div className="gallery">
          {visible.map((item, i) => (
            <button
              className="memory-card"
              key={item.id}
              aria-label={'Open ' + item.title}
              onClick={() => setIndex(i)}
            >
              <div className="memory-image">
                {item.kind === 'image' ? (
                  <img src={mediaURL(item, demo)} alt={item.title} loading="lazy" />
                ) : (
                  <span className="video-placeholder">
                    <Play size={40} />
                  </span>
                )}
                {item.kind === 'video' && (
                  <span className="media-kind">
                    <Play size={14} />
                    Video
                  </span>
                )}
              </div>
              <div>
                <h3>{item.title}</h3>
                <span>{dateLabel(item.date)}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ImageIcon size={32} />
          <h3>No {filter === 'video' ? 'videos' : 'memories'} yet</h3>
          <p>Imported classroom memories will appear here.</p>
        </div>
      )}
      {index >= 0 && visible[index] && (
        <Viewer
          items={visible}
          index={index}
          setIndex={setIndex}
          close={() => setIndex(-1)}
          demo={demo}
        />
      )}
    </>
  );
}
function Viewer({
  items,
  index,
  setIndex,
  close,
  demo,
}: {
  items: Media[];
  index: number;
  setIndex: (n: number) => void;
  close: () => void;
  demo: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    start = useRef<{ x: number; y: number } | null>(null),
    [failed, setFailed] = useState(false);
  const callbacks = useRef({ index, items, setIndex, close });
  callbacks.current = { index, items, setIndex, close };
  useEffect(() => {
    const active = document.activeElement as HTMLElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      const c = callbacks.current;
      if (e.key === 'Escape') c.close();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        c.setIndex(Math.max(0, c.index - 1));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        c.setIndex(Math.min(c.items.length - 1, c.index + 1));
      }
      if (e.key === 'Tab') {
        const buttons = [...ref.current!.querySelectorAll<HTMLElement>('button,video')].filter(
          (n) => !n.matches(':disabled'),
        );
        if (
          e.shiftKey &&
          (document.activeElement === buttons[0] || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          buttons.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === buttons.at(-1)) {
          e.preventDefault();
          buttons[0]?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
      active?.focus();
    };
  }, []);
  useEffect(() => {
    setFailed(false);
    for (const i of [index - 1, index + 1])
      if (items[i]?.kind === 'image') {
        const image = new window.Image();
        image.src = mediaURL(items[i], demo);
      }
  }, [index, items, demo]);
  const item = items[index];
  return (
    <div
      className="media-viewer"
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <header>
        <span>
          {index + 1} / {items.length}
        </span>
        <button className="icon-button" aria-label="Close gallery" onClick={close}>
          <X />
        </button>
      </header>
      <div
        className="media-stage"
        onTouchStart={(e) => {
          start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          if (!start.current) return;
          const dx = e.changedTouches[0].clientX - start.current.x,
            dy = e.changedTouches[0].clientY - start.current.y;
          start.current = null;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4)
            setIndex(Math.max(0, Math.min(items.length - 1, index + (dx < 0 ? 1 : -1))));
        }}
      >
        {failed ? (
          <p>This memory could not load. Try opening it again.</p>
        ) : item.kind === 'video' ? (
          <video
            key={item.id}
            src={mediaURL(item, demo)}
            controls
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
          />
        ) : (
          <img
            key={item.id}
            src={mediaURL(item, demo)}
            alt={item.title}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <footer>
        <button
          className="icon-button"
          aria-label="Previous memory"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ArrowLeft />
        </button>
        <div>
          <b>{item.title}</b>
          <span>{dateLabel(item.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <button
          className="icon-button"
          aria-label="Next memory"
          disabled={index === items.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          <ArrowRight />
        </button>
      </footer>
    </div>
  );
}
