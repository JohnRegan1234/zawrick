/** @jest-environment node */

const puppeteer = require('puppeteer');
const http = require('http');
const serveStatic = require('serve-static');
const finalhandler = require('finalhandler');
const path = require('path');

// Prepare two static servers: one for `ui` folder (serving HTML and CSS/icons), one for project root (serving scripts)
const projectRoot = path.join(__dirname, '../../');
const uiRoot = path.join(projectRoot, 'ui');
const serveUI = serveStatic(uiRoot);
const serveProject = serveStatic(projectRoot);
let server;
let browser;

beforeAll(done => {
  server = http.createServer((req, res) => {
    // Try UI folder first, then project root
    serveUI(req, res, () => {
      serveProject(req, res, finalhandler(req, res));
    });
  }).listen(0, () => done());
});

afterAll(async () => {
  await browser.close();
  server.close();
});

test('options.html loads without module script errors and UI functions work', async () => {
  const port = server.address().port;
  browser = await puppeteer.launch();
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Mock Chrome extension API before the page scripts run
  await page.evaluateOnNewDocument(() => {
    window.chrome = {
      storage: {
        local: {
          get: (keys, callback) => {
            const mockData = {
              deckName: 'Default',
              modelName: 'Basic',
              gptEnabled: false,
              openaiKey: '',
              confirmGpt: false,
              alwaysConfirm: true,
              prompts: [{
                id: 'basic-default',
                label: 'Default Basic',
                template: 'Test template'
              }],
              selectedPrompt: 'basic-default',
              pendingClips: [],
              promptHistory: [],
              pendingReviewPdfCards: []
            };
            if (typeof callback === 'function') {
              callback(mockData);
            }
            return Promise.resolve(mockData);
          },
          set: (data, callback) => {
            if (typeof callback === 'function') {
              callback();
            }
            return Promise.resolve();
          }
        }
      },
      runtime: {
        sendMessage: () => Promise.resolve({ success: true })
      }
    };
  });

  await page.goto(`http://localhost:${port}/ui/options.html`, { waitUntil: 'networkidle0' });

  // fail on any real script or runtime errors, but ignore benign resource 404s and expected network errors
  const criticalErrors = errors.filter(msg => {
    // ignore 404 resource errors and non-JS MIME blocks
    if (msg.startsWith('Failed to load resource')) return false;
    if (msg.includes('Refused to execute script') && msg.includes('MIME type')) return false;
    // ignore expected CORS and AnkiConnect errors in test environment
    if (msg.includes('CORS policy') || msg.includes('AnkiConnect action')) return false;
    return true;
  });
  expect(criticalErrors).toHaveLength(0);

  // test notification function exists and works
  const result = await page.evaluate(() => {
    if (typeof window.showUINotification !== 'function') return false;
    // invoke and check DOM
    const notif = document.getElementById('notification');
    window.showUINotification('e2e test', '', document);
    return notif.textContent === 'e2e test' && notif.classList.contains('show');
  });
  expect(result).toBe(true);
});

test('options page icon loads correctly', async () => {
  const page = await browser.newPage();
  
  // Track console errors and network requests
  const errors = [];
  const requests = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('request', req => requests.push(req.url()));
  
  // Navigate to options page
  await page.goto(`http://localhost:${server.address().port}/ui/options.html`);
  
  // Wait for the icon to load
  await page.waitForSelector('.header img');
  
  // Get the icon element
  const icon = await page.$('.header img');
  expect(icon).not.toBeNull();
  
  // Check the src attribute
  const src = await page.evaluate(el => el.src, icon);
  expect(src).toContain('/icons/icon64.png');
  
  // Check if the image loaded successfully
  const isLoaded = await page.evaluate(el => {
    return el.complete && el.naturalHeight !== 0;
  }, icon);
  expect(isLoaded).toBe(true);
  
  // Check for any 404 errors related to the icon
  const iconErrors = errors.filter(msg => 
    msg.includes('Failed to load resource') && 
    msg.includes('icon64.png')
  );
  expect(iconErrors).toHaveLength(0);
  
  await page.close();
});
