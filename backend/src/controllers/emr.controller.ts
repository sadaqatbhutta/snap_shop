import { Request, Response, NextFunction } from 'express';
import { enqueueEMRRequest, getEMRJobStatusById } from '../services/emr.service.js';
import { buildError } from '../utils/errors.js';

export async function enqueueEMRJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { path, payload } = req.body;
    const job = await enqueueEMRRequest(path, payload, (req as any).requestId);
    return res.status(202).json({ status: 'queued', job_id: job.id });
  } catch (err) {
    next(err);
  }
}

export async function getEMRJobStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const status = await getEMRJobStatusById(req.params.jobId);
    if (!status) {
      throw buildError('JOB_NOT_FOUND', 'Job not found', 404);
    }
    return res.json(status);
  } catch (err) {
    next(err);
  }
}
