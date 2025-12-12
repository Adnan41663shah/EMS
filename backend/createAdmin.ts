import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User';
import connectDB from './src/config/database';

// Load environment variables
dotenv.config();

// Get admin details from command line arguments or use defaults
const args = process.argv.slice(2);
const getArg = (flag: string, defaultValue: string): string => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const adminName = getArg('--name', 'Admin User');
const adminEmail = getArg('--email', 'admin@cloudblitz.in');
const adminPassword = getArg('--password', 'Password@123');
const adminPhone = getArg('--phone', '');

const createAdmin = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('❌ Admin user already exists!');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log('   If you want to create another admin, please delete the existing one first.');
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      console.log(`❌ User with email ${adminEmail} already exists!`);
      process.exit(1);
    }

    console.log('Creating admin user...');
    console.log(`   Name: ${adminName}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Phone: ${adminPhone || 'Not provided'}`);

    // Create admin user
    // The User model will automatically hash the password via pre-save hook
    const adminData: any = {
      name: adminName,
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      role: 'admin',
      isActive: true
    };

    if (adminPhone && adminPhone.trim() !== '') {
      adminData.phone = adminPhone.trim();
    }

    const admin = new User(adminData);
    await admin.save();

    console.log('\n✅ Admin user created successfully!');
    console.log(`   ID: ${admin._id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Password: ${adminPassword} (please change after first login)`);
    console.log('\nYou can now login with these credentials.');

    // Close database connection
    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 11000) {
      console.error('   Email already exists in database.');
    }
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
createAdmin();

