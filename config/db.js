import { connect } from 'mongoose';
import { MONGODB_URI } from './index.js';
import { green, blue } from 'colorette';

const connectDB = async () => {
  try {
    await connect(MONGODB_URI);
    console.info(
      blue(`
        ╔═══════════════════════════╗
        ║  💾 DATABASE CONNECTED    ║
        ╚═══════════════════════════╝`)
    );
    // console.log('Db is succesfully connected!!🚀');
    // logger.info('connected');
    // await seedAppStatus();
  } catch (error) {
    console.log(error);
    console.log(error.message);
    if (error instanceof Error) {
      console.error('an error occurred. \nRetrying connection');
      connectDB();
    }
    // process.exit(1);
  }
};

export default connectDB;
