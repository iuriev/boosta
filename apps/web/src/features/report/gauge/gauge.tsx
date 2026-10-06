import styles from './gauge.module.css';

/*
 * The gauge from the design (Figma node 1:641), redrawn as inline SVG because
 * its needle has to follow the score. Arc, segment and separator geometry are
 * the design's own paths; only the needle is positioned here.
 */

const CENTER_X = 120.33;
const CENTER_Y = 113.97;
/** Where the arc starts (score 0) and how far it sweeps to its end (score 100), in degrees. */
const START_ANGLE = 138.8;
const SWEEP = 262.4;
/** The direction the needle points in the design's own path, and the pivot it was drawn around. */
const NEEDLE_DRAWN_ANGLE = 152.8;
const NEEDLE_PIVOT_X = 122.3;
const NEEDLE_PIVOT_Y = 109.9;

export function Gauge({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const angle = START_ANGLE + (SWEEP * clamped) / 100;
  const needleTransform = [
    `rotate(${String(angle - NEEDLE_DRAWN_ANGLE)} ${String(CENTER_X)} ${String(CENTER_Y)})`,
    `translate(${String(CENTER_X - NEEDLE_PIVOT_X)} ${String(CENTER_Y - NEEDLE_PIVOT_Y)})`,
  ].join(' ');

  return (
    <figure className={styles.gauge}>
      <svg
        className={styles.dial}
        viewBox="0 0 240.681 193.595"
        // The caption below carries the value; the drawing only illustrates it.
        aria-hidden="true"
      >
        <g fill="none" strokeWidth="21.8353" strokeLinecap="round">
          <path
            className={styles.track}
            d="M41.82 182.67C25.15 164.44 15.01 140.36 15.01 113.97C15.01 57.05 62.16 10.91 120.33 10.91C178.5 10.91 225.65 57.05 225.65 113.97C225.65 140.36 215.51 164.44 198.84 182.67"
          />
          <path
            className={styles.segment1}
            d="M41.82 182.67C25.15 164.44 15.01 140.36 15.01 113.97C15.01 108.21 15.49 102.55 16.42 97.05"
          />
          <path
            className={styles.segment5}
            d="M199.05 182.67C215.73 164.44 225.87 140.36 225.87 113.97C225.87 108.21 225.39 102.55 224.46 97.05"
          />
          <path
            className={styles.segment3}
            d="M75.4 20.73C89.03 14.44 104.26 10.91 120.34 10.91C136.41 10.91 151.64 14.44 165.27 20.73"
          />
        </g>
        <path
          className={styles.segment2}
          d="M7.65 85.49L4.91 96.06L26.05 101.53L28.79 90.96L18.22 88.22L7.65 85.49ZM18.22 88.22L28.79 90.96C34.74 67.93 49.62 48.27 69.73 35.78L63.97 26.5L58.22 17.23C33.52 32.56 15.06 56.82 7.65 85.49L18.22 88.22ZM63.97 26.5L69.73 35.78C72.88 33.83 76.15 32.05 79.53 30.47L74.9 20.58L70.27 10.7C66.11 12.64 62.08 14.83 58.22 17.23L63.97 26.5Z"
        />
        <path
          className={styles.segment4}
          d="M232.53 85.49L235.27 96.06L214.13 101.53L211.39 90.96L221.96 88.22L232.53 85.49ZM221.96 88.22L211.39 90.96C205.44 67.93 190.56 48.27 170.45 35.78L176.21 26.5L181.96 17.23C206.66 32.56 225.12 56.82 232.53 85.49L221.96 88.22ZM176.21 26.5L170.45 35.78C167.3 33.83 164.03 32.05 160.65 30.47L165.28 20.58L169.91 10.7C174.07 12.64 178.1 14.83 181.96 17.23L176.21 26.5Z"
        />
        <g className={styles.separators} strokeWidth="8.18825">
          <path d="M0.42 96.79L31.21 100.03" />
          <path d="M240.25 98.41L209.46 101.65" />
          <path d="M80.5 36.57L66.85 8.79" />
          <path d="M160.85 36.57L174.51 8.79" />
        </g>
        <path
          className={styles.needle}
          transform={needleTransform}
          d="M133.24 103.97C132.13 102.22 130.67 100.69 128.94 99.44C127.21 98.2 125.24 97.27 123.16 96.71C121.07 96.15 118.91 95.97 116.79 96.19C114.66 96.4 112.63 97 110.79 97.95L49.42 147.41L127.75 124.46C129.59 123.51 131.18 122.23 132.45 120.68C133.72 119.14 134.64 117.36 135.15 115.46C135.66 113.56 135.75 111.56 135.43 109.59C135.1 107.62 134.36 105.71 133.24 103.97Z"
        />
      </svg>
      <figcaption className={styles.value}>
        <span className="visually-hidden">Score: </span>
        {clamped} / 100
      </figcaption>
    </figure>
  );
}
