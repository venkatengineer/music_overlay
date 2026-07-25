import React, { useEffect, useRef } from 'react';

const ALIEN_GLYPHS = ['☩', '⌬', '⎔', '⏣', '⚡', '◈', '░', '▒', '▓', '█', '⬡', '⬢', '✦', '✧', '⌘', '⍟', '✵', '⚙', '☯', '⚝', '∆', '⎈', 'Ϡ', 'Ϟ'];

interface AlienGlyphTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  scrambleSpeedMs?: number;
  as?: React.ElementType;
}

export const AlienGlyphText: React.FC<AlienGlyphTextProps> = ({
  text,
  className = '',
  style = {},
  title,
  scrambleSpeedMs = 18,
  as: Component = 'span',
}) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevTextRef = useRef<string>('');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Only scramble if the text actually changed
    if (prevTextRef.current === text) {
      el.textContent = text;
      return;
    }
    prevTextRef.current = text;

    if (!text) {
      el.textContent = '';
      return;
    }

    const targetText = text;
    const totalLength = targetText.length;
    let frame = 0;
    const maxFrames = Math.min(10, Math.max(6, Math.floor(totalLength / 3)));
    let lastTime = performance.now();

    const animate = (now: number) => {
      if (now - lastTime >= scrambleSpeedMs) {
        lastTime = now;
        frame++;

        const revealedCount = Math.min(totalLength, Math.ceil((frame / maxFrames) * totalLength));

        let result = '';
        for (let i = 0; i < totalLength; i++) {
          if (targetText[i] === ' ') {
            result += ' ';
          } else if (i < revealedCount) {
            result += targetText[i];
          } else {
            const randomGlyph = ALIEN_GLYPHS[Math.floor(Math.random() * ALIEN_GLYPHS.length)];
            result += randomGlyph;
          }
        }

        if (containerRef.current) {
          containerRef.current.textContent = result;
        }

        if (frame < maxFrames) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else if (containerRef.current) {
          containerRef.current.textContent = targetText;
        }
      } else {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [text, scrambleSpeedMs]);

  return (
    <Component
      ref={containerRef}
      className={className}
      style={style}
      title={title || text}
    >
      {text}
    </Component>
  );
};
