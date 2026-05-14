import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const REPOS_ROOT = path.join(
  process.env.USERPROFILE || process.env.HOME || 'C:/Users/User',
  'Documents', 'openhub', 'repos'
);

export default async function globalSetup(): Promise<void> {
  for (const file of ['openhub.db', 'openhub.db-shm', 'openhub.db-wal']) {
    const p = path.join(DATA_DIR, file);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); }
      catch (err: any) {
        console.warn(`[globalSetup] Could not delete ${file}: ${err.message}`);
      }
    }
  }

  const sharedRepoDir = path.join(REPOS_ROOT, 'e2eshared');
  if (fs.existsSync(sharedRepoDir)) {
    try {
      fs.rmSync(sharedRepoDir, { recursive: true, force: true });
    } catch (err: any) {
      console.warn(`[globalSetup] Could not clean shared repo dir: ${err.message}`);
    }
  }
}
