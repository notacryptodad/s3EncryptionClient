# S3 Encryption Client
A TypeScript library for client-side encryption of S3 objects using AWS KMS.
An implementation of [S3 Encryption Client](https://docs.aws.amazon.com/amazon-s3-encryption-client/latest/developerguide/what-is-s3-encryption-client.html)

## Installation

```bash
npm install s3-encryption-client
```

## Support multiple ways to pass the credential

The S3EncryptionClient can be configured in several ways:

```typescript
// Using EC2 Instance Profile or ECS Task Role
const client = new S3EncryptionClient({
  region: 'ap-northeast-1',
  kmsKeyId: 'your-kms-key-id'
});

// Using explicit credentials
const client = new S3EncryptionClient({
  region: 'ap-northeast-1',
  kmsKeyId: 'your-kms-key-id',
  credentials: {
    accessKeyId: 'YOUR_ACCESS_KEY',
    secretAccessKey: 'YOUR_SECRET_KEY'
  }
});

// Using temporary credentials (STS)
const client = new S3EncryptionClient({
  region: 'ap-northeast-1',
  kmsKeyId: 'your-kms-key-id',
  credentials: {
    accessKeyId: 'ASIA...',
    secretAccessKey: 'SECRET...',
    sessionToken: 'SESSION_TOKEN...'
  }
});
```

## Authentication Methods

1. **IAM Role** (recommended)
   - When running on AWS services (EC2, ECS, Lambda)
   - No credentials needed in code

2. **Environment Variables**
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_SESSION_TOKEN (optional)

3. **Explicit Credentials**
   - Directly in the configuration
   - Support for temporary credentials

## Usage

```typescript
import { S3EncryptionClient } from 's3-encryption-client';

// Initialize the client with your KMS key ID
// Using EC2 Instance Profile or ECS Task Role
const client = new S3EncryptionClient({
  region: 'ap-northeast-1',
  kmsKeyId: 'your-kms-key-id'
});

// Example: Upload and encrypt a file
async function uploadEncryptedFile() {
    try {
        await client.putObject({
            Bucket: 'your-bucket',
            Key: 'your-file-key',
            Body: 'your content' // Can be string or Buffer
        });
        console.log('File encrypted and uploaded successfully');
    } catch (error) {
        console.error('Upload failed:', error);
    }
}

// Example: Download and decrypt a file
async function downloadDecryptedFile() {
    try {
        const result = await client.getObject({
            Bucket: 'your-bucket',
            Key: 'your-file-key'
        });
        console.log('Decrypted content:', result.Body.toString());
    } catch (error) {
        console.error('Download failed:', error);
    }
}

// Example: Delete a file
async function deleteFile() {
    try {
        await client.deleteObject({
            Bucket: 'your-bucket',
            Key: 'your-file-key'
        });
        console.log('File deleted successfully');
    } catch (error) {
        console.error('Delete failed:', error);
    }
}
```

## Features
- Client-side encryption using AWS KMS
- AES-256-GCM encryption
- Automatic handling of encryption context
- Support for both string and Buffer content
- Automatic handling of data key generation and encryption
- Support for AWS S3 and KMS operations

## Requirements
- AWS credentials configured in your environment
- Access to AWS KMS and S3 services
- Node.js environment

## AWS Configuration
Make sure you have proper AWS credentials configured either through:
- Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- AWS credentials file (~/.aws/credentials)
- IAM role when running on AWS services

## Security Considerations
- The KMS key used must have appropriate permissions
- The encryption context includes the S3 bucket and key information
- Data keys are generated per object
- Authentication tags are automatically handled