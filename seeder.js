// index.js

import path from 'path';
import { promises as fs } from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import AdminSeeder from './seeders/AdminSeeder.js';

dotenv.config({
    path: './.env'
});


// Database connection - Connect to MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI;

const run = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB Atlas');

        // Get a list of all files in the current directory
         await AdminSeeder()
        console.log('Seeding completed successfully');
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        // Close the database connection after seeding is completed
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
};

run();