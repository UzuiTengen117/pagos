const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:4200';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const CHROME_PATH = '/usr/bin/chromium';
const VIEWPORT = { width: 1440, height: 900 };
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function screenshot(page, name) {
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
  await delay(800);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage: false });
  console.log(`  [OK] ${name}`);
}

async function safeClick(page, selector, waitMs = 1500) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout: 8000 });
    await page.click(selector);
    await delay(waitMs);
    return true;
  } catch { return false; }
}

async function loginAs(page, user, pass) {
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#username', { visible: true, timeout: 15000 });
  await page.waitForSelector('button[type="submit"]', { visible: true, timeout: 5000 });
  await delay(500);
  await page.type('#username', user, { delay: 30 });
  await page.type('#password', pass, { delay: 30 });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
  await delay(3000);
}

async function navigateAndWait(page, url, waitSelector) {
  await page.goto(url, { waitUntil: 'networkidle2' });
  if (waitSelector) {
    try { await page.waitForSelector(waitSelector, { visible: true, timeout: 10000 }); } catch {}
  }
  await delay(3000);
}

// ==================== PROFESOR ====================
async function captureProfesor(page) {
  console.log('\n=== LOGIN PROFESOR ===');
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#username', { visible: true, timeout: 15000 });
  await page.waitForSelector('button[type="submit"]', { visible: true, timeout: 5000 });
  await delay(2000);
  await screenshot(page, '01-login-vacio.png');
  await page.type('#username', 'Tenoch', { delay: 30 });
  await page.type('#password', '123456', { delay: 30 });
  await screenshot(page, '02-login-credenciales.png');
  await loginAs(page, 'Tenoch', '123456');
  await screenshot(page, '03-dashboard.png');

  // USUARIOS
  console.log('\n=== USUARIOS ===');
  await navigateAndWait(page, BASE_URL + '/profesores', 'table');
  await screenshot(page, '04-usuarios-tabla.png');
  const btnAddUser = await page.$('button.btn.btn-primary');
  if (btnAddUser) {
    await btnAddUser.click();
    await delay(1500);
    await screenshot(page, '05-usuarios-modal-vacio.png');
    await page.type('input[placeholder*="nombre" i], input[formcontrolname="nombre"]', 'Ana Torres', { delay: 20 });
    const inputs = await page.$$('.modal input, .modal-body input');
    if (inputs.length > 1) await inputs[1].type('atorres', { delay: 20 });
    if (inputs.length > 2) await inputs[2].type('ana@test.com', { delay: 20 });
    await screenshot(page, '06-usuarios-modal-llenado.png');
    await safeClick(page, 'button.btn-close', 500);
  }

  // ALUMNOS
  console.log('\n=== ALUMNOS ===');
  await navigateAndWait(page, BASE_URL + '/alumnos', 'table');
  await screenshot(page, '07-alumnos-tabla.png');
  const btnAddAlumno = await page.$('button.btn.btn-primary');
  if (btnAddAlumno) {
    await btnAddAlumno.click();
    await delay(1500);
    await screenshot(page, '08-alumnos-modal-vacio.png');
    const modalInputs = await page.$$('.modal input, .modal-body input, .modal select, .modal-body select');
    if (modalInputs.length > 0) await modalInputs[0].type('Pedro Sánchez', { delay: 20 });
    if (modalInputs.length > 1) await modalInputs[1].type('García', { delay: 20 });
    if (modalInputs.length > 2) await modalInputs[2].type('Flores', { delay: 20 });
    await screenshot(page, '09-alumnos-modal-llenado.png');
    await safeClick(page, 'button.btn-close', 500);
  }

  // PAGOS
  console.log('\n=== PAGOS ===');
  await navigateAndWait(page, BASE_URL + '/pagos', 'table');
  await screenshot(page, '10-pagos-tabla.png');
  const btnAddPago = await page.$('button.btn.btn-primary');
  if (btnAddPago) {
    await btnAddPago.click();
    await delay(1500);
    await screenshot(page, '11-pagos-modal-vacio.png');
    const pagoInputs = await page.$$('.modal input, .modal-body input, .modal select, .modal-body select');
    if (pagoInputs.length > 0) await pagoInputs[0].click();
    await delay(500);
    const selectEl = await page.$('.modal select, .modal-body select');
    if (selectEl) {
      await selectEl.evaluate(el => { el.selectedIndex = 1; el.dispatchEvent(new Event('change')); });
    }
    await delay(500);
    await screenshot(page, '12-pagos-modal-llenado.png');
    await safeClick(page, 'button.btn-close', 500);
  }

  // INSCRIPCIONES
  console.log('\n=== INSCRIPCIONES ===');
  await navigateAndWait(page, BASE_URL + '/inscripciones', 'table');
  await screenshot(page, '13-inscripciones-tabla.png');
  const btnAddInsc = await page.$('button.btn.btn-primary');
  if (btnAddInsc) {
    await btnAddInsc.click();
    await delay(1500);
    await screenshot(page, '14-inscripciones-modal-vacio.png');
    const inscInputs = await page.$$('.modal input, .modal-body input, .modal select, .modal-body select');
    if (inscInputs.length > 0) {
      const sel = await page.$('.modal select, .modal-body select');
      if (sel) await sel.evaluate(el => { el.selectedIndex = 1; el.dispatchEvent(new Event('change')); });
    }
    await delay(300);
    await screenshot(page, '15-inscripciones-modal-llenado.png');
    await safeClick(page, 'button.btn-close', 500);
  }

  // COMPROBANTES
  console.log('\n=== COMPROBANTES ===');
  await navigateAndWait(page, BASE_URL + '/comprobantes', 'table');
  await screenshot(page, '16-comprobantes-tabla.png');
  const viewBtn = await page.$('button.btn-icon.btn-view');
  if (viewBtn) {
    await viewBtn.click();
    await delay(2000);
    await screenshot(page, '17-comprobantes-preview.png');
    await safeClick(page, 'button.btn-close', 500);
  }

  // PRECIOS
  console.log('\n=== PRECIOS ===');
  await navigateAndWait(page, BASE_URL + '/precios', 'table');
  await screenshot(page, '18-precios-tabla.png');
  const btnAddPrecio = await page.$('button.btn.btn-primary');
  if (btnAddPrecio) {
    await btnAddPrecio.click();
    await delay(1500);
    await screenshot(page, '19-precios-modal-vacio.png');
    const precioInputs = await page.$$('.modal input, .modal-body input');
    if (precioInputs.length > 0) await precioInputs[0].type('Mensualidad Premium', { delay: 20 });
    if (precioInputs.length > 1) await precioInputs[1].type('1500', { delay: 20 });
    await screenshot(page, '20-precios-modal-llenado.png');
    await safeClick(page, 'button.btn-close', 500);
  }

  // BECAS
  console.log('\n=== BECAS ===');
  await navigateAndWait(page, BASE_URL + '/becas', 'table');
  await screenshot(page, '21-becas-tabla.png');
  const btnAddBeca = await page.$('button.btn.btn-primary');
  if (btnAddBeca) {
    await btnAddBeca.click();
    await delay(1500);
    await screenshot(page, '22-becas-modal-vacio.png');
    const becaInputs = await page.$$('.modal input, .modal-body input, .modal select, .modal-body select');
    if (becaInputs.length > 0) await becaInputs[0].type('Beca Excelencia', { delay: 20 });
    if (becaInputs.length > 1) {
      const sel = await page.$('.modal select, .modal-body select');
      if (sel) await sel.evaluate(el => { el.selectedIndex = 1; el.dispatchEvent(new Event('change')); });
    }
    await screenshot(page, '23-becas-modal-llenado.png');
    await safeClick(page, 'button.btn-close', 500);
  }

  // REEMBOLSOS
  console.log('\n=== REEMBOLSOS ===');
  await navigateAndWait(page, BASE_URL + '/reembolsos', 'table');
  await screenshot(page, '24-reembolsos-pendientes.png');
  const historialBtn = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) { if (b.textContent.trim() === 'Historial') return true; }
    return false;
  });
  if (historialBtn) {
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) { if (b.textContent.trim() === 'Historial') { b.click(); break; } }
    });
    await delay(2000);
    await screenshot(page, '25-reembolsos-historial.png');
  }

  // PERFIL
  console.log('\n=== PERFIL ===');
  await navigateAndWait(page, BASE_URL + '/perfil');
  await screenshot(page, '26-perfil.png');
}

// ==================== ALUMNO ====================
async function captureAlumno(page) {
  console.log('\n=== CERRANDO SESIÓN PROFESOR ===');
  await page.evaluate(() => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('auth_token');
  });
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle2' });
  await delay(1500);

  console.log('\n=== LOGIN ALUMNO ===');
  await loginAs(page, 'maria_test', 'test1234');
  await delay(1000);

  console.log('\n=== ALUMNO: HOME ===');
  await navigateAndWait(page, BASE_URL + '/alumno/home');
  await screenshot(page, '27-alumno-home.png');

  console.log('\n=== ALUMNO: PAGOS ===');
  await navigateAndWait(page, BASE_URL + '/alumno/pagos', 'table');
  await screenshot(page, '28-alumno-pagos.png');

  console.log('\n=== ALUMNO: COMPROBANTES ===');
  await navigateAndWait(page, BASE_URL + '/alumno/comprobantes', 'table');
  await screenshot(page, '29-alumno-comprobantes.png');
  const viewBtn = await page.$('button.btn-icon.btn-view');
  if (viewBtn) {
    await viewBtn.click();
    await delay(2000);
    await screenshot(page, '30-alumno-comprobante-preview.png');
    await safeClick(page, 'button.btn-close', 500);
  }
  const reembolsoBtn = await page.$('button.btn-reembolso');
  if (reembolsoBtn) {
    await reembolsoBtn.click();
    await delay(1500);
    await screenshot(page, '31-alumno-reembolso-modal.png');
    await safeClick(page, 'button.btn-close', 500);
  }

  console.log('\n=== ALUMNO: SOLICITUDES ===');
  await navigateAndWait(page, BASE_URL + '/alumno/solicitudes', 'table');
  await screenshot(page, '32-alumno-solicitudes.png');
}

async function main() {
  await ensureDir(SCREENSHOTS_DIR);
  console.log('Iniciando Chromium...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  page.setDefaultTimeout(30000);

  try {
    await captureProfesor(page);
    await captureAlumno(page);
    console.log('\n=== TODAS LAS CAPTURAS COMPLETADAS ===');
    const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    console.log(`Total screenshots: ${files.length}`);
    files.forEach(f => console.log(`  ${f}`));
  } catch (err) {
    console.error('Error:', err.message);
    await screenshot(page, 'error-debug.png');
  } finally {
    await browser.close();
  }
}

main();
