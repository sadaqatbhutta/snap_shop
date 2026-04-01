import { processWebhookJob } from './services/webhook_service';

async function runTest() {
  console.log('Dispatched test job to webhook_service...');
  try {
    const result = await processWebhookJob('whatsapp', {
      business_id: 'test-business',
      user_id: '+923011284483',
      message: 'Hello, what are your opening hours?',
      type: 'text',
      name: 'Test Sender'
    });
    console.log('✅ processWebhookJob returned:');
    console.dir(result, { depth: null, colors: true });
  } catch (err) {
    console.error('❌ Failed:', err);
  }
}

runTest();
