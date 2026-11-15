import { beforeEach } from 'vitest';
import { dbService } from '../db/database';

beforeEach(() => {
  // Tests use an isolated temp store and never mutate the user's patient data.
  const fixture = dbService.createSeedData();
  Object.assign(dbService.getDb(), fixture);
  dbService.save();
});
