import axios from 'axios';
import { emrQueue, getJobStatus, defaultJobOptions, EMRJobData } from '../queues/queue.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export async function enqueueEMRRequest(path: string, payload: unknown, requestId?: string) {
  const job = await emrQueue.add(
    'emr-post',
    { path, payload, requestId },
    defaultJobOptions
  );
  return job;
}

export async function getEMRJobStatusById(jobId: string) {
  return getJobStatus(emrQueue, jobId);
}

export async function postToEMR(path: string, payload: unknown) {
  const url = `${config.EMR_API_URL}${path}`;
  logger.info({ url, event: 'emr_call' }, 'Sending payload to EMR');

  const response = await axios.post(url, payload, {
    timeout: config.EMR_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      ...(config.EMR_API_KEY ? { Authorization: `Bearer ${config.EMR_API_KEY}` } : {}),
    },
  });

  return response.data;
}

export async function getEMRJobProcessor(data: EMRJobData) {
  return postToEMR(data.path, data.payload);
}
