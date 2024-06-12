import { promises as fsp } from "fs";
import yaml from 'js-yaml'; 
import path from "path";
import config from './config';

const linksRegex = /\[\[(.+?)\]\]/g;
let allNotes = {};

const mapDirectory = async(dirPath: string) => {
  const result:any = {};
  // Read the directory  
  const items = await fsp.readdir(dirPath);  
  for (const item of items) {
    const key = slugify(item);
    if(!item.startsWith('.')) {
      const fullPath = path.join(dirPath, item);
      const stats = await fsp.stat(fullPath);     
      if (stats.isDirectory()) {
          // If it's a directory, recursively map it
          result[key] = await mapDirectory(fullPath);
      } else {
        if(item.endsWith('.md')) {
          // If it's a file, add it to the result
          const meta = await getMetaData(fullPath)          
          result[key] = meta;          
        }
      }
    }
  };  
  return result;
}

const getMetaData = async(fullPath: string) => {
  const noteContent = await fsp.readFile(fullPath, "utf-8");  
  if (noteContent.indexOf("---") != 0) return {};
  const frontmatterText = noteContent.split("---")[1];  
  // Parse the YAML string 
  const yamlObject = yaml.load(frontmatterText);  
  return yamlObject;
  // Convert the parsed YAML object to JSON 
  // const jsonString = JSON.stringify(yamlObject, null, 2);  
  // return jsonString;
}

const writeNote = async(note: any) => {
  if (!note) {
    console.log(note);
  }
  console.log(`Writing ${note.fileName}...`);
  const processedNote = await processNote(note);
  return fsp.writeFile(
    config.astroNotesPath + "/" + processedNote.slug + ".md",
    processedNote.content
  );
}

const processNote = async(note: any) => {
  // check for wikilinks
  const matches = note.content.match(linksRegex);
  if (matches) {
    for(const match of matches) {
      const link = match.slice(2, -2);
      const linkParts = link.split("|");
      const linkText = linkParts[1] || linkParts[0];
      const linkedNote: any = Object.values(allNotes).find((note: any) => note.vaultTitle === linkParts[0]);
      // if there is a linked note, replace with markdown link
      if (linkedNote) {
        note.content = note.content.replace(match, `[${linkText}](/${linkedNote.slug}/)`);
      } else {
        // if there is no linked note, remove wikilink
        note.content = note.content.replace(match, linkText);
      }
    }    
  }

  // replace images with file:// src with relative src
  if (config.replaceFileSystemImageSrc) {
    const fileRegex = new RegExp(`file://${config.vaultPath}`, "g");
    note.content = note.content.replace(fileRegex, "");
  }

  return note;
}

const slugify = (str: string): string => {
  str = str.replace(/^\s+|\s+$/g, ''); // trim leading/trailing white space
  str = str.toLowerCase(); // convert string to lowercase
  //str = str.replace(/[^a-z0-9 -]/g, '') // remove any non-alphanumeric characters
  str = str.replace(/\s+/g, '-') // replace spaces with hyphens
           .replace(/-+/g, '-'); // remove consecutive hyphens
  return str;
}

export { mapDirectory, getMetaData };