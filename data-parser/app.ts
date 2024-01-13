import { Context, S3CreateEvent } from "aws-lambda";
import { S3Client } from '@aws-sdk/client-s3';
import path from "path";
import os from 'os';
import downloadFileFromS3 from "./getFileFromS3";
import { getDetails } from "./database";


const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

function extractS3Info(event: S3CreateEvent) {
  const eventRecord = event.Records && event.Records[0];
  const bucket = eventRecord.s3.bucket.name;
  const { key } = eventRecord.s3.object;
  return { bucket, key };
}

const supportedFormats = ['csv', 'xml', 'yaml', 'txt'];

export const lambdaHandler = async (event: S3CreateEvent, context: Context): Promise<string> => {
    let message: string = 'Lambda invoked successfully with Postgres';
    // console.log('EVENT: \n-' + JSON.stringify(event, null, 2)); 

    try {
      const s3Info = extractS3Info(event);
      
      const id = context.awsRequestId;
          const extension = path.extname(s3Info.key).toLowerCase();
          const tempFile = path.join(os.tmpdir(), id + extension);
          const extensionWithoutDot = extension.slice(1);
  
          console.log('converting', s3Info.bucket, ':', s3Info.key, 'using', tempFile);
          if (!supportedFormats.includes(extensionWithoutDot)) {
            throw new Error(`unsupported file type ${extension}`);
        }
       const data = await downloadFileFromS3(s3Info.bucket, s3Info.key, tempFile);
       console.log('Data received : \n-' + data);

       let employees: { name: string, gender:string, designation: string, email:string,  date_of_join: string }[] = [
        {  "name": "VijayK2", "gender": "Male", "designation":"Tech Lead2", "email":"vk12@gmail.com","date_of_join":"2021-07-05"},
        {  "name": "Subha2", "gender": "Female", "designation":"Tech Lead2", "email":"subha2@gmail.com","date_of_join":"2021-02-04"}        
        ];
          
            let insertQuery = `INSERT INTO public.employees( name, gender, designation, email, date_of_join) VALUES ` +
           employees.map( 
            (emp) =>`('${emp.name}', '${emp.gender}', '${emp.designation}', '${emp.email}', '${emp.date_of_join}')`)
            .join(', ')

            console.log("Before replace :"+insertQuery);
                               
      const { rows } = await getDetails(insertQuery);
        console.log(JSON.stringify(rows))

    } catch (error) {
      console.log("Error occured in Lammda handler :"+ error)
    }
    
    return message;
};