import { createAuditLog } from '../repositories/audit.repo';
import { getPriceById, listPrices, updatePrice } from '../repositories/price.repo';
import { PriceWithNames } from '../types/entities';
import { NotFoundError } from '../utils/errors';

export async function getAllPrices(): Promise<PriceWithNames[]> {
  return listPrices();
}

export async function updatePriceValue(
  actorId: number,
  id: number,
  price: number
): Promise<PriceWithNames> {
  const existing = await getPriceById(id);
  if (!existing) throw new NotFoundError('Tarif introuvable');

  await updatePrice(id, price);

  await createAuditLog(actorId, 'PRICE_UPDATE', 'price', id, {
    hammam_id: existing.hammam_id,
    hammam_name: existing.hammam_name,
    category_id: existing.category_id,
    category_name: existing.category_name,
    old_price: existing.price,
    new_price: price,
  });

  const updated = await getPriceById(id);
  if (!updated) throw new NotFoundError('Tarif introuvable');
  return updated;
}