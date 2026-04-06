import { Router } from 'express';
import { validateBody } from '../middlewares/validation.js';
import { verifyFirebaseToken } from '../middlewares/auth.js';
import { EMRSchema } from '../validations/emr.js';
import { enqueueEMRJob, getEMRJobStatus } from '../controllers/emr.controller.js';

export const emrRouter = Router();

emrRouter.post('/post', verifyFirebaseToken, validateBody(EMRSchema), enqueueEMRJob);
emrRouter.get('/job/:jobId', verifyFirebaseToken, getEMRJobStatus);
