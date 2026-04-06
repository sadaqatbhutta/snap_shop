import { Request, Response, NextFunction } from 'express';
import { inviteAgentToTeam, acceptInviteToken } from '../services/team.service.js';

export async function inviteTeamMember(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inviteAgentToTeam(req.body, (req as any).requestId, (req as any).user);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function acceptTeamInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await acceptInviteToken(req.body.token, (req as any).user);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
