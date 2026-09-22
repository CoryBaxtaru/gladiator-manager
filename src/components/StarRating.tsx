interface StarRatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
}

const STAR_GLYPH = "★";

/**
 * Renders a partial-fill star row: a dim background row of empty stars with a gold
 * foreground row clipped to a percentage width. This gives a real half- (or any
 * fractional-) star fill via CSS rather than a unicode half-star character, which
 * doesn't exist as a single clean glyph and rendered as a stray "1/2" mark before.
 */
export function StarRating({ value, max = 5, size = "md", label }: StarRatingProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const percent = max > 0 ? (clamped / max) * 100 : 0;
  const glyphs = STAR_GLYPH.repeat(Math.max(0, max));

  return (
    <span
      className={`star-rating star-rating-${size}`}
      role="img"
      aria-label={label ?? `${clamped} out of ${max} stars`}
    >
      <span className="star-rating-empty">{glyphs}</span>
      <span className="star-rating-filled" style={{ width: `${percent}%` }}>
        {glyphs}
      </span>
    </span>
  );
}
