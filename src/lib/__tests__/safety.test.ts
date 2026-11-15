import { describe, it, expect } from 'vitest';
import { GeminiService } from '../services/gemini.service';

describe('GeminiService & Clinical Safety Intelligence', () => {
  it('detects severe and moderate drug/food interactions (Atorvastatin + Grapefruit, Lisinopril + Potassium)', async () => {
    const testMeds = [
      { name: 'Lisinopril', dosage: '10 mg', instructions: 'Daily morning' },
      { name: 'Atorvastatin', dosage: '20 mg', instructions: 'Bedtime' },
      { name: 'Metformin HCl', dosage: '500 mg', instructions: 'Twice daily with meals' },
      { name: 'Vitamin D3', dosage: '1000 IU', instructions: 'Lunch' }
    ];

    const interactions = await GeminiService.checkDrugInteractions(testMeds, ['Hypertension', 'Type 2 Diabetes'], ['Penicillin']);

    expect(interactions.length).toBeGreaterThan(0);

    const hasStatinInteraction = interactions.some(
      (i) => i.medicationA.toLowerCase().includes('atorvastatin') || i.medicationB.toLowerCase().includes('grapefruit')
    );
    expect(hasStatinInteraction).toBe(true);

    const hasAceInteraction = interactions.some(
      (i) => i.medicationA.toLowerCase().includes('lisinopril') || i.medicationB.toLowerCase().includes('potassium')
    );
    expect(hasAceInteraction).toBe(true);
  });

  it('generates warm, empathetic conversational responses for the senior companion', async () => {
    const checkin = await GeminiService.converseWithSenior('Good morning Amity, I took my morning pills and feel fine.', 'Eleanor Vance');

    expect(checkin.replyText).toBeDefined();
    expect(checkin.emotionalState).toBe('CONTENT');
    expect(checkin.urgencyLevel).toBe('LOW');
    expect(checkin.caregiverNote).toBeDefined();
  });

  it('detects concerning symptoms (dizziness) and escalates urgency with caregiver note', async () => {
    const checkin = await GeminiService.converseWithSenior('I feel very dizzy when standing up this morning.', 'Eleanor Vance');

    expect(checkin.replyText).toContain('sit down');
    expect(checkin.urgencyLevel).toBe('MEDIUM');
    expect(checkin.symptomsReported).toContain('dizziness / lightheadedness');
    expect(checkin.caregiverNote).toContain('dizzy');
  });

  it('produces structured doctor visit consultation questions', async () => {
    const questions = await GeminiService.generateDoctorVisitQuestions(
      'Cardiology',
      'Hypertension & Statin review',
      ['Lisinopril 10mg', 'Atorvastatin 20mg'],
      96
    );

    expect(questions.length).toBeGreaterThanOrEqual(2);
    for (const q of questions) {
      expect(typeof q).toBe('string');
      expect(q.length).toBeGreaterThan(10);
    }
  });
});
