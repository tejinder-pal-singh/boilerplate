import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';

export const initialSeed = async (dataSource: DataSource): Promise<void> => {
  const userRepository = dataSource.getRepository(User);

  // Create admin user if it doesn't exist
  const adminEmail = 'admin@example.com';
  let adminUser = await userRepository.findOne({ where: { email: adminEmail } });

  if (!adminUser) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash('Admin123!@#', salt);

    adminUser = userRepository.create({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isEmailVerified: true,
      isActive: true,
      roles: ['admin'],
    });

    await userRepository.save(adminUser);
    console.log('Admin user created successfully');
  }

  // Create test user if it doesn't exist
  const testEmail = 'test@example.com';
  let testUser = await userRepository.findOne({ where: { email: testEmail } });

  if (!testUser) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash('Test123!@#', salt);

    testUser = userRepository.create({
      email: testEmail,
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: true,
      isActive: true,
      roles: ['user'],
    });

    await userRepository.save(testUser);
    console.log('Test user created successfully');
  }
};
