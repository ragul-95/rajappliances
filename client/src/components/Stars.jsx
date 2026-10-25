// Same star icons as the original generateStars() helper.
export default function Stars({ rating = 0 }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => {
        if (i < full) return <i key={i} className="fas fa-star"></i>;
        if (i === full && half) return <i key={i} className="fas fa-star-half-alt"></i>;
        return <i key={i} className="far fa-star"></i>;
      })}
    </>
  );
}
