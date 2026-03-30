import { Router } from 'express';
import { z } from 'zod';
import { emrQueue, getJobStatus } from '../../core/queue';

export const emrRouter = Router();

const EMRSchema = z.object({
  path:    z.string().min(1, 'path is required'),
  payload: z.record(z.string(), z.unknown()),
});

/**
 * POST /api/emr/post
 *
 * Enqueues an EMR API call as a background job.
 * Returns immediately with a job_id for status tracking.
 */
emrRouter.post('/post', async (req, res, next) => {
  try {
    const { path, payload } = EMRSchema.parse(req.body);

    const job = await emrQueue.add(
      'emr-post',
      { path, payload, requestId: (req as any).requestId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: false,
      }
    );

    res.json({ status: 'queued', job_id: job.id });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/emr/job/:jobId
 *
 * Check the status of a queued EMR job (pending / active / completed / failed).
 */
emrRouter.get('/job/:jobId', async (req, res, next) => {
  try {
    const status = await getJobStatus(emrQueue, req.params.jobId);
    if (!status) return res.status(404).json({ status: 'error', code: 'JOB_NOT_FOUND', message: 'Job not found' });
    res.json(status);
  } catch (err) {
    next(err);
  }
});
