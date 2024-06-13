import { Item, mapDirectory, processDir, processFile } from "./utils";
import config from "./config";

const main = async () => {
  const items: Item[] = [];
  const tree = await mapDirectory(config.vaultNotesPath, "./", items);
  // console.log("tree", tree);
  console.log("items", items);
  for (const item of items) {
    // if (item.type === "dir") processDir(item);
    // if (item.type === "file") processFile(item);
  }

  // await getFileData('/mnt/c/Users/juan/Documents/Obsidian/main/Bitcoin/bip32/Bip32. Child Key Derivation (CKD).md');
};

main();
