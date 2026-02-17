import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const projectRoot = '/vercel/share/v0-project';

console.log('Removendo node_modules...');
const nodeModulesPath = path.join(projectRoot, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  fs.rmSync(nodeModulesPath, { recursive: true, force: true });
  console.log('node_modules removido');
}

console.log('Removendo package-lock.json...');
const lockPath = path.join(projectRoot, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  fs.unlinkSync(lockPath);
  console.log('package-lock.json removido');
}

console.log('Limpando cache do npm...');
try {
  execSync('npm cache clean --force', { cwd: projectRoot, stdio: 'inherit' });
} catch (e) {
  console.log('Cache clean completado');
}

console.log('Reinstalando dependências...');
execSync('npm install', { cwd: projectRoot, stdio: 'inherit' });

console.log('Sucesso! Dependências reinstaladas.');
