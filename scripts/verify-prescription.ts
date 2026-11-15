import { loadEnvConfig } from '@next/env';
import fs from 'fs';

async function main() {
  loadEnvConfig(process.cwd());
  const { scheduleWithGemini } = await import('../src/lib/services/prescription.service');
  const result = await scheduleWithGemini(fs.readFileSync('public/demo-prescription.png').toString('base64'), 'image/png', {
    name: 'Demo Patient', timezone: 'Asia/Kolkata', today: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
  });
  if (result.medications.length !== 2) throw new Error('Expected both sample medications to be extracted.');
  console.log(JSON.stringify({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', medications: result.medications.map((m) => ({ name: m.name, dosage: m.dosage, times: m.scheduledTimes })), warnings: result.warnings }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : 'Gemini verification failed.'); process.exitCode = 1; });
