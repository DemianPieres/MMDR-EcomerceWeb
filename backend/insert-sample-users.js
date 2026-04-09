// Script para insertar usuarios de ejemplo en MongoDB
// Ejecutar con: node insert-sample-users.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Definir el esquema de usuario (debe coincidir con el modelo)
const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    match: [/.+@.+\..+/, 'Email inválido'],
    maxlength: [100, 'El email no puede exceder 100 caracteres']
  },
  // Campos necesarios para autenticación
  passwordHash: { 
    type: String, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  failedLogins: { 
    type: Number, 
    default: 0 
  },
  lockedUntil: { 
    type: Date 
  },
  lastLoginAt: { 
    type: Date 
  }
}, { 
  timestamps: true,
  versionKey: false
});

const User = mongoose.model('User', userSchema);

// Usuarios de ejemplo con contraseñas
const sampleUsers = [
  {
    name: 'Demian Rodriguez',
    email: 'demian@gmail.com',
    password: 'password123'
  },
  {
    name: 'Juan Pérez',
    email: 'juan@gmail.com',
    password: 'password123'
  },
  {
    name: 'Tomas García',
    email: 'tomas@gmail.com',
    password: 'password123'
  },
  {
    name: 'Camilo López',
    email: 'camilo@gmail.com',
    password: 'password123'
  },
  {
    name: 'Roman Martínez',
    email: 'roman@gmail.com',
    password: 'password123'
  },
  {
    name: 'Admin Principal',
    email: 'admin@gmail.com',
    password: 'admin123'
  }
];

async function insertSampleUsers() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Limpiar usuarios existentes (opcional)
    console.log('🧹 Limpiando usuarios existentes...');
    await User.deleteMany({});
    console.log('✅ Usuarios existentes eliminados');

    // Insertar usuarios de ejemplo con contraseñas hasheadas
    console.log('📝 Insertando usuarios de ejemplo...');
    const insertedUsers = [];
    
    for (const userData of sampleUsers) {
      const passwordHash = await bcrypt.hash(userData.password, 12);
      const user = new User({
        name: userData.name,
        email: userData.email,
        passwordHash: passwordHash,
        isActive: true,
        failedLogins: 0
      });
      await user.save();
      insertedUsers.push(user);
    }
    
    console.log(`✅ ${insertedUsers.length} usuarios insertados exitosamente`);

    // Mostrar usuarios insertados
    console.log('\n📋 Usuarios insertados:');
    insertedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} - ${user.email}`);
    });
    
    console.log('\n🔑 Credenciales para login:');
    console.log('Email: demian@gmail.com | Password: password123');
    console.log('Email: admin@gmail.com | Password: admin123');

    console.log('\n🎉 ¡Script completado exitosamente!');
    console.log('💡 Ahora puedes abrir el panel de administración para ver los usuarios');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar el script
insertSampleUsers();
