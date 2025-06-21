const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

// Define paths
const pagesApiPath = path.join(process.cwd(), 'pages', 'api');
const appApiPath = path.join(process.cwd(), 'app', 'api');

// Map to track duplicate routes
const routeMap = new Map();

async function scanDirectory(dir, baseRoute = '', isAppDir = false) {
  if (!await exists(dir)) {
    console.log(`Directory ${dir} does not exist, skipping`);
    return;
  }

  const files = await readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await stat(filePath);
    
    if (stats.isDirectory()) {
      // If this is a route directory in App Router
      const isRouteDir = isAppDir && fs.existsSync(path.join(filePath, 'route.js'));
      
      if (isRouteDir) {
        // This is a route.js file in App Router
        const routePath = baseRoute + '/' + file;
        addRoute(routePath, filePath, true);
      }
      
      // Recursively scan subdirectories
      await scanDirectory(
        filePath, 
        baseRoute + '/' + file, 
        isAppDir
      );
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      if (isAppDir && file === 'route.js') {
        // This is a route.js file in App Router
        addRoute(baseRoute, filePath, true);
      } else if (!isAppDir) {
        // This is a file in Pages Router
        const routeName = file.replace(/\.(js|ts)x?$/, '');
        const routePath = baseRoute + '/' + (routeName === 'index' ? '' : routeName);
        addRoute(routePath, filePath, false);
      }
    }
  }
}

function addRoute(routePath, filePath, isAppDir) {
  routePath = routePath.replace(/\/+/g, '/');
  
  if (!routeMap.has(routePath)) {
    routeMap.set(routePath, { appRouter: null, pagesRouter: null });
  }
  
  const route = routeMap.get(routePath);
  
  if (isAppDir) {
    route.appRouter = filePath;
  } else {
    route.pagesRouter = filePath;
  }
}

async function findDuplicateRoutes() {
  await scanDirectory(pagesApiPath, '/api', false);
  await scanDirectory(appApiPath, '/api', true);
  
  const duplicates = [];
  
  for (const [routePath, routes] of routeMap.entries()) {
    if (routes.appRouter && routes.pagesRouter) {
      duplicates.push({
        route: routePath,
        appRouterPath: routes.appRouter,
        pagesRouterPath: routes.pagesRouter
      });
    }
  }
  
  return duplicates;
}

async function backupAndMove(filePath) {
  if (!await exists(filePath)) {
    console.log(`File ${filePath} does not exist, skipping`);
    return;
  }
  
  const backupPath = filePath + '.bak';
  const content = await readFile(filePath, 'utf8');
  
  // Create backup
  await writeFile(backupPath, content);
  console.log(`Backup created: ${backupPath}`);
  
  // Delete original
  await unlink(filePath);
  console.log(`Removed: ${filePath}`);
}

async function main() {
  console.log('Scanning for duplicate API routes...');
  const duplicates = await findDuplicateRoutes();
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate routes found. Your app is ready for Vercel deployment!');
    return;
  }
  
  console.log(`Found ${duplicates.length} duplicate routes:`);
  
  for (const dup of duplicates) {
    console.log(`\nRoute: ${dup.route}`);
    console.log(`  App Router:   ${dup.appRouterPath}`);
    console.log(`  Pages Router: ${dup.pagesRouterPath}`);
  }
  
  if (process.argv.includes('--fix')) {
    console.log('\nFixing duplicate routes by removing Pages Router versions...');
    
    for (const dup of duplicates) {
      await backupAndMove(dup.pagesRouterPath);
    }
    
    console.log('\n✅ Duplicate routes fixed! Backups were created with .bak extension.');
    console.log('The app should now be ready for Vercel deployment.');
  } else {
    console.log('\nTo automatically fix these issues, run:');
    console.log('node scripts/fix-duplicate-routes.js --fix');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 
