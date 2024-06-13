import { promises as fsp } from "fs";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import config from "./config";

export interface Item {
  type: string;
  path: string;
  meta?: any;
  content?: any;
}

const linksRegex = /\[\[(.+?)\]\]/g;
let allNotes = {};

const mapDirectory = async (
  _path: string,
  _parent: string = "./",
  acc: Item[] = []
) => {
  const result: any = {};
  // Read the directory
  const items = await fsp.readdir(_path);
  for (const item of items) {
    const key = slugify(item);
    if (!item.startsWith(".")) {
      const fullPath = path.join(_path, item);
      const localPath = path.join(_parent, item);
      // const targetPath = path.join(dirPath, item);
      const stats = await fsp.stat(fullPath);
      if (stats.isDirectory()) {
        // If it's a directory, recursively map it
        acc.push({ path: localPath, type: "dir" });
        result[key] = await mapDirectory(fullPath, localPath, acc);
      } else {
        const ext = path.extname(fullPath);
        if (ext === ".md") {
          // If it's a file, add it to the result
          const { content, meta } = await getFileData(fullPath);
          result[key] = meta;
          acc.push({ path: localPath, type: "file", meta, content });
        }
        // TODO: Images
        if ([".png", ".jpg", ".jpeg", ".gif"].includes(ext)) {
        }
      }
    }
  }
  return result;
};

const getFileData = async (fullPath: string) => {
  const noteContent = await fsp.readFile(fullPath, "utf-8");

  let content = "";
  let meta = {};

  // Execute the regular expression to match the content
  const regex = /---\n([\s\S]*?)\n---/;
  const match = regex.exec(noteContent);

  if (match) {
    const metaString = match[1];
    meta = yaml.load(metaString); // Meta is always the first
    content = noteContent.replace(`---\n${metaString}\n---`, "");
  }
  return { content, meta };
};

const writeNote = async (note: any) => {
  if (!note) {
    console.log(note);
  }
  console.log(`Writing ${note.fileName}...`);
  const processedNote = await processNote(note);
  return fsp.writeFile(
    config.astroNotesPath + "/" + processedNote.slug + ".md",
    processedNote.content
  );
};

const processDir = async (item: Item) => {
  const targetPath = path.join(config.astroNotesPath, item.path);
  if (!fs.existsSync(targetPath)) fsp.mkdir(targetPath);
};

// TODO:
const processFile = async (item: Item) => {
  console.log(item);
};

const processNote = async (note: any) => {
  // check for wikilinks
  const matches = note.content.match(linksRegex);
  if (matches) {
    for (const match of matches) {
      const link = match.slice(2, -2);
      const linkParts = link.split("|");
      const linkText = linkParts[1] || linkParts[0];
      const linkedNote: any = Object.values(allNotes).find(
        (note: any) => note.vaultTitle === linkParts[0]
      );
      // if there is a linked note, replace with markdown link
      if (linkedNote) {
        note.content = note.content.replace(
          match,
          `[${linkText}](/${linkedNote.slug}/)`
        );
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
};

const slugify = (str: string): string => {
  str = str.replace(/^\s+|\s+$/g, ""); // trim leading/trailing white space
  str = str.toLowerCase(); // convert string to lowercase
  //str = str.replace(/[^a-z0-9 -]/g, '') // remove any non-alphanumeric characters
  str = str
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/-+/g, "-"); // remove consecutive hyphens
  return str;
};

export { mapDirectory, getFileData, processDir, processFile };
