import { Context, S3CreateEvent } from "aws-lambda";
import { S3Client } from '@aws-sdk/client-s3';
import path from "path";
import os from 'os';
import downloadFileFromS3 from "./getFileFromS3";
import { getDetails } from "./db-crud";
import yaml from "js-yaml";
import fs from "fs";

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

      if (dataRemovedRegex.includes("employees")) {
        const employeesObj = JSON.parse(dataRemovedRegex);
        console.log(employeesObj);

        var newEmpArray: any[] = [];
        for (var key in employeesObj) {
          // skip loop if the property is from prototype
          if (!employeesObj.hasOwnProperty(key)) continue;

          var obj = employeesObj[key];

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

        //  prepareStoreData(dataRemovedRegex);

        //  const dataDownloadedObj : any = JSON.parse(dataRemovedRegex); 

        // // let preparedQueryStr : Promise<string> ;
        // if(dataRemovedRegex.includes("employees")){
        //   prepareEmployeeData(dataRemovedRegex) ;
        // } else if (dataRemovedRegex.includes("user_details")) {
        //   prepareUserDetailsData(dataRemovedRegex);
        // } else {
        //   throw new Error("File data is not proper.");
        // }

        let insertQuery = `INSERT INTO public.employees( name, gender, designation, email, date_of_join) VALUES ` +
          newEmpArray.map(
            (emp) => `('${emp.name}', '${emp.gender}', '${emp.designation}', '${emp.email}', '${emp.date_of_join}')`)
            .join(', ')

        console.log(`json conversion Json : ${insertQuery}`)

        const { rows } = await getDetails(insertQuery);
        console.log(JSON.stringify(rows))
      }
    // } else if (dataRemovedRegex.includes("user_details")) {
      
    else {       
      const dataDownloadedObj: any = JSON.parse(dataRemovedRegex);
      // console.log("User_details dataDownloadedObj :");
      console.log(dataDownloadedObj);

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

      let insertUSerDetailsQuery = `INSERT INTO public.user_details( firstname, lastname, email, mobileno, dob) VALUES ` +
        newUserArray.map(
          (user) => `('${user.firstname}', '${user.lastname}', '${user.email}', '${user.mobileno}', '${user.dob}')`)
          .join(', ')
      try {

        console.log(`USer details : ${insertUSerDetailsQuery}`);
        
        const userResult  = await getDetails(insertUSerDetailsQuery);
        console.log(JSON.stringify(userResult))

        let insertUSerPolicyQuery = `INSERT INTO public.user_policies( user_id, date_registered, policy_type, dateofpayment, premium_amount) VALUES  `;
         
          for(let i=0; i< newUserArray.length; i++ ){
            let user = newUserArray[i];
            if(newUserArray.length < 2) {            
              insertUSerPolicyQuery =  insertUSerPolicyQuery + `((select user_id from public.user_details where firstname='${user.firstname}'), '${user.date_registered}', '${user.policy_type}', '${user.dateofpayment}', '${user.premium_amount}')`            
            }else {
              insertUSerPolicyQuery =  insertUSerPolicyQuery + `((select user_id from public.user_details where firstname='${user.firstname}'), '${user.date_registered}', '${user.policy_type}', '${user.dateofpayment}', '${user.premium_amount}'),`              
            }
          }
            
            console.log(`USer Policy before slice : ${insertUSerPolicyQuery}`);
            insertUSerPolicyQuery = insertUSerPolicyQuery.slice(0, -1);
            console.log(`USer Policy : ${insertUSerPolicyQuery}`);
            
            const  userPloicyRS  = await getDetails(insertUSerPolicyQuery);
            console.log(JSON.stringify(userPloicyRS)) 

      } catch (error) {
        console.log("Error in User details and policy insertion:" + error);
      }

     
    }
  } 
    // else {
    //   throw new Error("File data is not proper.");
    // }

    // YAML File processing
    if (extensionWithoutDot == 'yaml') {
      console.log(`File conversion from ${extensionWithoutDot} to YAML`);
      const employees = yaml.load(fs.readFileSync(dataInString, { encoding: 'utf-8' }));
      console.log('DowndledData in jsonData :' + employees);
    }

  } catch (error) {
    console.log("Error occured in Lammda handler :" + error)
  }

  return message;
};

async function prepareEmployeeData(dataDownloadedString: string) {

  console.log("Employee dataDownloadedObj :");

  const dataDownloadedObj: any = JSON.parse(dataDownloadedString);

  console.log(dataDownloadedObj);

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


  let insertEmpQuery = `INSERT INTO public.employees( name, gender, designation, email, date_of_join) VALUES ` +
    newEmpArray.map(
      (emp) => `('${emp.name}', '${emp.gender}', '${emp.designation}', '${emp.email}', '${emp.date_of_join}')`)
      .join(', ')

  try {
    console.log(insertEmpQuery);
    const { rows } = await getDetails(insertEmpQuery);
    console.log(JSON.stringify(rows))
  } catch (error) {
    console.log("Error in Empoyee insertion:" + error);
  }

  // return insertEmpQuery;

  // throw new Error("Function not implemented.");
}

async function prepareUserDetailsData(dataDownloadedStr: string) {

  const dataDownloadedObj: any = JSON.parse(dataDownloadedStr);
  console.log("User_details dataDownloadedObj :");

  console.log(dataDownloadedObj);

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

  let insertUSerDetailsQuery = `INSERT INTO public.user_details( firstname, lastname, email, mobileno, dob) VALUES ` +
    newUserArray.map(
      (user) => `('${user.firstname}', '${user.lastname}', '${user.email}', '${user.mobileno}', '${user.dob}')`)
      .join(', ')
  try {

    // const { insertUserResult } = await getDetails(insertUSerDetailsQuery);
    // console.log(JSON.stringify(insertUserResult))

    let insertUSerPolicyQuery = `INSERT INTO public.user_policies( user_id, date_registered, policy_type, dateofpayment, premium_amount) VALUES ( (select user_id from public.user_details where firstname= ` +
      newUserArray.map(
        (user) => `('${user.firstname})', '${user.date_registered}', '${user.policy_type}', '${user.dateofpayment}', '${user.premium_amount}')`)
        .join(', ')

    console.log(insertUSerPolicyQuery);
  } catch (error) {
    console.log("Error in User details and policy insertion:" + error);
  }

  // const { insertUserPolicyResult } = await getDetails(insertUSerPolicyQuery);
  // console.log(JSON.stringify(insertUserPolicyResult)) 


  // throw new Error("Function not implemented.");
  // return insertUSerDetailsQuery;

}

