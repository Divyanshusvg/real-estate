import bcrypt from 'bcrypt';
import { User } from '../src/models/user.model.js';

const AdminSeeder = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminPhone = process.env.ADMIN_PHONE_NO;

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin user already exists in the database, Admin seeding skipped');
            return;
        }

        // Hash the password before saving
     

        const adminUser = {
            email: adminEmail,
            password: adminPassword,
            userType: '3', // '3' represents the admin role
            phone_no: adminPhone,
            isAdmin:true
        };

        // Create the admin user in the database
        await User.create(adminUser);
        console.log('Admin user seeded successfully');
    } catch (error) {
        console.error('Error seeding admin user:', error);
    }
};

// Execute the function immediately when the module is required
// AdminSeeder();
export default AdminSeeder;
