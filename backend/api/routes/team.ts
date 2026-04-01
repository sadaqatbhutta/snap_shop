import { Router } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../../core/config';
import crypto from 'crypto';
import axios from 'axios';

export const teamRouter = Router();
const db = getFirestore();

/**
 * POST /api/team/invite
 * Invite a new member to the team.
 */
teamRouter.post('/invite', async (req, res, next) => {
  try {
    const { businessId, email, role } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authentication' });
    }

    const idToken = authHeader.split(' ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const callerEmail = decodedToken.email;

    // 1. Verify caller is business owner
    const businessDoc = await db.doc(`businesses/${businessId}`).get();
    if (!businessDoc.exists) return res.status(404).json({ message: 'Business not found' });
    
    const businessData = businessDoc.data();
    if (businessData?.ownerEmail !== callerEmail) {
      return res.status(403).json({ message: 'Only the business owner can invite teammates' });
    }

    // 2. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const inviteRef = db.doc(`businesses/${businessId}/invites/${token}`);
    
    const inviteData = {
      email,
      role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      used: false
    };

    await inviteRef.set(inviteData);

    // 3. Send email (mock transactional call)
    const inviteUrl = `${config.APP_URL}/join?token=${token}`;
    
    try {
      await axios.post(config.SMTP_API_URL, {
        to: email,
        subject: `Join ${businessData?.name || 'our team'} on SnapShop AI`,
        content: `You've been invited as an ${role}. Join here: ${inviteUrl}`,
      });
    } catch (err) {
      console.warn('Failed to send invite email (SMTP_API_URL placeholder):', err);
    }

    res.json({ inviteUrl, token });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/team/accept
 * Accept an invitation.
 */
teamRouter.post('/accept', async (req, res, next) => {
  try {
    const { token } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authentication' });
    }

    const idToken = authHeader.split(' ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    // 1. Find invite across all businesses
    const inviteQuery = await db.collectionGroup('invites').where('__name__', '==', token).get();
    
    if (inviteQuery.empty) {
      return res.status(404).json({ message: 'Invalid or expired invitation token' });
    }

    const inviteDoc = inviteQuery.docs[0];
    const inviteData = inviteDoc.data();
    const businessId = inviteDoc.ref.parent.parent?.id;

    if (!businessId) throw new Error('Could not resolve businessId from invite path');

    // 2. Validate
    if (inviteData.used) return res.status(400).json({ message: 'This invitation has already been used' });
    if (new Date(inviteData.expiresAt) < new Date()) return res.status(400).json({ message: 'This invitation has expired' });
    
    // 3. Create agent record
    await db.doc(`businesses/${businessId}/agents/${uid}`).set({
      name: name || 'Agent',
      email: email,
      role: inviteData.role,
      joinedAt: new Date().toISOString()
    });

    // 4. Mark used
    await inviteDoc.ref.update({ used: true, usedBy: uid });

    res.json({ status: 'success', businessId });
  } catch (err) {
    next(err);
  }
});
