import { config } from 'dotenv';
import dataSource from '../typeorm.config';
import { initialSeed } from './initial.seed';

// Load environment variables
config();

const runSeeds = async () => {
  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    // Run seeds
    await initialSeed(dataSource);
    console.log('Seeds have been executed successfully!');

    // Close the connection
    await dataSource.destroy();
    console.log('Data Source has been closed!');
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
};

runSeeds();
