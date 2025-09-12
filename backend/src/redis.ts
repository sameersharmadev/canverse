import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

let isRedisConnected = false;

redisClient.on('error', (err) => {
  console.log('Redis Client Error:', err.message);
  isRedisConnected = false;
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
  isRedisConnected = true;
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
  isRedisConnected = true;
});

redisClient.on('end', () => {
  console.log('Redis connection ended');
  isRedisConnected = false;
});

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    isRedisConnected = true;
    console.log('Successfully connected to Redis');
    
    await redisClient.ping();
    console.log('Redis ping successful');
    
  } catch (error) {
    console.error('Redis connection failed:', error);
    isRedisConnected = false;
    throw error; 
  }
};

export const isRedisAvailable = () => isRedisConnected;

export const closeRedis = async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
};