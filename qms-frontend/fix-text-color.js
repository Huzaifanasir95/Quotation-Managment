const fs = require('fs');
const path = require('path');

// Function to recursively find all .tsx files
function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.next') {
      findTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to fix text color in a file
function fixTextColorInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern to match form input classes without text-black
  const patterns = [
    // Input fields
    /className="([^"]*px-[^"]*py-[^"]*border[^"]*rounded[^"]*)"(?![^>]*text-black)/g,
    // Select fields
    /className="([^"]*w-full[^"]*px-[^"]*py-[^"]*border[^"]*)"(?![^>]*text-black)/g,
    // Textarea fields
    /className="([^"]*w-full[^"]*px-[^"]*py-[^"]*border[^"]*rounded[^"]*)"(?![^>]*text-black)/g
  ];
  
  patterns.forEach(pattern => {
    content = content.replace(pattern, (match, className) => {
      if (!className.includes('text-black') && !className.includes('text-white') && !className.includes('text-gray-') && !className.includes('text-red-') && !className.includes('text-blue-') && !className.includes('text-green-') && !className.includes('text-purple-') && !className.includes('text-yellow-') && !className.includes('text-orange-')) {
        modified = true;
        // Insert text-black after the first space or at the beginning
        const parts = className.split(' ');
        parts.splice(1, 0, 'text-black');
        return `className="${parts.join(' ')}"`;
      }
      return match;
    });
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  return false;
}

// Main execution
const appDir = './app';
const tsxFiles = findTsxFiles(appDir);
let totalFixed = 0;

console.log(`Found ${tsxFiles.length} .tsx files`);

tsxFiles.forEach(file => {
  if (fixTextColorInFile(file)) {
    totalFixed++;
  }
});

console.log(`Fixed text color in ${totalFixed} files`);
