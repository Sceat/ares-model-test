// Get the module imports first
const model_files = import.meta.glob('../assets/models/**/*.glb', {
  eager: true,
  as: 'url',
});

const models = {
  characters: {},
  equipments: {},
};

Object.keys(model_files).forEach(path => {
  const filename = path.split('/').pop().replace('.glb', '');

  // Get the direct URL from the import
  const directUrl = model_files[path];

  if (
    (filename.includes('primemachin') ||
      filename.includes('anima') ||
      path.includes('/characters/')) &&
    !filename.includes('_hair')
  ) {
    models.characters[filename] = directUrl;
  } else if (path.includes('/equipment/') || filename.includes('_hair')) {
    models.equipments[filename] = directUrl;
  } else {
    models.characters[filename] = directUrl;
  }
});

export { models };
