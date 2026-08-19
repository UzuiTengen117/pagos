const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/usr/bin/chromium';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_DIR = __dirname;
const LOGO_PATH = path.join(__dirname, 'logo-amtkd.png');

function logo() {
  if (!fs.existsSync(LOGO_PATH)) return '';
  return `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;
}

function img(name) {
  const p = path.join(SCREENSHOTS_DIR, name);
  if (!fs.existsSync(p)) { console.warn(`  [WARN] No encontrado: ${name}`); return ''; }
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

function baseCSS() {
  return `
    @page { margin: 1.5cm; size: A4; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; }
    .cover { page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; background: linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%); color: white; }
    .cover h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .cover .subtitle { font-size: 1.3rem; opacity: 0.9; margin-bottom: 2rem; }
    .cover .sedes { font-size: 1rem; opacity: 0.7; }
    .cover .year { font-size: 0.9rem; opacity: 0.6; margin-top: 3rem; }
    .toc { page-break-after: always; }
    .toc h2 { color: #1e1b4b; border-bottom: 3px solid #4f46e5; padding-bottom: 0.5rem; }
    .toc ul { list-style: none; padding: 0; }
    .toc li { padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 1.05rem; }
    .chapter { page-break-before: always; }
    .chapter:first-of-type { page-break-before: auto; }
    .chapter h2 { color: #1e1b4b; font-size: 1.5rem; border-left: 5px solid #4f46e5; padding-left: 1rem; margin-bottom: 1rem; }
    .chapter h3 { color: #334155; font-size: 1.15rem; margin-top: 1.5rem; }
    .step { background: #f8fafc; border-radius: 8px; padding: 1rem 1.25rem; margin: 1rem 0; border-left: 4px solid #4f46e5; }
    .step .num { display: inline-block; background: #4f46e5; color: white; border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; font-size: 0.8rem; font-weight: bold; margin-right: 0.5rem; }
    .screenshot { text-align: center; margin: 1.5rem 0; }
    .screenshot img { max-width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .screenshot .cap { font-size: 0.85rem; color: #64748b; margin-top: 0.5rem; font-style: italic; }
    .note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 1rem; margin: 1rem 0; font-size: 0.9rem; }
    .note strong { color: #1e40af; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th { background: #1e1b4b; color: white; padding: 8px 12px; text-align: left; font-size: 0.9rem; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { text-align: center; font-size: 0.8rem; color: #94a3b8; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; }
    .part-header { background: #4f46e5; color: white; padding: 1rem 1.5rem; border-radius: 8px; text-align: center; font-size: 1.3rem; font-weight: bold; margin: 2rem 0; }
    .part-header.green { background: #059669; }
  `;
}

function cover(title, sub) {
  const logoSrc = logo();
  const logoHtml = logoSrc ? `<img src="${logoSrc}" style="width:120px;height:120px;border-radius:20px;margin-bottom:1.5rem;background:white;padding:12px;" alt="AMTKD"/>` : '<div style="font-size:4rem;margin-bottom:1rem;">&#127942;</div>';
  return `<div class="cover">${logoHtml}<h1>${title}</h1><div class="subtitle">${sub}</div><div class="sedes">Sedes: Progreso y Morelos</div><div class="year">Sistema de Pagos AMTKD &mdash; ${new Date().getFullYear()}</div></div>`;
}

function toc(chapters) {
  const items = chapters.map((ch, i) => `<li>${i + 1}. ${ch}</li>`).join('');
  return `<div class="toc"><h2>Contenido</h2><ul>${items}</ul></div>`;
}

function sc(src, caption) {
  if (!src) return '';
  return `<div class="screenshot"><img src="${src}" alt="${caption}"/><div class="cap">${caption}</div></div>`;
}

function step(n, text) { return `<div class="step"><span class="num">${n}</span> ${text}</div>`; }
function note(t) { return `<div class="note"><strong>Nota:</strong> ${t}</div>`; }

async function genPDF(html, out) {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle2' });
  await page.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: '1.5cm', bottom: '1.5cm', left: '1.5cm', right: '1.5cm' } });
  await browser.close();
  console.log(`[PDF] ${path.basename(out)}`);
}

// ==================== MANUAL PROFESOR ====================
async function genProfesor() {
  console.log('\n--- Manual Profesor ---');
  const ch = ['Inicio de Sesion', 'Dashboard', 'Gestion de Usuarios', 'Gestion de Alumnos', 'Gestion de Pagos', 'Inscripciones', 'Comprobantes', 'Precios', 'Becas', 'Reembolsos', 'Mi Perfil'];

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseCSS()}</style></head><body>
    ${cover('Manual del Profesor', 'Guia completa para el uso del Sistema de Pagos AMTKD')}
    ${toc(ch)}

    <div class="chapter">
      <h2>1. Inicio de Sesion</h2>
      <p>Para acceder al sistema, ingresa a la pagina de login con tus credenciales.</p>
      ${step(1, 'Abre el navegador y dirígete a la direccion del sistema. Veras la pantalla de login.')}
      ${sc(img('01-login-vacio.png'), 'Pantalla de inicio de sesion vacia')}
      ${step(2, 'Ingresa tu <strong>nombre de usuario</strong> y <strong>contrasena</strong>. Ejemplo: usuario "Tenoch", contrasena "123456".')}
      ${sc(img('02-login-credenciales.png'), 'Credenciales ingresadas en el formulario')}
      ${step(3, 'Haz clic en <strong>"Ingresar al Sistema"</strong>. Seras redirigido al Panel de Control.')}
      ${note('La sesion expira automaticamente despues de 3 minutos de inactividad por seguridad.')}
    </div>

    <div class="chapter">
      <h2>2. Panel de Control (Dashboard)</h2>
      <p>Al iniciar sesion, veras el Panel de Control con un resumen general del sistema.</p>
      ${sc(img('03-dashboard.png'), 'Panel de Control con estadisticas generales')}
      <h3>Informacion disponible:</h3>
      <table>
        <tr><th>Seccion</th><th>Descripcion</th></tr>
        <tr><td><strong>Total Pagado</strong></td><td>Monto total de pagos registrados con estado "pagado"</td></tr>
        <tr><td><strong>Registros</strong></td><td>Numero total de registros de pago en el sistema</td></tr>
        <tr><td><strong>Pendientes</strong></td><td>Pagos con estado "pendiente" por cobrar</td></tr>
        <tr><td><strong>Vencidos</strong></td><td>Pagos que han pasado su fecha limite</td></tr>
        <tr><td><strong>Becas Activas</strong></td><td>Numero de becas actualmente activas</td></tr>
        <tr><td><strong>Alumnos Activos</strong></td><td>Total de alumnos registrados</td></tr>
        <tr><td><strong>Comprobantes</strong></td><td>Total de comprobantes emitidos</td></tr>
      </table>
    </div>

    <div class="chapter">
      <h2>3. Gestion de Usuarios</h2>
      <p>Administra usuarios del sistema: profesores, administradores y estudiantes.</p>
      ${sc(img('04-usuarios-tabla.png'), 'Tabla de usuarios registrados')}
      <h3>Crear un nuevo usuario</h3>
      ${step(1, 'Haz clic en <strong>"Agregar Usuario"</strong> en la parte superior.')}
      ${sc(img('05-usuarios-modal-vacio.png'), 'Modal para agregar un nuevo usuario (vacio)')}
      ${step(2, 'Completa los campos: <strong>Nombre</strong>, <strong>Usuario</strong>, <strong>Email</strong>, <strong>Rol</strong> y <strong>Contrasena</strong>.')}
      ${sc(img('06-usuarios-modal-llenado.png'), 'Formulario de usuario llenado con datos de ejemplo')}
      ${step(3, 'Haz clic en <strong>"Agregar Usuario"</strong> para guardar. El nuevo usuario aparecera en la tabla.')}
      ${note('El nombre de usuario debe ser unico en el sistema.')}
    </div>

    <div class="chapter">
      <h2>4. Gestion de Alumnos</h2>
      <p>Administra el registro de alumnos con su informacion personal, grado, sede y beca.</p>
      ${sc(img('07-alumnos-tabla.png'), 'Tabla de alumnos registrados')}
      <h3>Registrar un nuevo alumno</h3>
      ${step(1, 'Haz clic en <strong>"Registrar Nuevo Alumno"</strong>.')}
      ${sc(img('08-alumnos-modal-vacio.png'), 'Formulario de registro de alumno (vacio)')}
      ${step(2, 'Completa: <strong>Nombre</strong>, <strong>Apellidos</strong>, <strong>Usuario</strong> (cuenta asociada), <strong>Email</strong>, <strong>Telefono</strong>, <strong>Grado</strong>, <strong>Sede</strong> (Progreso o Morelos) y <strong>Beca</strong> (si aplica).')}
      ${sc(img('09-alumnos-modal-llenado.png'), 'Formulario de alumno llenado con datos de ejemplo')}
      ${step(3, 'Haz clic en <strong>"Registrar Alumno"</strong> para guardar.')}
      <h3>Filtros disponibles</h3>
      <p>Puedes filtrar por <strong>Sede</strong>, <strong>Grado</strong>, <strong>Beca</strong> y <strong>Estado</strong> para encontrar rapidamente un alumno.</p>
    </div>

    <div class="chapter">
      <h2>5. Gestion de Pagos</h2>
      <p>Registra y administra los pagos de los alumnos, incluyendo descuentos por beca.</p>
      ${sc(img('10-pagos-tabla.png'), 'Tabla de pagos registrados')}
      <h3>Registrar un nuevo pago</h3>
      ${step(1, 'Haz clic en <strong>"Agregar Pago"</strong>.')}
      ${sc(img('11-pagos-modal-vacio.png'), 'Formulario para registrar un pago (vacio)')}
      ${step(2, 'Selecciona el <strong>alumno</strong>, el <strong>tipo de pago</strong>, la <strong>semana</strong>, el <strong>mes</strong> y el <strong>estado</strong> (pagado, pendiente o vencido).')}
      ${sc(img('12-pagos-modal-llenado.png'), 'Formulario de pago llenado con datos de ejemplo')}
      ${step(3, 'El sistema calcula automaticamente el monto aplicando el descuento de beca.')}
      ${step(4, 'Haz clic en <strong>"Agregar Pago"</strong>. Se genera automaticamente un comprobante.')}
      <h3>Exportar a Excel</h3>
      <p>Haz clic en <strong>"Descargar Excel"</strong> para exportar los pagos filtrados.</p>
    </div>

    <div class="chapter">
      <h2>6. Inscripciones</h2>
      <p>Administra las inscripciones de alumnos para cada ciclo escolar.</p>
      ${sc(img('13-inscripciones-tabla.png'), 'Tabla de inscripciones registradas')}
      <h3>Registrar una inscripcion</h3>
      ${step(1, 'Haz clic en <strong>"Agregar Inscripcion"</strong>.')}
      ${sc(img('14-inscripciones-modal-vacio.png'), 'Formulario de nueva inscripcion (vacio)')}
      ${step(2, 'Selecciona el <strong>alumno</strong>, <strong>ciclo escolar</strong>, <strong>grado</strong>, <strong>metodo de pago</strong> y <strong>estado</strong>.')}
      ${sc(img('15-inscripciones-modal-llenado.png'), 'Formulario de inscripcion llenado')}
      ${step(3, 'Haz clic en <strong>"Agregar Inscripcion"</strong>. Se genera un comprobante automaticamente.')}
    </div>

    <div class="chapter">
      <h2>7. Comprobantes de Pago</h2>
      <p>Consulta, visualiza e imprime los comprobantes de pago emitidos.</p>
      ${sc(img('16-comprobantes-tabla.png'), 'Tabla de comprobantes de pago')}
      <h3>Ver un comprobante</h3>
      ${step(1, 'Haz clic en el icono de <strong>ojo</strong> (Ver Comprobante) en la fila.')}
      ${sc(img('17-comprobantes-preview.png'), 'Vista previa del comprobante con todos los datos')}
      ${step(2, 'Se abre una ventana modal con: <strong>Folio</strong>, <strong>Alumno</strong>, <strong>Concepto</strong>, <strong>Metodo de Pago</strong>, <strong>Fecha</strong> y <strong>Monto</strong>.')}
      ${step(3, 'Haz clic en <strong>"Imprimir"</strong> para imprimir o guardar como PDF.')}
    </div>

    <div class="chapter">
      <h2>8. Gestion de Precios</h2>
      <p>Define los tipos de pago y sus montos base.</p>
      ${sc(img('18-precios-tabla.png'), 'Tabla de precios registrados')}
      <h3>Agregar un nuevo precio</h3>
      ${step(1, 'Haz clic en <strong>"Agregar Tipo de Pago"</strong>.')}
      ${sc(img('19-precios-modal-vacio.png'), 'Formulario para agregar un tipo de pago (vacio)')}
      ${step(2, 'Ingresa el <strong>Concepto</strong> (ej: "Mensualidad", "Inscripcion"), el <strong>Monto</strong> y el <strong>Tipo</strong>.')}
      ${sc(img('20-precios-modal-llenado.png'), 'Formulario de precio llenado con datos de ejemplo')}
      ${step(3, 'Haz clic en <strong>"Agregar Precio"</strong> para guardar.')}
    </div>

    <div class="chapter">
      <h2>9. Gestion de Becas</h2>
      <p>Administra los tipos de beca con sus porcentajes de descuento.</p>
      ${sc(img('21-becas-tabla.png'), 'Tabla de becas registradas')}
      <h3>Crear una nueva beca</h3>
      ${step(1, 'Haz clic en <strong>"Agregar Nuevo Tipo de Beca"</strong>.')}
      ${sc(img('22-becas-modal-vacio.png'), 'Formulario para crear una beca (vacio)')}
      ${step(2, 'Ingresa el <strong>Nombre</strong>, <strong>Porcentaje</strong> (25%, 50%, 75% o 100%), <strong>Descripcion</strong> y <strong>Estado</strong> (activa/inactiva).')}
      ${sc(img('23-becas-modal-llenado.png'), 'Formulario de beca llenado con datos de ejemplo')}
      ${step(3, 'Haz clic en <strong>"Agregar Beca"</strong> para guardar.')}
      ${note('Las becas se aplican automaticamente a los pagos de alumnos con beca asignada.')}
    </div>

    <div class="chapter">
      <h2>10. Solicitudes de Reembolso</h2>
      <p>Revisa y gestiona las solicitudes de reembolso enviadas por los alumnos.</p>
      ${sc(img('24-reembolsos-pendientes.png'), 'Pestana de solicitudes pendientes de revision')}
      ${sc(img('25-reembolsos-historial.png'), 'Pestana de historial de solicitudes procesadas')}
      <h3>Pestanas disponibles</h3>
      <table>
        <tr><th>Pestana</th><th>Descripcion</th></tr>
        <tr><td><strong>Pendientes</strong></td><td>Solicitudes que esperan revision. Puedes aprobar, rechazar, editar o eliminar.</td></tr>
        <tr><td><strong>Historial</strong></td><td>Solicitudes ya procesadas. Puedes editar, reabrir o eliminar.</td></tr>
      </table>
      <h3>Aprobar una solicitud</h3>
      ${step(1, 'En "Pendientes", haz clic en el icono de <strong>check</strong> (Aprobar).')}
      ${step(2, 'Escribe un motivo de aprobacion y confirma.')}
      <h3>Rechazar una solicitud</h3>
      ${step(1, 'Haz clic en el icono de <strong>X</strong> (Rechazar).')}
      ${step(2, 'Escribe el motivo del rechazo y confirma.')}
    </div>

    <div class="chapter">
      <h2>11. Mi Perfil</h2>
      <p>Administra tu informacion personal y configuracion de cuenta.</p>
      ${sc(img('26-perfil.png'), 'Pagina de perfil de usuario')}
      <h3>Editar informacion</h3>
      ${step(1, 'Modifica tu <strong>Nombre</strong>, <strong>Apellidos</strong>, <strong>Email</strong> o <strong>Usuario</strong>.')}
      ${step(2, 'Haz clic en <strong>"Guardar Cambios"</strong>.')}
      <h3>Cambiar contrasena</h3>
      ${step(1, 'Ingresa tu <strong>contrasena actual</strong> y la <strong>nueva contrasena</strong>.')}
      ${step(2, 'Haz clic en <strong>"Cambiar Contrasena"</strong>.')}
      <h3>Foto de perfil</h3>
      <p>Sube una foto haciendo clic en tu avatar. Formatos: JPG, PNG, WEBP.</p>
    </div>

    <div class="footer"><p>Sistema de Pagos AMTKD &mdash; Manual del Profesor &mdash; ${new Date().getFullYear()}</p></div>
  </body></html>`;

  await genPDF(html, path.join(OUTPUT_DIR, 'Manual_Profesor_Sistema_Pagos.pdf'));
}

// ==================== MANUAL ALUMNO ====================
async function genAlumno() {
  console.log('\n--- Manual Alumno ---');
  const ch = ['Inicio de Sesion', 'Mi Resumen', 'Mis Pagos', 'Mis Comprobantes', 'Solicitudes de Reembolso'];

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseCSS()}</style></head><body>
    ${cover('Manual del Alumno', 'Guia para consultar tus pagos, comprobantes y solicitudes')}
    ${toc(ch)}

    <div class="chapter">
      <h2>1. Inicio de Sesion</h2>
      <p>Para acceder al sistema como alumno, utiliza las credenciales proporcionadas por tu profesor.</p>
      ${step(1, 'Abre el navegador y dirígete a la direccion del sistema.')}
      ${sc(img('01-login-vacio.png'), 'Pantalla de inicio de sesion')}
      ${step(2, 'Ingresa tu <strong>nombre de usuario</strong> y <strong>contrasena</strong>.')}
      ${sc(img('02-login-credenciales.png'), 'Formulario de login con credenciales')}
      ${step(3, 'Haz clic en <strong>"Ingresar al Sistema"</strong>. Seras redirigido a tu pagina de inicio.')}
      ${note('Si olvidaste tu contrasena, contacta a tu profesor para que la restablezca.')}
    </div>

    <div class="chapter">
      <h2>2. Mi Resumen (Dashboard)</h2>
      <p>Al iniciar sesion, veras un resumen personal de tus pagos.</p>
      ${sc(img('27-alumno-home.png'), 'Panel de inicio del alumno con resumen de pagos')}
      <table>
        <tr><th>Seccion</th><th>Descripcion</th></tr>
        <tr><td><strong>Total Pagado</strong></td><td>Suma de todos tus pagos con estado "pagado"</td></tr>
        <tr><td><strong>Pendientes</strong></td><td>Numero de pagos pendientes por realizar</td></tr>
        <tr><td><strong>Vencidos</strong></td><td>Pagos que han pasado su fecha limite</td></tr>
        <tr><td><strong>Grafica por Mes</strong></td><td>Visualizacion de tus pagos mensuales</td></tr>
      </table>
    </div>

    <div class="chapter">
      <h2>3. Mis Pagos</h2>
      <p>Consulta el historial completo de tus pagos e inscripciones.</p>
      ${sc(img('28-alumno-pagos.png'), 'Historial de pagos e inscripciones del alumno')}
      <h3>Filtrar por fecha</h3>
      ${step(1, 'Selecciona una <strong>fecha de inicio</strong> y una <strong>fecha fin</strong>.')}
      ${step(2, 'La tabla se actualiza automaticamente.')}
      ${step(3, 'Haz clic en <strong>"Limpiar"</strong> para quitar los filtros.')}
      <h3>Informacion de cada pago</h3>
      <table>
        <tr><th>Campo</th><th>Descripcion</th></tr>
        <tr><td><strong>Concepto</strong></td><td>Descripcion del pago (ej: "Mensualidad Enero")</td></tr>
        <tr><td><strong>Monto</strong></td><td>Cantidad pagada (con descuento de beca si aplica)</td></tr>
        <tr><td><strong>Fecha</strong></td><td>Fecha en que se registro el pago</td></tr>
        <tr><td><strong>Estado</strong></td><td>Pagado (verde), Pendiente (amarillo) o Vencido (rojo)</td></tr>
      </table>
    </div>

    <div class="chapter">
      <h2>4. Mis Comprobantes</h2>
      <p>Consulta y visualiza los comprobantes de pago emitidos a tu nombre.</p>
      ${sc(img('29-alumno-comprobantes.png'), 'Lista de comprobantes del alumno')}
      <h3>Ver un comprobante</h3>
      ${step(1, 'Haz clic en el icono de <strong>ojo</strong> (Ver Comprobante).')}
      ${sc(img('30-alumno-comprobante-preview.png'), 'Vista previa del comprobante de pago')}
      <ul>
        <li><strong>Folio:</strong> Identificador unico del comprobante</li>
        <li><strong>Alumno:</strong> Tu nombre completo</li>
        <li><strong>Concepto:</strong> Descripcion del pago</li>
        <li><strong>Metodo de Pago:</strong> Efectivo, Transferencia o Tarjeta</li>
        <li><strong>Fecha de Emision:</strong> Fecha de emision</li>
        <li><strong>Monto:</strong> Cantidad total pagada</li>
      </ul>
      ${step(2, 'Haz clic en <strong>"Imprimir"</strong> para imprimir o guardar como PDF.')}
      <h3>Solicitar Reembolso</h3>
      ${step(1, 'Haz clic en <strong>"Solicitar Reembolso"</strong> (solo si esta dentro de los 7 dias).')}
      ${step(2, 'Escribe el <strong>motivo</strong> y haz clic en <strong>"Enviar Solicitud"</strong>.')}
      ${note('La solicitud debe realizarse dentro de los 7 dias posteriores al pago.')}
    </div>

    <div class="chapter">
      <h2>5. Mis Solicitudes de Reembolso</h2>
      <p>Consulta el estado de todas tus solicitudes de reembolso.</p>
      ${sc(img('32-alumno-solicitudes.png'), 'Tabla de solicitudes de reembolso del alumno')}
      <table>
        <tr><th>Estado</th><th>Significado</th></tr>
        <tr><td><strong style="color:#ca8a04;">Pendiente</strong></td><td>Esperando revision por parte del profesor/administrador.</td></tr>
        <tr><td><strong style="color:#16a34a;">Aprobada</strong></td><td>Solicitud aprobada. El reembolso sera procesado.</td></tr>
        <tr><td><strong style="color:#dc2626;">Rechazada</strong></td><td>Solicitud rechazada. Se muestra el motivo.</td></tr>
      </table>
      <h3>Informacion mostrada</h3>
      <ul>
        <li><strong>Comprobante:</strong> Concepto del comprobante asociado</li>
        <li><strong>Monto:</strong> Cantidad solicitada para reembolso</li>
        <li><strong>Motivo:</strong> Razon que proporcionaste</li>
        <li><strong>Mensaje del revisor:</strong> Comentario del profesor/administrador</li>
        <li><strong>Revisado por:</strong> Nombre de quien reviso</li>
        <li><strong>Fecha:</strong> Fecha de creacion de la solicitud</li>
      </ul>
    </div>

    <div class="footer"><p>Sistema de Pagos AMTKD &mdash; Manual del Alumno &mdash; ${new Date().getFullYear()}</p></div>
  </body></html>`;

  await genPDF(html, path.join(OUTPUT_DIR, 'Manual_Alumno_Sistema_Pagos.pdf'));
}

// ==================== MANUAL USUARIO GENERAL ====================
async function genGeneral() {
  console.log('\n--- Manual Usuario General ---');
  const ch = ['Inicio de Sesion', 'Dashboard', 'Gestion de Usuarios', 'Gestion de Alumnos', 'Gestion de Pagos', 'Inscripciones', 'Comprobantes', 'Precios', 'Becas', 'Reembolsos', 'Mi Perfil', 'Vista Alumno: Resumen', 'Vista Alumno: Pagos', 'Vista Alumno: Comprobantes', 'Vista Alumno: Reembolsos', 'Vista Alumno: Solicitudes'];

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${baseCSS()}</style></head><body>
    ${cover('Manual de Usuario', 'Guia completa del Sistema de Pagos AMTKD')}
    ${toc(ch)}

    <div class="part-header">PARTE 1 &mdash; GUIA DEL PROFESOR / ADMINISTRADOR</div>

    <div class="chapter"><h2>1. Inicio de Sesion</h2>
      ${sc(img('01-login-vacio.png'), 'Pantalla de login')}
      ${step(1, 'Ingresa tu <strong>usuario</strong> y <strong>contrasena</strong>.')}
      ${sc(img('02-login-credenciales.png'), 'Credenciales ingresadas')}
      ${step(2, 'Haz clic en <strong>"Ingresar al Sistema"</strong>.')}
      ${note('La sesion expira despues de 3 minutos de inactividad.')}
    </div>

    <div class="chapter"><h2>2. Dashboard</h2>
      ${sc(img('03-dashboard.png'), 'Panel de Control principal')}
      <p>Resumen: Total Pagado, Registros, Pendientes, Vencidos, Becas, Alumnos, Comprobantes y graficas de ganancias.</p>
    </div>

    <div class="chapter"><h2>3. Gestion de Usuarios</h2>
      ${sc(img('04-usuarios-tabla.png'), 'Tabla de usuarios')}
      ${sc(img('05-usuarios-modal-vacio.png'), 'Modal "Agregar Usuario" vacio')}
      ${sc(img('06-usuarios-modal-llenado.png'), 'Modal de usuario llenado con datos de ejemplo')}
      <p>Crea, edita, cambia roles (Administrador, Profesor, Estudiante) y elimina usuarios.</p>
    </div>

    <div class="chapter"><h2>4. Gestion de Alumnos</h2>
      ${sc(img('07-alumnos-tabla.png'), 'Tabla de alumnos')}
      ${sc(img('08-alumnos-modal-vacio.png'), 'Modal "Registrar Alumno" vacio')}
      ${sc(img('09-alumnos-modal-llenado.png'), 'Modal de alumno llenado')}
      <p>Registra alumnos con informacion personal, grado, sede (Progreso/Morelos) y beca.</p>
    </div>

    <div class="chapter"><h2>5. Gestion de Pagos</h2>
      ${sc(img('10-pagos-tabla.png'), 'Tabla de pagos')}
      ${sc(img('11-pagos-modal-vacio.png'), 'Modal "Agregar Pago" vacio')}
      ${sc(img('12-pagos-modal-llenado.png'), 'Modal de pago llenado')}
      <p>Registra pagos con descuentos automaticos por beca. Estados: Pagado, Pendiente, Vencido.</p>
    </div>

    <div class="chapter"><h2>6. Inscripciones</h2>
      ${sc(img('13-inscripciones-tabla.png'), 'Tabla de inscripciones')}
      ${sc(img('14-inscripciones-modal-vacio.png'), 'Modal de inscripcion vacio')}
      ${sc(img('15-inscripciones-modal-llenado.png'), 'Modal de inscripcion llenado')}
      <p>Administra inscripciones por ciclo escolar. Se genera comprobante automaticamente.</p>
    </div>

    <div class="chapter"><h2>7. Comprobantes de Pago</h2>
      ${sc(img('16-comprobantes-tabla.png'), 'Tabla de comprobantes')}
      ${sc(img('17-comprobantes-preview.png'), 'Vista previa de comprobante')}
      <p>Consulta, visualiza, imprime, edita fechas, cancela y elimina comprobantes.</p>
    </div>

    <div class="chapter"><h2>8. Precios</h2>
      ${sc(img('18-precios-tabla.png'), 'Tabla de precios')}
      ${sc(img('19-precios-modal-vacio.png'), 'Modal de precio vacio')}
      ${sc(img('20-precios-modal-llenado.png'), 'Modal de precio llenado')}
      <p>Define tipos de pago: Mensualidad, Inscripcion, Semanal, Otro.</p>
    </div>

    <div class="chapter"><h2>9. Becas</h2>
      ${sc(img('21-becas-tabla.png'), 'Tabla de becas')}
      ${sc(img('22-becas-modal-vacio.png'), 'Modal de beca vacio')}
      ${sc(img('23-becas-modal-llenado.png'), 'Modal de beca llenado')}
      <p>Crea becas con descuentos de 25%, 50%, 75% o 100%.</p>
    </div>

    <div class="chapter"><h2>10. Reembolsos</h2>
      ${sc(img('24-reembolsos-pendientes.png'), 'Solicitudes pendientes')}
      ${sc(img('25-reembolsos-historial.png'), 'Historial de solicitudes')}
      <p>Revisa, aprueba o rechaza solicitudes de reembolso de alumnos.</p>
    </div>

    <div class="chapter"><h2>11. Mi Perfil</h2>
      ${sc(img('26-perfil.png'), 'Perfil de usuario')}
      <p>Edita informacion, cambia contrasena y sube foto de perfil.</p>
    </div>

    <div class="part-header green">PARTE 2 &mdash; GUIA DEL ALUMNO</div>

    <div class="chapter"><h2>12. Mi Resumen (Dashboard)</h2>
      ${sc(img('27-alumno-home.png'), 'Panel de inicio del alumno')}
      <p>Total Pagado, Pagos Pendientes, Vencidos y Grafica Mensual.</p>
    </div>

    <div class="chapter"><h2>13. Mis Pagos</h2>
      ${sc(img('28-alumno-pagos.png'), 'Historial de pagos del alumno')}
      <p>Consulta tus pagos e inscripciones. Filtra por fecha.</p>
    </div>

    <div class="chapter"><h2>14. Mis Comprobantes</h2>
      ${sc(img('29-alumno-comprobantes.png'), 'Lista de comprobantes')}
      ${sc(img('30-alumno-comprobante-preview.png'), 'Vista previa de comprobante')}
      <p>Visualiza e imprime tus comprobantes de pago.</p>
    </div>

    <div class="chapter"><h2>15. Solicitudes de Reembolso</h2>
      ${sc(img('32-alumno-solicitudes.png'), 'Solicitudes de reembolso del alumno')}
      <p>Consulta el estado: Pendiente, Aprobada o Rechazada. Solicita dentro de 7 dias.</p>
    </div>

    <div class="footer"><p>Sistema de Pagos AMTKD &mdash; Manual de Usuario &mdash; ${new Date().getFullYear()}</p></div>
  </body></html>`;

  await genPDF(html, path.join(OUTPUT_DIR, 'Manual_Usuario_Sistema_Pagos.pdf'));
}

async function main() {
  console.log('=== GENERACION DE PDFs ===');
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  console.log(`Screenshots: ${files.length}`);
  if (files.length === 0) { console.error('No hay screenshots.'); process.exit(1); }
  await genProfesor();
  await genAlumno();
  await genGeneral();
  console.log('\n=== PDFs GENERADOS ===');
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
