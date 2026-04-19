const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./app');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes("['ADMIN','IT_MANAGER'].includes")) {
    content = content.replace(/\['ADMIN','IT_MANAGER'\]\.includes/g, "['SUPER_ADMIN','ADMIN','IT_MANAGER'].includes");
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  }
});
