import { promises as fsp } from "fs";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import config from "./config";
import markdownLinkExtractor from "markdown-link-extractor";

export interface Item {
  title: string;
  slug: string;
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
        acc.push({ title:item, slug: key, path: localPath, type: "dir" });
        result[key] = await mapDirectory(fullPath, localPath, acc);
      } else {
        const ext = path.extname(fullPath);
        if (ext === ".md") {
          // If it's a file, add it to the result
          const { content, meta } = await getFileData(fullPath);
          result[key] = meta;
          acc.push({ title:item, slug: key, path: localPath, type: "file", meta, content });
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

const processDir = async (item: Item) => {
  const targetPath = path.join(config.astroNotesPath, item.path);
  if (!fs.existsSync(targetPath)) await fsp.mkdir(targetPath);
};

const processFile = async (item: Item) => {
  // const links = markdownLinkExtractor(item.content);
  // links.forEach((link: any) => console.log(link));

  // TODO: Add astro markdown
  const content = `---
layout: '@/templates/BasePost.astro'
title: ${item.meta?.title || ''}
description: ${item.meta?.description || ''}
pubDate: ${item.meta?.reviewed || ''}
---
${item.content}
  `


  await fsp.writeFile(`${config.astroNotesPath}/${item.path}`, content);  
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
