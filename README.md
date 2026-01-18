# CodeSync

A collaborative programming website built for IB Computer Science IA. CodeSync enables real-time code collaboration with syntax highlighting, file management, and live editing capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Technologies](#technologies)
- [Sources & Credits](#sources--credits)
- [Future Plans](#future-plans)

## Overview

CodeSync is a real-time collaborative coding platform that allows multiple users to work together on code files simultaneously. The platform supports multiple programming languages with syntax highlighting, file execution, and live synchronization of changes.

## Project Structure

```
codeSync/
├── public/              # Client-side files and assets
│   ├── assets/         # Images and static resources
│   ├── highlight/      # Syntax highlighting libraries
│   ├── betterAlerts/   # Alert system components
│   └── socket/         # Socket.io client library
├── serverAssets/       # Server-side resources
│   ├── emailTemplate.html
│   ├── users.json      # User data storage
│   └── logs/           # Application logs
├── temp/               # Temporary execution environment for Python/Java files
└── server.js           # Main server file
```

### Directory Descriptions

- **`public/`**: Contains all client-facing files including HTML, CSS, JavaScript, and third-party libraries (highlight.js, Socket.io)
- **`serverAssets/`**: Server-only files including email templates, user data (JSON), HTTPS keys, and application logs
- **`temp/`**: Temporary directory used to create and execute Python and Java files to capture their output
- **`server.js`**: Main Node.js server application

## Installation

### Prerequisites

- **Node.js** (version 22 or higher)

### Step 1: Install Node.js

If you don't have Node.js installed, follow these steps:

1. Open your terminal
2. Install nvm (Node Version Manager):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   ```
3. Install Node.js version 22:
   ```bash
   nvm install 22
   ```
4. Verify installation:
   ```bash
   node -v
   ```

### Step 2: Setup Project

1. Extract/unzip the project folder (if compressed)
2. Open a terminal in the project directory
3. Install required dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the server:
   ```bash
   node server.js
   ```

2. The server will automatically detect your private IP address and run on port 3000

3. Copy the outputted URL from the terminal and paste it into your browser's address bar

4. You're ready to start collaborating!

## Technologies

- **Backend**: Node.js
- **Real-time Communication**: Socket.io
- **Syntax Highlighting**: highlight.js
- **Languages Supported**: Python, Java, JavaScript, HTML, CSS, and more

## Sources & Credits

- **Socket.io**: (c) 2014-2023 Guillermo Rauch
- **highlight.js**: 2006-2022 Ivan Sagalaev and other contributors
- **Documentation**: W3Schools
- **Development Assistance**: ChatGPT (voice chat features), Google AI (syntax questions), Stack Overflow

## Future Plans

- [ ] Fix box sizing in code space
- [ ] Add syntax highlighting for HTML/CSS/JS
- [ ] Migrate user data storage from JSON to SQL database
- [ ] Implement file storage system allowing users to save a limited amount of files on the server for future sessions

---

*Built as part of IB Computer Science Internal Assessment*
