import { Router } from 'express';
import { validateBody } from '../middlewares/validation.js';
import { verifyFirebaseToken } from '../middlewares/auth.js';
import { InviteTeamSchema, AcceptInviteSchema } from '../validations/team.js';
import { inviteTeamMember, acceptTeamInvite } from '../controllers/team.controller.js';

export const teamRouter = Router();

teamRouter.post('/invite', verifyFirebaseToken, validateBody(InviteTeamSchema), inviteTeamMember);
teamRouter.post('/accept', verifyFirebaseToken, validateBody(AcceptInviteSchema), acceptTeamInvite);
