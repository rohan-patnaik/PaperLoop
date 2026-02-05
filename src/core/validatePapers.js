const isValidUrl = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const createError = (code, message, details = null) => ({
  code,
  message,
  details
});

export const validatePapers = (papers, expectedCount = 30) => {
  const result = {
    ok: true,
    errors: [],
    warnings: [],
    validPapers: []
  };

  if (!Array.isArray(papers)) {
    result.errors.push(
      createError('invalid_type', 'Reading list data must be an array.')
    );
    result.ok = false;
    return result;
  }

  if (papers.length !== expectedCount) {
    result.errors.push(
      createError(
        'length_mismatch',
        `Expected ${expectedCount} papers, found ${papers.length}.`,
        { expected: expectedCount, actual: papers.length }
      )
    );
  }

  const seenIds = new Set();
  const duplicateIds = new Set();

  papers.forEach((paper, index) => {
    if (!paper || typeof paper !== 'object') {
      result.errors.push(
        createError('invalid_item', `Paper at index ${index} is invalid.`, {
          index
        })
      );
      return;
    }

    const { id, title, url } = paper;
    const itemErrors = [];

    if (!Number.isInteger(id)) {
      itemErrors.push(
        createError('invalid_id', `Paper id at index ${index} is invalid.`, {
          id,
          index
        })
      );
    } else {
      if (id < 1 || id > expectedCount) {
        itemErrors.push(
          createError('id_out_of_range', `Paper id ${id} is out of range.`, {
            id,
            index
          })
        );
      }
      if (seenIds.has(id)) {
        duplicateIds.add(id);
        itemErrors.push(
          createError('duplicate_id', `Paper id ${id} is duplicated.`, {
            id,
            index
          })
        );
      }
      seenIds.add(id);
    }

    if (typeof title !== 'string' || title.trim().length === 0) {
      itemErrors.push(
        createError('invalid_title', `Paper title is missing for id ${id}.`, {
          id,
          index
        })
      );
    }

    if (!isValidUrl(url)) {
      itemErrors.push(
        createError('invalid_url', `Paper url is invalid for id ${id}.`, {
          id,
          index,
          url
        })
      );
    }

    if (itemErrors.length === 0 && !duplicateIds.has(id)) {
      result.validPapers.push(paper);
    } else {
      result.errors.push(...itemErrors);
    }
  });

  const missing = [];
  for (let i = 1; i <= expectedCount; i += 1) {
    if (!seenIds.has(i)) {
      missing.push(i);
    }
  }
  if (missing.length > 0) {
    result.errors.push(
      createError('missing_ids', 'Some paper ids are missing.', {
        missing
      })
    );
  }

  result.ok = result.errors.length === 0;
  return result;
};
