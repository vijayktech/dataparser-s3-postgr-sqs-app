import { S3Client, GetObjectCommandOutput, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

export const asStream = (response: GetObjectCommandOutput) => {
    console.log('asBuffer asStream...')
    return response.Body as Readable;
  };
  
  export const asBuffer = async (response: GetObjectCommandOutput) => {
    console.log('asBuffer start...')
    const stream = asStream(response);
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  };
  
  export const getDataFromFile = async (response: GetObjectCommandOutput) => {
    console.log('getDataFromFile start...')
    const buffer = await asBuffer(response);
    return buffer.toString();
  };

  async function downloadFileFromS3(bucket: string, fileKey: string, filePath: string) {
    console.log('Downloading started...', bucket, fileKey, filePath);
  
    const data = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: fileKey }));
     const stringData = await getDataFromFile(data)     
    
     return stringData;
  }

  export default downloadFileFromS3;