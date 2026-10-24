import { Request, Response } from 'express';
import { AssistantService as service } from '../services/assistant.service.js';
import { withDbTransaction } from '../repositories/db.js';
const user = (req: Request) => (req as any).currentUser.id as string;
const token = (req: Request) => req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
function handle(req: Request, res: Response, action: () => unknown) {
  try { return res.json(req.method === 'GET' ? action() : withDbTransaction(action)); }
  catch (error: any) { return res.status(error.status || 400).json({ error: error.errors?.[0]?.message || error.message }); }
}
export const AssistantController = {
  connect: (req: Request, res: Response) => handle(req, res, () => service.connect(req.body)),
  poll: (req: Request, res: Response) => handle(req, res, () => service.poll(token(req))),
  result: (req: Request, res: Response) => handle(req, res, () => service.result(token(req), req.body)),
  status: (req: Request, res: Response) => handle(req, res, () => service.status(user(req))),
  tasks: (req: Request, res: Response) => handle(req, res, () => service.tasks(user(req))),
  pair: (req: Request, res: Response) => handle(req, res, () => service.createPairing(user(req))),
  submit: (req: Request, res: Response) => handle(req, res, () => service.submit(user(req), req.body)),
  apply: (req: Request, res: Response) => handle(req, res, () => service.apply(user(req), req.params.id)),
  cancel: (req: Request, res: Response) => handle(req, res, () => service.cancel(user(req), req.params.id)),
  revoke: (req: Request, res: Response) => handle(req, res, () => service.revoke(user(req), req.params.id)),
  resolve: (req: Request, res: Response) => handle(req, res, () => service.resolveTask(user(req), req.params.id)),
};
