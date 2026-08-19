import { SafeUser } from './entities';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export {};
