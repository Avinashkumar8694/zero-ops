
/**
 * Deep compares two JSON objects and returns the difference.
 * @param {any} obj1 - The first object (old version).
 * @param {any} obj2 - The second object (new version).
 * @returns {any} - The difference object, or undefined if identical.
 */
function jsonDiff(obj1, obj2) {
  // Handle identical values (primitives or same reference)
  if (obj1 === obj2) {
    return undefined;
  }

  // Handle type mismatches or nulls immediately
  if (
    obj1 === null ||
    obj2 === null ||
    typeof obj1 !== 'object' ||
    typeof obj2 !== 'object'
  ) {
    return { __old: obj1, __new: obj2 };
  }

  // Handle Arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const diff = {};
    let hasChanges = false;

    // Simple index-based comparison for arrays
    // A more complex LCS (Longest Common Subsequence) approach could be used for better array diffs
    const maxLen = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLen; i++) {
        if (i >= obj1.length) {
            // Item added
            diff[i] = { __new: obj2[i] };
            hasChanges = true;
        } else if (i >= obj2.length) {
            // Item removed
            diff[i] = { __old: obj1[i] };
            hasChanges = true;
        } else {
            // Compare items
            const itemDiff = jsonDiff(obj1[i], obj2[i]);
            if (itemDiff !== undefined) {
                diff[i] = itemDiff;
                hasChanges = true;
            }
        }
    }

    return hasChanges ? diff : undefined;
  }
  
  // Handle Array vs Object mismatch
  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
      return { __old: obj1, __new: obj2 };
  }

  // Handle Objects
  const diff = {};
  let hasChanges = false;
  const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of keys) {
    if (!(key in obj1)) {
      // Added key
      diff[key] = { __new: obj2[key] };
      hasChanges = true;
    } else if (!(key in obj2)) {
      // Deleted key
      diff[key] = { __old: obj1[key] };
      hasChanges = true;
    } else {
      // Modified key
      const nestedDiff = jsonDiff(obj1[key], obj2[key]);
      if (nestedDiff !== undefined) {
        diff[key] = nestedDiff;
        hasChanges = true;
      }
    }
  }

  return hasChanges ? diff : undefined;
}

module.exports = jsonDiff;
