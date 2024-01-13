CREATE TABLE employees (
	emp_id serial PRIMARY KEY,
	name VARCHAR ( 50 ) NOT NULL,
	gender VARCHAR ( 15 ) ,
	designation VARCHAR ( 50 ) ,
	email VARCHAR ( 255 ) ,
	date_of_join DATE
);

CREATE TABLE IF NOT EXISTS public.user_details
(
    	user_id serial primary key,
    	firstname varchar(50) UNIQUE not null,
        lastname varchar(50),
        email varchar(50),
        mobileno varchar(50),        
        dob date
);

CREATE TABLE user_policies
    (
        policy_no serial primary key,
        user_id int,
        date_registered date,
        policy_type varchar(20),
		dateofpayment date,
        premium_amount float,
	CONSTRAINT fk_userid_policies FOREIGN KEY(user_id) REFERENCES user_details(user_id)	       
    );	

commit;

INSERT INTO public.employees(
	emp_id, name, gender, designation, email, date_of_join)
	VALUES (?, ?, ?, ?, ?, ?);

INSERT INTO public.employees(
	 name, gender, designation, email, date_of_join)
	VALUES ( 'Kumar', 'Male', 'SE', 'Kumar@gmail.com', to_date('21/5/2022', ' DD/MM/YYYY'));

INSERT INTO public.user_details(
	 firstname, lastname, email, mobileno, dob)
	VALUES ( 'Vijay', 'Konkata', 'vijay@gmail.com', '987654321', '2020-05-05');

INSERT INTO public.user_policies(
	 user_id, date_registered, policy_type, dateofpayment, premium_amount)
	VALUES ( 1, '2023-03-03', 'term policy', '2023-10-10', 1000);	

---------- Dymanic data insertion for user_policies ---------------------

INSERT INTO public.user_policies(
	 user_id, date_registered, policy_type, dateofpayment, premium_amount)
	VALUES (
		(select user_id from public.user_details where firstname='Vijay'), 
			'2000/03/03', 'pension policy', '2016-10-10', 2000);
			

    