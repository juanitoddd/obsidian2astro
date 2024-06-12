import { mapDirectory, getNote } from './utils';
import config from './config';

const main = async() => {

  const files = await mapDirectory(config.vaultNotesPath);
  console.log("files", files)

  // await getMetaData('/mnt/c/Users/juan/Documents/Obsidian/main/Bitcoin/bip32/Bip32. Child Key Derivation (CKD).md');
}

main();