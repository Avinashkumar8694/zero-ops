export function objectFromText(text) {
    const output = {};
    String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
            const index = line.indexOf(':');
            if (index > 0) output[line.slice(0, index).trim()] = line.slice(index + 1).trim();
        });
    return output;
}

export function textFromObject(value) {
    return Object.entries(value || {}).map(([key, val]) => `${key}: ${val}`).join('\n');
}

export function prettyJson(value) {
    return JSON.stringify(value ?? {}, null, 2);
}

export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
        reader.readAsDataURL(file);
    });
}
