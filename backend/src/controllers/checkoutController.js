import { config } from '../config/env.js';

export async function simulatePayment(req, res) {
  // Simple guard to mimic minimal validation before accepting a payment attempt
  const totalValue = Number(req.body?.total ?? 0);
  if (Number.isNaN(totalValue) || totalValue < 0) {
    return res.status(400).json({ message: 'A valid total is required to simulate payment.' });
  }

  // Simulate latency to feel closer to a real payment interaction
  await new Promise((resolve) => setTimeout(resolve, config.allowAllClients ? 200 : 0));

  return res.json({ paymentStatus: 'success' });
}
