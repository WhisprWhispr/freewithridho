const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

console.log('Checking for duplicates and case sensitivity...');
const files = walk('./src');

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');

  // Check duplicate lucide-react or other module imports within the SAME import { ... } statement
  const importRegex = /import\s+{([^}]+)}\s+from\s+['\"]([^'\"]+)['\"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1].split(',').map(i => i.trim().split(' as ')[0].trim()).filter(i => i);
    const duplicates = imports.filter((item, index) => imports.indexOf(item) !== index);
    if (duplicates.length > 0) {
      console.log('Duplicate import found in', f, ':', duplicates);
    }
  }
  
  // Check duplicate import across different import statements in the same file
  // e.g., import { A } from 'x'; import { A, B } from 'x';
  const allImports = [];
  let match2;
  const importRegexAll = /import\s+{([^}]+)}\s+from\s+['\"]([^'\"]+)['\"]/g;
  while ((match2 = importRegexAll.exec(content)) !== null) {
      const moduleName = match2[2];
      const imports = match2[1].split(',').map(i => {
          let specifier = i.trim().split(' as ')[0].trim();
          return { specifier, module: moduleName };
      }).filter(i => i.specifier);
      
      imports.forEach(imp => {
          if (allImports.some(x => x.specifier === imp.specifier && x.module === imp.module)) {
             console.log('Duplicate cross-import found in', f, 'for', imp.specifier, 'from', imp.module);
          }
          allImports.push(imp);
      });
  }

  // Check case sensitivity of relative paths
  const relativeImportRegex = /import\s+.*?from\s+['\"](\.[^'\"]+)['\"]/g;
  let match3;
  while ((match3 = relativeImportRegex.exec(content)) !== null) {
    const importPath = match3[1];
    if (importPath.endsWith('.css') || importPath.endsWith('.png') || importPath.endsWith('.jpg') || importPath.endsWith('.svg')) continue;
    
    // Attempt to resolve file
    const dir = path.dirname(f);
    let target = path.resolve(dir, importPath);
    if (!target.endsWith('.js') && !target.endsWith('.jsx')) {
        if (fs.existsSync(target + '.jsx')) {
            target = target + '.jsx';
        } else if (fs.existsSync(target + '.js')) {
            target = target + '.js';
        }
    }
    
    if (fs.existsSync(target)) {
        const actualName = path.basename(target);
        const importedName = path.basename(importPath);
        // check case only for basename for simplicity
        if (actualName.toLowerCase() === importedName.toLowerCase() && actualName.split('.')[0] !== importedName.split('.')[0]) {
           console.log('Case mismatch found in', f, '-> imported as:', importPath, 'actual:', actualName);
        }
    } else {
        console.log('Broken import found in', f, '->', importPath);
    }
  }
});
console.log('Done.');
