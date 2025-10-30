// Utility per gestire la formattazione del testo delle textarea
export const formatTextareaValue = (value) => {
  if (!value) return '';
  return value.split(';').join('\n');
};

export const normalizeTextareaValue = (value) => {
  if (!value) return '';
  return value.replace(/\n/g, ';');
};
