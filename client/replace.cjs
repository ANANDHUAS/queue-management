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
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the specific IP with localhost as default
  content = content.replace(/http:\/\/10\.249\.233\.102:3001/g, 'http://localhost:3001');
  content = content.replace(/http:\/\/10\.249\.233\.102:5173/g, 'http://localhost:5173');

  // Replace literal string fetches with env variables
  // E.g. fetch("http://localhost:3001/api/...") -> fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/...`)
  content = content.replace(/"http:\/\/localhost:3001\/api(.*?)"/g, '`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}$1`');
  content = content.replace(/`http:\/\/localhost:3001\/api(.*?)`/g, '`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}$1`');
  
  // Replace Socket URL
  content = content.replace(/"http:\/\/localhost:3001"/g, 'import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"');

  fs.writeFileSync(file, content);
});

console.log("Replaced all hardcoded URLs!");
