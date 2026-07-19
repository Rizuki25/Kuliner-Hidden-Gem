import { Star } from 'lucide-react'

type ReviewStarsProps = {
  value: number
  size?: number
  interactive?: boolean
  onChange?: (value: number) => void
}

export function ReviewStars({ value, size = 16, interactive = false, onChange }: ReviewStarsProps) {
  const stars = [1, 2, 3, 4, 5]

  if (interactive) {
    return (
      <div className="review-stars review-stars--input" role="radiogroup" aria-label="Pilih rating">
        {stars.map((star) => (
          <button
            className={star <= value ? 'is-selected' : ''}
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} dari 5 bintang`}
            onClick={() => onChange?.(star)}
          >
            <Star size={size} fill={star <= value ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    )
  }

  return (
    <span className="review-stars" aria-label={`Rating ${value} dari 5`}>
      {stars.map((star) => <Star key={star} size={size} fill={star <= value ? 'currentColor' : 'none'} />)}
    </span>
  )
}
