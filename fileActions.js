const fs = require('fs').promises;
const { join } = require('path');
const path = require('path');


const excludeList = ['node_modules', '.vscode', 'cypress', 'filesToUpload']
const includeList = ['.js', '.txt', '.vue', '.css', '.ts', '.json', '.html']
// const {uploadFile, attachFilesToAssistant, deleteAllUploadedFiles} = require('./chatActions')

async function listFilesRecursively(directoryPath, includes = {dirs: [], extensions: []}, excludes = {dirs: [], extensions: []}) {
  let files = [];

  function shouldIncludeDir(dirname) {
    // if (includes.dirs.length > 0 && !includes.dirs.includes(dirname)) {
    //   return false;
    // }
    if (excludes.dirs.length > 0 && excludes.dirs.includes(dirname)) {
      return false;
    }
    return true;
  }

  // Helper function to check if the file should be included or excluded based on its extension
  function shouldIncludeFile(filename) {
    const extension = path.extname(filename);
    if (excludes.files.length > 0 && excludes.files.includes(filename)) {
      return false;
    }

    if (includes.extensions.length > 0 && !includes.extensions.includes(extension)) {
      return false;
    }
    if (excludes.extensions.length > 0 && excludes.extensions.includes(extension)) {
      return false;
    }
    return true;
  }

  async function recurse(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    const dirBasename = path.basename(currentPath);
  
    for (let entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (shouldIncludeDir(entry.name)) {
          await recurse(fullPath);
        }
      } else {
        if (shouldIncludeFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }}
  await recurse(directoryPath);
  return files;
}

const directoryPath = path.join(__dirname, '..');
const includes = {
  dirs: [],
  extensions: ['.js', '.txt', '.vue', '.css', '.ts', '.json', '.html']
};
const excludes = {
  dirs: ['node_modules', 'cypress', 'filesToUpload', '.vscode', '__tests__'],
  files: ['.prettierrc.json', 'env.d.ts', 'vite.config.ts', 'cypress.config.ts',
  'tsconfig.cypress-ct.json', 'HelloWorld.cy.ts', 'package-lock.json', 'postcss.config.js'],
  extensions: ['.vscode', '.md', 'app.json']
};



async function combineFiles(allFiles, extToCombine) {
  console.log('exttocombine', extToCombine)
  let combinedContent = ''
  for (f of allFiles) {
    const extension = path.extname(f);
    if (extension === extToCombine) {
      try {
        const data = await fs.readFile(f, 'utf8');
        
        combinedContent += `${frontComment(extToCombine)} The following file contents came from  the filepath of ${f}: ${rearComment(extToCombine)}
        ${data}` 
      } catch(err) {
        console.log(err)
      }
    }
  }
  const extToUse = extToCombine === '.ts' || extToCombine === '.html' ? 'txt' : extToCombine
  const newFilename = path.join(__dirname, '..', 'filesToUpload', `combined${extToUse}`)
  await fs.writeFile(newFilename, combinedContent)
  return newFilename
}


async function listFiles() {
  try {
    const allFiles = await listFilesRecursively(directoryPath, includes, excludes)
    const fileTypes = ['.css','.js', '.ts',  '.vue', '.json', '.html' ]
    const filePaths = []
    for (type of fileTypes) {
      const combinedName = await combineFiles(allFiles, type)
      filePaths.push(combinedName)
    }
    return filePaths
  } catch(err) {
    console.error('Error while listing files:', err);
  }
}

async function processFileForUpload() {
  deleteAllUploadedFiles()
  const fileList = await listFiles()
  const filesToAttach = []
  for (const file of fileList) {
    const slashSplit = file.split('/');
    const lastPart = slashSplit[slashSplit.length - 1]
    
    const newFilename = path.join(__dirname, '..', 'filesToUpload', lastPart)
    try {
      const fileData = await uploadFile(newFilename)
     if (fileData?.status === 'processed') {
       filesToAttach.push(fileData.id)
      } else {
        console.log('file problem', file)
      }

    } catch(err) {
      console.error('Error copying file:', file,  err);
    }
  }
  console.log('Would attach these', filesToAttach)
  attachFilesToAssistant(filesToAttach.slice(0,19))
}


function frontComment(extension) {
  switch (extension) {
    case '.css':
      return '/*'
    case '.js':
    case '.ts':
      return '// '
    case '.html':
    case '.vue':
      return ' <!--'
    default:
      return ''
  }

  return 
}

function rearComment(extension) {
switch (extension) {
    case '.css':
      return '*/'
    case '.js':
    case '.ts':
      return ''
    case '.html':
    case '.vue':
      return ' -->'
    default:
      return ''
  }
}


// listFiles()
processFileForUpload()