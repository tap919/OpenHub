import { glob as globSync } from 'fs/promises';
import { readFile, writeFile } from 'fs/promises';

export interface CleanResult {
  filesProcessed: number;
  changes: Record<string, string[]>;
}

const CLEAN_PATTERNS = [
  { name: 'console', regex: /console\.(log|debug|info|warn)\s*\([^)]*\);?/g },
  { name: 'debugger', regex: /debugger;?/g },
  { name: 'ts-expect', regex: /\/\/\s*@ts-expect-error[\s\S]*?\/\/\s*@ts-ignore/g },
  { name: 'commented', regex: /\/\/[^\n]*\n\s*(?:const|let|var|function|class|if|for|while|return)\s*\(/g },
];

export class Desloppify {
  async run(rootDir: string): Promise<CleanResult> {
    const files = await this.findFiles(rootDir);
    const changes: Record<string, string[]> = {};
    let count = 0;

    for (const file of files) {
      const fileChanges = await this.cleanFile(file);
      if (fileChanges.length > 0) {
        changes[file] = fileChanges;
        count++;
      }
    }

    return { filesProcessed: count, changes };
  }

  private async findFiles(dir: string): Promise<string[]> {
    let files: string[] = [];
    const patterns = ['*.ts', '*.tsx', '*.js', '*.jsx'];

    for (const p of patterns) {
      const matches = await globSync(p, { cwd: dir });
      for await (const f of matches) {
        if (!f.includes('node_modules') && !f.includes('dist')) {
          files.push(f);
        }
      }
    }

    return files;
  }

  private async cleanFile(filePath: string): Promise<string[]> {
    const changes: string[] = [];
    let content = await readFile(filePath, 'utf-8');
    const original = content;

    for (const { name, regex } of CLEAN_PATTERNS) {
      if (regex.test(content)) {
        content = content.replace(regex, '');
        changes.push(`removed ${name}`);
      }
    }

    if (content !== original) {
      await writeFile(filePath, content, 'utf-8');
    }

    return changes;
  }
}