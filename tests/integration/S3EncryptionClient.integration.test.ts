// tests/integration/S3EncryptionClient.integration.test.ts

import { S3EncryptionClient } from '../../src';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

describe('S3EncryptionClient Integration Tests', () => {
  const client = new S3EncryptionClient({
    region: getRequiredEnvVar('AWS_REGION'),  // This ensures region is always a string
    kmsKeyId: getRequiredEnvVar('KMS_KEY_ID'),
  });

  // Generate a unique key for each test run to avoid conflicts
  const testId = randomBytes(4).toString('hex');
  const bucket = getRequiredEnvVar('S3_BUCKET');
  const key = `test-${testId}`;
  const content = 'test content';

  it('should encrypt, upload, download and decrypt a file', async () => {
    try {
      // Upload encrypted content
      await client.putObject({
        Bucket: bucket,
        Key: key,
        Body: content
      });
      console.log(`Successfully uploaded encrypted file: ${key}`);

      // Download and decrypt content
      const result = await client.getObject({
        Bucket: bucket,
        Key: key
      });
      console.log('Successfully downloaded and decrypted file');

      expect(result.Body?.toString()).toBe(content);
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  }, 30000); // 30 second timeout

  afterAll(async () => {
    try {
      await client.deleteObject({
        Bucket: bucket,
        Key: key
      });
      console.log(`Cleaned up test file: ${key}`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });
});