import { Context, S3CreateEvent } from "aws-lambda";
import { S3Client } from '@aws-sdk/client-s3';
import path from "path";
import os from 'os';
import downloadFileFromS3, {prepareEmployeeDataToInsert, prepareUserDataToInsert} from "./getFileFromS3";
import { getDetails } from "./db-crud";

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

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
    console.log(dataRemovedRegex);
    
    // JSON File processing
    if (extensionWithoutDot == 'json') {
      console.log(`File conversion from ${extensionWithoutDot} to JSON`);
      
        if(dataRemovedRegex.includes("employees")){
          
          let empObj = prepareEmployeeDataToInsert(dataRemovedRegex, extensionWithoutDot);

              let insertQuery = `INSERT INTO public.employees( name, gender, designation, email, date_of_join) VALUES ` +
              empObj.map(
            (emp) => `('${emp.name}', '${emp.gender}', '${emp.designation}', '${emp.email}', '${emp.date_of_join}')`)
            .join(', ')

        console.log(`json conversion Json : ${insertQuery}`)

        const rows = await getDetails(insertQuery);
        console.log(JSON.stringify(`Inserted Records are ${rows.rowCount}`))

        } else if (dataRemovedRegex.includes("user_details")) {
          console.log(`User_Details file parsing!`);
          let userObj = prepareUserDataToInsert(dataRemovedRegex, extensionWithoutDot);
          
          let insertUSerDetailsQuery = `INSERT INTO public.user_details( firstname, lastname, email, mobileno, dob) VALUES ` +
          userObj.map(
            (user) => `('${user.firstname}', '${user.lastname}', '${user.email}', '${user.mobileno}', '${user.dob}')`)
            .join(', ')
        try {

          console.log(`USer details : ${insertUSerDetailsQuery}`);
          
          const userResultSet  = await getDetails(insertUSerDetailsQuery);
          console.log(`Inserted User_details Records are ${userResultSet.rowCount}`)

          let insertUSerPolicyQuery = `INSERT INTO public.user_policies( user_id, date_registered, policy_type, dateofpayment, premium_amount) VALUES  `;
          
            for(let i=0; i< userObj.length; i++ ){
              let user = userObj[i];
              if(userObj.length < 2) {            
                insertUSerPolicyQuery =  insertUSerPolicyQuery + `((select user_id from public.user_details where firstname='${user.firstname}'), '${user.date_registered}', '${user.policy_type}', '${user.dateofpayment}', '${user.premium_amount}')`            
              }else {
                insertUSerPolicyQuery =  insertUSerPolicyQuery + `((select user_id from public.user_details where firstname='${user.firstname}'), '${user.date_registered}', '${user.policy_type}', '${user.dateofpayment}', '${user.premium_amount}'),`              
              }
            }
              
              console.log(`USer Policy before slice : ${insertUSerPolicyQuery}`);
              insertUSerPolicyQuery = insertUSerPolicyQuery.slice(0, -1);
              console.log(`USer Policy : ${insertUSerPolicyQuery}`);
              
              const  userPloicyResultSet  = await getDetails(insertUSerPolicyQuery);
              console.log(`Inserted User_policy Records are ${userPloicyResultSet.rowCount}`) 

        } catch (error) {
          console.log("Error in User details and policy insertion:" + error);
        }          
        } else {
          throw new Error("File data is not proper.");
        }
  } 
    
    // YAML File processing
    if (extensionWithoutDot == 'yaml') {
      console.log(`YAML File is parsing`);

      if(dataRemovedRegex.includes("employees")){
          
        let empObj = prepareEmployeeDataToInsert(dataInString, extensionWithoutDot) ;
        console.log(empObj);
            let insertQuery = `INSERT INTO public.employees( name, gender, designation, email, date_of_join) VALUES ` +
            empObj.map(
          (emp) => `('${emp.name}', '${emp.gender}', '${emp.designation}', '${emp.email}', '${emp.date_of_join}')`)
          .join(', ')

      console.log(`json conversion Json : ${insertQuery}`)

      const rows = await getDetails(insertQuery);
      console.log(JSON.stringify(`Inserted Records are ${rows.rowCount}`))

      }
      else if (dataRemovedRegex.includes("user_details")) {
        console.log(`User_Details file parsing!`);
        let userObj = prepareUserDataToInsert(dataInString, extensionWithoutDot);
        
        let insertUSerDetailsQuery = `INSERT INTO public.user_details( firstname, lastname, email, mobileno, dob) VALUES ` +
        userObj.map(
          (user) => `('${user.firstname}', '${user.lastname}', '${user.email}', '${user.mobileno}', '${user.dob}')`)
          .join(', ')
      try {

        console.log(`USer details : ${insertUSerDetailsQuery}`);
        
        const userResultSet  = await getDetails(insertUSerDetailsQuery);
        console.log(`Inserted User_details Records are ${userResultSet.rowCount}`)

        let insertUSerPolicyQuery = `INSERT INTO public.user_policies( user_id, date_registered, policy_type, dateofpayment, premium_amount) VALUES  `;
        
          for(let i=0; i< userObj.length; i++ ){
            let user = userObj[i];
            if(userObj.length < 2) {            
              insertUSerPolicyQuery =  insertUSerPolicyQuery + `((select user_id from public.user_details where firstname='${user.firstname}'), '${user.date_registered}', '${user.policy_type}', '${user.dateofpayment}', '${user.premium_amount}')`            
            }else {
              insertUSerPolicyQuery =  insertUSerPolicyQuery + `((select user_id from public.user_details where firstname='${user.firstname}'), '${user.date_registered}', '${user.policy_type}', '${user.dateofpayment}', '${user.premium_amount}'),`              
            }
          }
            
            console.log(`USer Policy before slice : ${insertUSerPolicyQuery}`);
            insertUSerPolicyQuery = insertUSerPolicyQuery.slice(0, -1);
            console.log(`USer Policy : ${insertUSerPolicyQuery}`);
            
            const  userPloicyResultSet  = await getDetails(insertUSerPolicyQuery);
            console.log(`Inserted User_policy Records are ${userPloicyResultSet.rowCount}`) 

      } catch (error) {
        console.log("Error in User details and policy insertion:" + error);
      }          
      }
      else {
          console.log("YAML file data is not proper");          
      }

    }

  } catch (error) {
    console.log("Error occured in Lammda handler :" + error)
  }

  return message;
};


