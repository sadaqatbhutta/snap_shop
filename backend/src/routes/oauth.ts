import { Router } from 'express';
import { verifyFirebaseToken, verifyBusinessAccess, requireAdmin } from '../middlewares/auth.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { buildMetaOAuthUrl, exchangeMetaCode, isMetaOAuthConfigured, parseOAuthState } from '../services/metaOAuth.service.js';
import { config } from '../config/config.js';
import { buildError } from '../utils/errors.js';

export const oauthRouter = Router();

oauthRouter.get('/meta/status', (_req, res) => {
  res.json({ configured: isMetaOAuthConfigured() });
});

oauthRouter.get(
  '/meta/start',
  verifyFirebaseToken,
  verifyBusinessAccess,
  requireAdmin,
  (req, res, next) => {
    try {
      const businessId = String(req.query.businessId || '');
      const user = (req as AuthenticatedRequest).user!;
      const url = buildMetaOAuthUrl(businessId, user.uid);
      res.json({ url });
    } catch (err) {
      next(err);
    }
  }
);

oauthRouter.get('/meta/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const err = req.query.error;
    if (err) {
      return res.redirect(`${config.APP_URL}/settings?oauth=error&reason=${encodeURIComponent(String(err))}`);
    }
    if (!code || !state) throw buildError('BAD_REQUEST', 'Missing code or state', 400);

    const { businessId, uid } = parseOAuthState(state);
    await exchangeMetaCode(code, businessId, uid);
    return res.redirect(`${config.APP_URL}/settings?oauth=success&businessId=${encodeURIComponent(businessId)}`);
  } catch (e: any) {
    const reason = encodeURIComponent(e?.message || 'oauth_failed');
    return res.redirect(`${config.APP_URL}/settings?oauth=error&reason=${reason}`);
  }
});
