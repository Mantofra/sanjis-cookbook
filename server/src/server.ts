import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();
const port = process.env.PORT || 3000;
await mongoose.connect(config.mongodbUri).then(() => console.log('Connected to MongoDB'));
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
