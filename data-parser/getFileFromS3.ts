import { S3Client, GetObjectCommandOutput, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

export const asStream = (response: GetObjectCommandOutput) => {
    return response.Body as Readable;
  };
  
  export const asBuffer = async (response: GetObjectCommandOutput) => {    
    const stream = asStream(response);
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  };
  
  export const getDataFromFile = async (response: GetObjectCommandOutput) => {    
    const buffer = await asBuffer(response);
    return buffer.toString();
  };

  async function downloadFileFromS3(bucket: string, fileKey: string) {
    console.log('Downloading started...', bucket, fileKey);
  
    const data = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: fileKey }));
    const stringData = await getDataFromFile(data)     
  
     return stringData;
  }

  export function prepareEmployeeDataToInsert(dataRemovedRegex: string) {
    
    const dataDownloadedObj: any = JSON.parse(dataRemovedRegex);
  
    // console.log(dataDownloadedObj);
  
    var newEmpArray: any[] = [];
    for (var key in dataDownloadedObj) {
      // skip loop if the property is from prototype
      if (!dataDownloadedObj.hasOwnProperty(key)) continue;
  
      var obj = dataDownloadedObj[key];
  
      for (var prop of obj) {
        const dynamicObj: { name: string, gender: string, designation: string, email: string, date_of_join: string } = {
          name: prop.name,
          gender: prop.gender,
          designation: prop.designation,
          email: prop.email,
          date_of_join: prop.date_of_join
        }
        newEmpArray.push(dynamicObj);
      }
    }
    console.log(newEmpArray);
  
    // throw new Error("Function not implemented.");
    return newEmpArray;
  }

  export function prepareUserDataToInsert(dataRemovedRegex: string) {
    // console.log("User_details dataDownloadedObj :");
    const dataDownloadedObj: any = JSON.parse(dataRemovedRegex);
  
      // console.log(dataDownloadedObj);

      var newUserArray: any[] = [];
      for (var key in dataDownloadedObj) {
        // skip loop if the property is from prototype
        if (!dataDownloadedObj.hasOwnProperty(key)) continue;

        var obj = dataDownloadedObj[key];

        for (var prop of obj) {
          const dynamicObj: {
            firstname: string, lastname: string, email: string,
            mobileno: string, dob: string, date_registered: string, policy_type: string,
            dateofpayment: string, premium_amount: string
          } = {

            firstname: prop.firstname,
            lastname: prop.lastname,
            email: prop.email,
            mobileno: prop.mobileno,
            dob: prop.dob,
            date_registered: prop.date_registered,
            policy_type: prop.policy_type,
            dateofpayment: prop.dateofpayment,
            premium_amount: prop.premium_amount
          }
          newUserArray.push(dynamicObj);
        }
      }
      console.log(newUserArray);

      return newUserArray;
  }

  export default downloadFileFromS3;