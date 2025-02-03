This is a collaborative programing website I made for my IB Computer Science IA.

Info:

- All files the server requires accses too such as the email template, sql data and https keys are located in the serverAssets folder
- The public folder contains all info that is sent to the client when they connect, it includes socme librarys such as highlight.js and socketio that I took from github, it also  
  conatins a folder called assets which is simply images used by the website.
- The temp folder is a folder to create temporary instances of python files and java files in to collect their output

To run:

- Install Node
  - Open terminal
  - Type "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash" and hit enter to install nvm (node version manager)
  - Type "nvm install 22" and hit ennter to install node version 22
  - Type "node -v" and hit enter to confirm installment
- Un zip folder
- Open new terminal in folder
- Type "npm i" and hit enter to install required packages
- Type "node server.js" and hit enter
- Server will auto detect private ip and run on port 3000
- Copy outputed link and enter into search bar

Sources:

- socketio.js from (c) 2014-2023 Guillermo Rauch
- highlight js from 2006-2022 Ivan Sagalaev and other contributors
- w3schools
- chatgpt for voice chat
- google ai for simple syntax questions
- stack overflow
