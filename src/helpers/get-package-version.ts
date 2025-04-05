import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const getPackageVersion = (): string => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Navigate to the package.json file
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    
    // Read and parse the package.json file
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    return packageJson.version || 'unknown';
  } catch (error) {
    console.error('Error reading package version:', error);
    return 'unknown';
  }
};
