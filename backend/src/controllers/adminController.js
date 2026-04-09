const User = require('../models/user');

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, { passwordHash: 0, failedLogins: 0, lockedUntil: 0, lastLoginAt: 0 })
            .sort({ createdAt: -1 }); // Ordenar por fecha de creación descendente
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener un usuario por ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id, { passwordHash: 0, failedLogins: 0, lockedUntil: 0, lastLoginAt: 0 });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            user: user
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Actualizar un usuario
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;

        // Validar campos obligatorios
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Nombre y email son obligatorios'
            });
        }

        // Verificar que el usuario existe
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Validar email único si se está cambiando
        if (email !== existingUser.email) {
            const emailExists = await User.findOne({ 
                email: email.toLowerCase().trim(),
                _id: { $ne: id }
            });
            
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'El email ya está en uso por otro usuario'
                });
            }
        }

        // Preparar datos de actualización
        const updateData = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            updatedAt: new Date()
        };

        // Actualizar usuario
        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Eliminar un usuario
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el usuario existe
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Eliminar usuario
        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
};
