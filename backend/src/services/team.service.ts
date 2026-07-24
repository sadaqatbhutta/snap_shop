import crypto from 'crypto';
import { db } from '../config/firebase.js';
import { config } from '../config/config.js';
import { buildError } from '../utils/errors.js';
import { recordAuditEvent } from './audit.service.js';
import { sendEmail, isEmailConfigured } from './email.service.js';
import { assertAgentSeatAvailable } from './usage.service.js';

interface InvitePayload {
  businessId: string;
  email: string;
  role: 'admin' | 'agent';
}

export async function inviteAgentToTeam(payload: InvitePayload, requestId: string, user: any) {
  if (!user?.email) {
    throw buildError('UNAUTHORIZED', 'Authenticated user email is required', 401);
  }

  const businessRef = db.doc(`businesses/${payload.businessId}`);
  const businessSnap = await businessRef.get();
  if (!businessSnap.exists) {
    throw buildError('BUSINESS_NOT_FOUND', 'Business does not exist', 404);
  }

  const business = businessSnap.data();
  if (business?.ownerEmail !== user.email) {
    throw buildError('FORBIDDEN', 'Only the business owner may invite team members', 403);
  }

  await assertAgentSeatAvailable(payload.businessId);

  const token = crypto.randomBytes(32).toString('hex');
  const inviteRef = businessRef.collection('invites').doc(token);
  const inviteData = {
    email: payload.email,
    role: payload.role,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    used: false,
    requestId,
  };

  await inviteRef.set(inviteData);
  if (user?.uid) {
    await recordAuditEvent({
      businessId: payload.businessId,
      actorUid: user.uid,
      action: 'team.invite_created',
      meta: { role: payload.role },
    });
  }
  const inviteUrl = `${config.APP_URL}/join?token=${token}`;
  const businessName = business?.name || 'your team';

  const emailSent = await sendEmail({
    to: payload.email,
    subject: `Invitation to join ${businessName} on SnapShop`,
    text: `You have been invited to join ${businessName} on SnapShop AI.\n\nAccept the invite: ${inviteUrl}\n\nThis link expires in 24 hours.`,
    html: `<p>You have been invited to join <strong>${businessName}</strong> on SnapShop AI.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This link expires in 24 hours.</p>`,
  });

  return {
    inviteUrl,
    token,
    emailSent,
    emailConfigured: isEmailConfigured(),
    warning: emailSent ? undefined : 'SMTP is not configured. Share inviteUrl manually.',
  };
}

export async function acceptInviteToken(token: string, user: any) {
  if (!user?.uid || !user?.email) {
    throw buildError('UNAUTHORIZED', 'Authenticated user is required', 401);
  }

  const inviteQuery = await db.collectionGroup('invites').where('__name__', '==', token).limit(1).get();
  if (inviteQuery.empty) {
    throw buildError('INVALID_TOKEN', 'Invalid or expired invitation token', 404);
  }

  const inviteDoc = inviteQuery.docs[0];
  const inviteData = inviteDoc.data();
  if (inviteData.used) {
    throw buildError('INVITE_USED', 'Invitation token has already been used', 400);
  }
  if (new Date(inviteData.expiresAt) < new Date()) {
    throw buildError('INVITE_EXPIRED', 'Invitation token has expired', 400);
  }

  const businessId = inviteDoc.ref.parent.parent?.id;
  if (!businessId) {
    throw buildError('INVALID_STATE', 'Could not resolve invitation business', 500);
  }

  await inviteDoc.ref.update({ used: true, usedBy: user.uid, usedAt: new Date().toISOString() });
  await db.doc(`businesses/${businessId}/agents/${user.uid}`).set({
    name: user.name || 'Agent',
    email: user.email,
    role: inviteData.role,
    joinedAt: new Date().toISOString(),
    businessId,
  });

  return { status: 'success', businessId };
}

export async function revokeInviteToken(token: string, user: any) {
  if (!user?.email) {
    throw buildError('UNAUTHORIZED', 'Authenticated user email is required', 401);
  }

  const inviteQuery = await db.collectionGroup('invites').where('__name__', '==', token).limit(1).get();
  if (inviteQuery.empty) {
    throw buildError('INVALID_TOKEN', 'Invalid invitation token', 404);
  }

  const inviteDoc = inviteQuery.docs[0];
  const businessId = inviteDoc.ref.parent.parent?.id;
  if (!businessId) {
    throw buildError('INVALID_STATE', 'Could not resolve invitation business', 500);
  }

  // Verify user is business owner
  const businessSnap = await db.doc(`businesses/${businessId}`).get();
  if (!businessSnap.exists) {
    throw buildError('BUSINESS_NOT_FOUND', 'Business does not exist', 404);
  }

  const business = businessSnap.data();
  if (business?.ownerEmail !== user.email) {
    throw buildError('FORBIDDEN', 'Only the business owner may revoke invitations', 403);
  }

  // Delete the invite
  await inviteDoc.ref.delete();

  return { status: 'revoked', token };
}