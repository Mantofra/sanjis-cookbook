import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config } from './config.js';

await mongoose.connect(config.mongodbUri);
console.log('Connected to MongoDB');

const app = createApp();
app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
