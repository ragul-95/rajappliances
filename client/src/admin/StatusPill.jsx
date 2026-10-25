const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-');

export default function StatusPill({ status }) {
  return <span className={`status-pill status-${slug(status)}`}>{status}</span>;
}
