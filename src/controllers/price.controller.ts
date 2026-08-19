import { Request, Response } from 'express';
import { getAllPrices, updatePriceValue } from '../services/price.service';
import { ok } from '../utils/response';
import { parseInput } from '../utils/validate';
import { updatePriceSchema } from '../validators/price.validator';

export async function listPrices(_req: Request, res: Response): Promise<void> {
  const prices = await getAllPrices();
  ok(res, prices);
}

export async function updatePrice(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const input = parseInput(updatePriceSchema, req.body);
  const price = await updatePriceValue(req.user!.id, id, input.price);
  ok(res, price);
}