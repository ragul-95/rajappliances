// One or more badges, stacked top-left. A single badge looks exactly like the
// original .product-badge; extra.css only adds the stacking wrapper.
export default function Badges({ badges }) {
  if (!badges || badges.length === 0) return null;
  return (
    <div className="product-badges">
      {badges.map((b) => (
        <div key={b} className="product-badge">
          {b}
        </div>
      ))}
    </div>
  );
}
