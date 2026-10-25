export default function Footer() {
  return (
    <footer>
      <a
        href="#top"
        className="back-to-top"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        Back to top
      </a>
      <div className="footer-content">
        <div className="footer-logo">
          RajAppliences<span>.in</span>
        </div>
        <p>100% Purchase Protection | Pay on Delivery | Free Delivery on all orders</p>
      </div>
    </footer>
  );
}
