const Redis = require('ioredis');
require('dotenv').config();

async function testRedisConnection() {
  console.log('Testing Redis connection...');
  console.log('REDIS_URL:', process.env.REDIS_URL);
  
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    redis.on('connect', () => {
      console.log('Connected to Redis successfully!');
    });
    
    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    // Test setting and getting a value
    await redis.set('test_key', 'Hello from Redis!');
    const value = await redis.get('test_key');
    console.log('Test value retrieved:', value);
    
    // Close connection after test
    redis.quit();
  } catch (error) {
    console.error('Redis test failed:', error);
  }
}

testRedisConnection(); 
