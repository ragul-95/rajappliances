import { Counter } from '../models/Counter.js';

export async function generateOrderNumber() {
  const currentYear = new Date().getFullYear();
  const counterName = `orderNumber_${currentYear}`;

  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(6, '0');
  return `RA-${currentYear}-${paddedSeq}`;
}

export default generateOrderNumber;
