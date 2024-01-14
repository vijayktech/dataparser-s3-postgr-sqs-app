import { Context, S3CreateEvent } from "aws-lambda";
import { S3Client } from '@aws-sdk/client-s3';
import path from "path";
import os from 'os';
import downloadFileFromS3 from "./getFileFromS3";
import { getDetails } from "./database";
import yaml from "js-yaml";
import fs from "fs";

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

function extractS3Info(event: S3CreateEvent) {
  const eventRecord = event.Records && event.Records[0];
  const bucket = eventRecord.s3.bucket.name;
  const { key } = eventRecord.s3.object;
  return { bucket, key };
}

const supportedFormats = ['csv', 'xml', 'yaml', 'json'];

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

       let dataInString = await downloadFileFromS3(s3Info.bucket, s3Info.key);
      //  console.log('DowndledData in dataInString : \n-' + dataInString);

       let dataRemovedRegex = dataInString.replace(/\r?\n|\r/g, '');
                    
      // JSON File processing
      if(extensionWithoutDot == 'json') {
        // console.log(`File conversion from ${extensionWithoutDot} to JSON`);
                 
        const employeesObj  = JSON.parse(dataRemovedRegex); 
        console.log(employeesObj);
                        
        var newEmpArray : any[] = [];
        for (var key in employeesObj) {
          // skip loop if the property is from prototype
          if (!employeesObj.hasOwnProperty(key)) continue;          
                            
          var obj = employeesObj[key];
          
          for (var prop of obj) {              
              const dynamicObj: {name: string, gender: string, designation: string, email: string, date_of_join: string} = {
                name : prop.name,
                gender : prop.gender,
                designation : prop.designation,
                email : prop.email,
                date_of_join : prop.date_of_join
              }
              newEmpArray.push(dynamicObj);              
          }
      }
      console.log(newEmpArray);
          
         let insertQuery = `INSERT INTO public.employees( name, gender, designation, email, date_of_join) VALUES ` +
         newEmpArray.map( 
              (emp) =>`('${emp.name}', '${emp.gender}', '${emp.designation}', '${emp.email}', '${emp.date_of_join}')`)
              .join(', ')

              console.log(`json conversion Json : ${insertQuery}`)

               const { rows } = await getDetails(insertQuery);
               console.log(JSON.stringify(rows))
      }
      
      // YAML File processing
      if(extensionWithoutDot == 'yaml') {
        console.log(`File conversion from ${extensionWithoutDot} to YAML`);
        const employees = yaml.load(fs.readFileSync(dataInString, {encoding: 'utf-8'}));
        console.log('DowndledData in jsonData :'+employees);
      }

    } catch (error) {
      console.log("Error occured in Lammda handler :"+ error)
    }
    
    return message;
};