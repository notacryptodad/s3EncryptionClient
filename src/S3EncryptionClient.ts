import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  S3ClientConfig
} from "@aws-sdk/client-s3";
import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
} from "@aws-sdk/client-kms";
import { AwsCredentialIdentity } from "@aws-sdk/types";
import { createCipheriv, createDecipheriv, randomBytes, Cipher, Decipher } from 'crypto';
import { Readable } from 'stream';

interface GCMCipher extends Cipher {
  getAuthTag(): Buffer;
}

interface GCMDecipher extends Decipher {
  setAuthTag(tag: Buffer): void;
}

interface EncryptionContext {
  [key: string]: string;
}

interface S3EncryptionClientConfig {
  region: string;
  kmsKeyId: string;
  credentials?: AwsCredentialIdentity;
}

class S3EncryptionClient extends S3Client {
  private kmsClient: KMSClient;
  private kmsKeyId: string;
  private algorithm = 'aes-256-gcm' as const;
  private tagLength = 16 as const;

  constructor(config: S3EncryptionClientConfig) {
    // Validate required fields
    if (!config.region) {
      throw new Error('Region is required');
    }
    if (!config.kmsKeyId) {
      throw new Error('KMS Key ID is required');
    }

    // Create common client configuration
    const clientConfig: S3ClientConfig = {
      region: config.region,
      credentials: config.credentials
    };

    // Initialize S3 client
    super(clientConfig);

    // Initialize KMS client with the same configuration
    this.kmsClient = new KMSClient({
      region: config.region,
      credentials: config.credentials
    });
    
    this.kmsKeyId = config.kmsKeyId;
  }

  async deleteObject(params: {
    Bucket: string;
    Key: string;
  }): Promise<void> {
    try {
      await super.send(new DeleteObjectCommand({
        Bucket: params.Bucket,
        Key: params.Key
      }));
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
    }
  }

  async putObject(params: {
    Bucket: string;
    Key: string;
    Body: Buffer | string;
  }): Promise<void> {
    try {
      const encryptionContext = {
        "aws:s3:arn": `arn:aws:s3:::${params.Bucket}/${params.Key}`
      };

      const dataKey = await this.generateDataKey(encryptionContext);
      const iv = randomBytes(12);

      const cipher = createCipheriv(this.algorithm, dataKey.plaintext, iv) as GCMCipher;
      const content = Buffer.isBuffer(params.Body)
        ? params.Body
        : Buffer.from(params.Body);

      const encryptedContent = Buffer.concat([
        cipher.update(content),
        cipher.final(),
        cipher.getAuthTag()
      ]);

      const metadata = {
        'x-amz-meta-x-amz-key-v2': dataKey.encrypted.toString('base64'),
        'x-amz-meta-x-amz-iv': iv.toString('base64'),
        'x-amz-meta-x-amz-matdesc': JSON.stringify(encryptionContext),
        'x-amz-meta-x-amz-wrap-alg': 'kms+context',
        'x-amz-meta-x-amz-cek-alg': 'AES/GCM/NoPadding',
        'x-amz-meta-x-amz-tag-len': '128'
      };

      await super.send(new PutObjectCommand({
        ...params,
        Body: encryptedContent,
        Metadata: metadata
      }));

    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  async getObject(params: {
    Bucket: string;
    Key: string;
  }): Promise<{ Body: Buffer }> {
    try {
      const response = await super.send(new GetObjectCommand(params));

      if (!response.Body || !response.Metadata) {
        throw new Error('Invalid response from S3');
      }
      const metadata = response.Metadata;
      const encryptedKey = Buffer.from(metadata['x-amz-meta-x-amz-key-v2'], 'base64');
      const iv = Buffer.from(metadata['x-amz-meta-x-amz-iv'], 'base64');
      const materialsDescription = JSON.parse(metadata['x-amz-meta-x-amz-matdesc']);

      console.log('Metadata received:', metadata);
      console.log('Encrypted key:', encryptedKey);
      console.log('IV:', iv);
      console.log('Materials description:', materialsDescription);

      const plaintextKey = await this.decryptDataKey(
        encryptedKey,
        materialsDescription
      );

      const content = await this.streamToBuffer(response.Body as Readable);
      const authTag = content.slice(content.length - this.tagLength);
      const encryptedContent = content.slice(0, content.length - this.tagLength);

      const decipher = createDecipheriv(this.algorithm, plaintextKey, iv) as GCMDecipher;
      decipher.setAuthTag(authTag);

      const decryptedContent = Buffer.concat([
        decipher.update(encryptedContent),
        decipher.final()
      ]);

      return { Body: decryptedContent };
    } catch (error) {
      console.error('Decryption failed:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  private async generateDataKey(
    encryptionContext: EncryptionContext
  ): Promise<{ plaintext: Buffer; encrypted: Buffer }> {
    const response = await this.kmsClient.send(new GenerateDataKeyCommand({
      KeyId: this.kmsKeyId,
      KeySpec: 'AES_256',
      EncryptionContext: encryptionContext
    }));

    if (!response.Plaintext || !response.CiphertextBlob) {
      throw new Error('Failed to generate data key');
    }

    return {
      plaintext: Buffer.from(response.Plaintext),
      encrypted: Buffer.from(response.CiphertextBlob)
    };
  }

  private async decryptDataKey(
    encryptedKey: Buffer,
    encryptionContext: EncryptionContext
  ): Promise<Buffer> {
    const response = await this.kmsClient.send(new DecryptCommand({
      CiphertextBlob: encryptedKey,
      EncryptionContext: encryptionContext
    }));

    if (!response.Plaintext) {
      throw new Error('Failed to decrypt data key');
    }

    return Buffer.from(response.Plaintext);
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}

export default S3EncryptionClient;
