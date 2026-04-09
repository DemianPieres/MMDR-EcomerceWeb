const bcrypt = require('bcryptjs');
const User = require('../models/user');

/** Solo desarrollo: credenciales por defecto si no configurás ADMIN_EMAIL en .env */
const DEV_DEFAULT_ADMIN_EMAIL = 'admin@mmdr.dev';
const DEV_DEFAULT_ADMIN_PASSWORD = 'MmdrDev2026!';

async function migrateUserRoles() {
  const r = await User.updateMany(
    { $or: [{ role: { $exists: false } }, { role: null }, { role: '' }] },
    { $set: { role: 'user' } }
  );
  if (r.modifiedCount) {
    console.log(`✅ Roles migrados: ${r.modifiedCount} usuario(s) con rol "user"`);
  }
}

/**
 * Crea o promueve al administrador.
 * Producción: ADMIN_EMAIL + ADMIN_PASSWORD en .env (mín. 10 caracteres para crear usuario nuevo).
 * Desarrollo: si falta ADMIN_EMAIL, usa admin@mmdr.dev / MmdrDev2026! (sobrescribible con DEV_ADMIN_EMAIL / DEV_ADMIN_PASSWORD).
 */
async function ensureAdminUser() {
  const isProd = process.env.NODE_ENV === 'production';

  let email = process.env.ADMIN_EMAIL && String(process.env.ADMIN_EMAIL).toLowerCase().trim();
  let password = process.env.ADMIN_PASSWORD;

  if (!email && !isProd) {
    email = (process.env.DEV_ADMIN_EMAIL || DEV_DEFAULT_ADMIN_EMAIL).toLowerCase().trim();
    password = process.env.DEV_ADMIN_PASSWORD || DEV_DEFAULT_ADMIN_PASSWORD;
    console.log('');
    console.log('🔧 ─── MODO DESARROLLO: administrador por defecto ───');
    console.log('   Email:    ', email);
    console.log('   Password: ', password);
    console.log('   En login → mode-selection → Administrador → panel.');
    console.log('   En producción definí ADMIN_EMAIL y ADMIN_PASSWORD; no uses estos valores.');
    console.log('🔧 ─────────────────────────────────────────────────');
    console.log('');
  }

  if (!email) {
    console.warn('⚠️ ADMIN_EMAIL no definido (producción): configurá el administrador en .env');
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    if (process.env.ADMIN_SYNC_PASSWORD === 'true' && password && String(password).length >= 10) {
      existing.passwordHash = await bcrypt.hash(password, 12);
      console.log('✅ Contraseña del administrador actualizada desde .env (ADMIN_SYNC_PASSWORD=true)');
    }
    await existing.save();
    console.log('✅ Cuenta administrador verificada (rol admin):', email);
    return;
  }

  if (!password || String(password).length < 10) {
    console.warn(
      '⚠️ No existe el email admin y la contraseña falta o tiene menos de 10 caracteres. Revisá ADMIN_PASSWORD o .env en desarrollo.'
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    email,
    name: 'Administrador',
    passwordHash,
    role: 'admin'
  });
  console.log('✅ Usuario administrador creado:', email);
}

async function runRolesBootstrap() {
  await migrateUserRoles();
  await ensureAdminUser();
}

module.exports = { migrateUserRoles, ensureAdminUser, runRolesBootstrap };
