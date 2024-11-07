# csc131voting
I recommend reading the readme.md file on a file editor, it makes it easier to understand
## To initialize NodeJS
Inside NodeJS folder:
run the following:

npm install nodejs
npm install mysql2
npm install bcryptjs
npm install jsonwebtoken
npm install dotenv
npm install cors
npm install express

## To initalize the database
install mysql from their website

Open MySQL Workbench
Go to the Menu
Select Server > Data Import.
Under Import Options, choose Import from Self-Contained File.
Choose the dump file
Start the Import Process
Click Start Import at the bottom right

I set the admin username and pw to test. you can make it whatever you want to, just make sure to change it in the .env file.

## To start MySQL 
Press the windows key and search for services
Scroll all the way down until you see MySQL80
Right click it and click start. If it says running it means it's already on. If you want to turn it off, Right click and click stop.

## To run server
Inside NodeJS folder:
run `node index.js`

## Client
Open `index.html` in a web browser  (or get the live extension on visual studio, will be needed if you're trying to mess around with logging in with the database)